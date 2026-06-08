const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const dotenv = require("dotenv");
const cors = require("cors");
const mqtt = require("mqtt");
const https = require("https");
const { Pool } = require("pg");
const path = require("path");

dotenv.config();
const app = express();

/* ===== MQTT Setup ===== */
const mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtts://your-broker.hivemq.cloud:8883', {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  rejectUnauthorized: false
});

mqttClient.on('connect', () => {
  console.log('✅ Backend connected to MQTT broker');
  mqttClient.subscribe('esp32/dispense/confirm');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT Connection Error:', err.message);
});

/* ===== Quick MQTT Publish (Vercel-compatible) ===== */
function publishToESP32(topic, message) {
  return new Promise((resolve, reject) => {
    const client = mqtt.connect(process.env.MQTT_BROKER || 'mqtts://your-broker.hivemq.cloud:8883', {
      username: process.env.MQTT_USER,
      password: process.env.MQTT_PASS,
      rejectUnauthorized: false,
      connectTimeout: 10000
    });

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error('MQTT connection timeout'));
    }, 15000);

    client.on('connect', () => {
      console.log('✅ Quick MQTT connected for publish');
      client.publish(topic, message, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        if (err) {
          console.error('❌ MQTT Publish failed:', err.message);
          client.end(true);
          reject(err);
        } else {
          console.log(`✅ MQTT Published: ${message} to ${topic}`);
          client.end();
          resolve();
        }
      });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ MQTT Connection Error:', err.message);
      client.end(true);
      reject(err);
    });
  });
}

/* ===== CORS ===== */
app.use(cors({ origin: "*" }));

/* ===== Razorpay Webhook Secret ===== */
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_WEBHOOK_SECRET) {
  console.warn('⚠️  RAZORPAY_WEBHOOK_SECRET not set in environment variables');
}

