# 🐾 TREATMATE

TREATMATE is an IoT-enabled smart dog treat vending machine that combines digital payments, cloud connectivity, and automated dispensing. Users can purchase treats through a web interface, and upon successful payment, the system automatically dispenses the selected quantity using an ESP32-based controller.

## Features

- Digital payment integration using Razorpay
- Real-time MQTT communication with ESP32
- Automatic treat dispensing based on payment amount
- Transaction logging with PostgreSQL
- Admin dashboard for monitoring sales and device status
- Cloud deployment using Vercel

## Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript
- Razorpay Checkout

**Backend**
- Node.js
- Express.js
- MQTT.js
- PostgreSQL

**Hardware**
- ESP32
- Dispensing Mechanism
- Load Cell (Optional)

**Cloud**
- Vercel
- Neon PostgreSQL
- HiveMQ MQTT Broker

## System Flow

```text
User
  ↓
Website
  ↓
Razorpay Payment
  ↓
Webhook Verification
  ↓
Backend Server
  ↓
MQTT Command
  ↓
ESP32
  ↓
Treat Dispensing
```

## Project Structure

```text
├── api/
│   └── index.js
├── index.html
├── admin-dashboard.html
├── style.css
├── hero-image.png
├── package.json
├── vercel.json
└── README.md
```

## Installation

```bash
git clone https://github.com/yourusername/treatmate.git
cd treatmate
npm install
npm start
```

Create a `.env` file:

```env
DATABASE_URL=
MQTT_BROKER=
MQTT_USER=
MQTT_PASS=
RAZORPAY_WEBHOOK_SECRET=
```

## Key APIs

```http
GET  /                 # Health Check
GET  /latest-payment   # Latest Transaction
GET  /transactions     # Transaction History
POST /webhook          # Razorpay Webhook
```

## Future Improvements

- Mobile application
- AI-based feeding recommendations
- Multiple treat options
- Smart inventory tracking
- Scheduled feeding support

## License

MIT License
