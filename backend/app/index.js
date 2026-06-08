const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

/* ===== Razorpay Webhook Secret ===== */
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_WEBHOOK_SECRET) {
  console.warn('⚠️  RAZORPAY_WEBHOOK_SECRET not set in environment variables');
}

/* ===== Store latest payment ===== */
let latestPayment = {
  amount: 0,
  currency: "INR",
  status: "none",
  paymentId: "",
  time: ""
};

app.use(bodyParser.json());

/* ===== Razorpay Webhook Endpoint ===== */
app.post("/webhook", (req, res) => {
  const razorpaySignature = req.headers["x-razorpay-signature"];
  const body = JSON.stringify(req.body);

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (razorpaySignature !== expectedSignature) {
    console.log("❌ Invalid Razorpay signature");
    return res.status(400).send("Invalid signature");
  }

  console.log("✅ Razorpay webhook verified");

  try {
    const payment = req.body.payload?.payment?.entity;

    if (payment && payment.status === "captured") {
      latestPayment = {
        amount: payment.amount / 100, // paise → INR
        currency: payment.currency,
        status: payment.status,
        paymentId: payment.id,
        time: new Date().toISOString()
      };

      console.log("💰 Payment received:");
      console.log(latestPayment);
    }

  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  res.status(200).send("Webhook received");
});

/* ===== API for Website ===== */
app.get("/latest-payment", (req, res) => {
  res.json(latestPayment);
});

/* ===== Health Check ===== */
app.get("/", (_, res) => {
  res.send("Razorpay webhook server running");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  });
module.exports = app;