/* ===== Postgres Connection ===== */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize DB
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        payment_id TEXT UNIQUE NOT NULL,
        amount DECIMAL,
        grams INTEGER,
        currency TEXT,
        status TEXT,
        method TEXT,
        email TEXT,
        contact TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add grams column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS grams INTEGER;
    `);
    console.log("✅ Neon DB Connected & Table Verified");
  } catch (err) {
    console.log(`❌ DB Init Error: ${err.message}`);
  }
};

initDB();

/* ===== SSE Clients (for payments) ===== */
let clients = [];

/* ===== Conditional Body Parser ===== */
app.use((req, res, next) => {
  if (req.originalUrl === "/webhook") {
    bodyParser.raw({ type: "application/json" })(req, res, next);
  } else {
    bodyParser.json()(req, res, next);
  }
});

/* ===== Razorpay Webhook ===== */
app.post("/webhook", async (req, res) => {
  console.log("\n========== WEBHOOK RECEIVED ==========");
  console.log("📥 Hit received");
  console.log(`Headers: ${JSON.stringify(req.headers)}`);

  // Try to capture raw body for logging
  const rawBody = req.body.toString();
  console.log(`Body Length: ${rawBody.length}`);

  // Debug: Show which secret is being used (masked)
  const maskedSecret = RAZORPAY_WEBHOOK_SECRET.slice(0, 2) + "****" + RAZORPAY_WEBHOOK_SECRET.slice(-2);
  console.log(`🔐 Using Secret: ${maskedSecret}`);

  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    console.log("❌ Missing x-razorpay-signature header");
    return res.status(400).send("Missing signature");
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex");

  if (signature !== expectedSignature) {
    console.log(`❌ Signature Mismatch. Received: ${signature}, Expected: ${expectedSignature}`);
    return res.status(400).send("Invalid signature");
  }
  console.log("✅ Signature verified");

  try {
    console.log("⚙️ Parsing request body...");
    const payload = JSON.parse(req.body.toString());
    console.log(`📦 Event Type: ${payload.event}`);

    const payment = payload.payload?.payment?.entity;
    console.log(`🔍 Payment Object: ${payment ? 'Present' : 'Missing'}`);
    if (payment) {
      console.log(`   Payment ID: ${payment.id}`);
      console.log(`   Payment Status: ${payment.status}`);
      // Dump full data for debugging
      console.log(`📄 FULL PAYMENT DATA:\n${JSON.stringify(payment, null, 2)}`);
    }

    if (payment && (payload.event === "payment.captured" || payload.event === "qr_code.credited" || payment.status === "captured")) {
      console.log(`✅ Condition Met: Payment captured`);
      console.log(`✅ Payment captured: ${payment.id}`);

      // Calculate grams (₹1 = 1 gram)
      const amountInRupees = payment.amount / 100;
      const grams = Math.round(amountInRupees); // ₹1 = 1g, ₹10 = 10g

      // Check if payment already processed
      const checkQuery = `SELECT id, grams FROM transactions WHERE payment_id = $1`;
      const checkResult = await pool.query(checkQuery, [payment.id]);

      let existingGrams = grams;
      
      if (checkResult.rowCount === 0) {
        // Insert new payment
        const query = `
          INSERT INTO transactions (payment_id, amount, grams, currency, status, method, email, contact)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        const values = [
          payment.id,
          amountInRupees,
          grams,
          payment.currency,
          payment.status,
          payment.method,
          payment.email,
          payment.contact
        ];

        const result = await pool.query(query, values);
        console.log("✅ New transaction saved to Neon DB");
      } else {
        existingGrams = checkResult.rows[0].grams;
        console.log(`⚠️ Payment already exists (ID: ${checkResult.rows[0].id}), using existing grams: ${existingGrams}g`);
      }

      // --- TRIGGER ESP32 VIA MQTT (Quick connect/publish/disconnect) ---
      try {
        await publishToESP32('esp32/control', `DISPENSE:${existingGrams}`);
        console.log(`🚀 ESP32 Triggered Successfully: DISPENSE:${existingGrams}g`);
      } catch (mqttError) {
        console.error('❌ Failed to trigger ESP32:', mqttError.message);
        // Don't fail the webhook - payment was successful
      }

      // Notify SSE clients
      const latestPayment = {
        amount: amountInRupees,
        currency: payment.currency,
        status: payment.status,
        paymentId: payment.id,
        time: new Date().toISOString()
      };

      clients.forEach(client => {
        client.write(`data: ${JSON.stringify(latestPayment)}\n\n`);
      });
      console.log(`📡 Notified ${clients.length} payment clients`);

    } else {
      console.log(`ℹ️ Event ignored: ${payload.event} (Status: ${payment?.status})`);
    }
  } catch (err) {
    console.log(`❌ Webhook processing error: ${err.message}`);
  }

  res.status(200).send("Webhook received");
});

/* ===== SSE Endpoint (Payments) ===== */
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);
  console.log("📡 Payment SSE client connected");

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
    console.log("❌ Payment SSE client disconnected");
  });
});

/* ===== APIs ===== */
app.get("/latest-payment", async (req, res) => {
  console.log("🔎 API Hit: /latest-payment");
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1');
    const latest = result.rows[0];

    if (latest) {
      console.log(`   Returning latest: ${latest.payment_id}`);
      res.json({
        amount: latest.amount,
        currency: latest.currency,
        status: latest.status,
        paymentId: latest.payment_id,
        time: latest.created_at
      });
    } else {
      console.log("   No latest payment found");
      res.json({ amount: 0, status: "none" });
    }
  } catch (err) {
    console.log(`❌ API Error: ${err.message}`);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.get("/transactions", async (req, res) => {
  console.log("🔎 API Hit: /transactions");
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY created_at DESC');
    console.log(`   Returning ${result.rowCount} transactions`);
    res.json(result.rows);
  } catch (err) {
    console.log(`❌ API Error: ${err.message}`);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});

app.get("/", (_, res) => {
  res.send("Razorpay webhook server running");
});

/* ===== Local Server ===== */
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('❌ Server failed to start:', err);
  });
}

module.exports = app;
