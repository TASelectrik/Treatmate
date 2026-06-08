// ⚠️ CONFIGURATION TEMPLATE
// Copy this file and update with your actual credentials
// DO NOT commit files with real credentials to GitHub

document.addEventListener('DOMContentLoaded', () => {
    // --- MQTT Configuration ---
    // TODO: Replace with your MQTT broker details
    const mqttHost = "your-mqtt-broker.hivemq.cloud";  // Replace with your broker
    const mqttPort = 8884; // WebSocket Secure
    const mqttTopic = "esp32/control";
    const clientId = "client-" + Math.random().toString(16).substr(2, 8);

    // TODO: Replace with your MQTT credentials
    // IMPORTANT: In production, fetch these from a secure backend endpoint
    const mqttUser = "YOUR_MQTT_USERNAME";
    const mqttPass = "YOUR_MQTT_PASSWORD";

    let client = null;
    let isConnected = false;
    let deviceHeartbeatTimer = null;

    // Backend API URL
    // TODO: Update with your deployed backend URL
    const BACKEND_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3000'
      : 'https://your-backend-url.vercel.app'; // Replace with your URL
    
    let currentOrderId = null;
    let paymentPollInterval = null;

    // Rest of your code...
});
