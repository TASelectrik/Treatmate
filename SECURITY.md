# 🔐 Security Policy

## Important Security Notes

This repository contains code for educational purposes. The following security measures **MUST** be implemented before production use:

### ⚠️ Known Security Considerations

1. **Credentials Management**
   - All sensitive credentials MUST be stored in environment variables
   - Never commit `.env` files to version control
   - Use separate credentials for development, staging, and production

2. **Hardcoded Credentials**
   - Some example files may contain placeholder credentials
   - Replace all hardcoded values with environment variables
   - Files that need attention:
     - `frontend/script.js` - MQTT broker credentials
     - `MQTT_Secure_INO_V01 demo.ino` - WiFi and MQTT credentials

3. **API Security**
   - Implement rate limiting on all endpoints
   - Add authentication middleware
   - Use HTTPS for all production deployments
   - Validate and sanitize all user inputs

4. **MQTT Security**
   - Use TLS/SSL for all MQTT connections
   - Implement certificate-based authentication
   - Use unique client IDs for each device
   - Regularly rotate MQTT credentials

5. **Database Security**
   - Use connection pooling
   - Implement prepared statements
   - Enable SSL connections
   - Regular backup schedules

6. **Payment Security**
   - Verify Razorpay webhook signatures
   - Implement idempotency for payment processing
   - Log all payment transactions
   - Use test mode during development

## Reporting a Vulnerability

If you discover a security vulnerability, please:

1. **DO NOT** open a public issue
2. Email the maintainer directly
3. Provide detailed information about the vulnerability
4. Allow reasonable time for a fix before public disclosure

## Security Best Practices for Users

### For Development:
- Use `.env.example` as a template
- Never share your `.env` file
- Use test/sandbox credentials

### For Production:
- Enable all security features
- Use strong, unique passwords
- Implement proper authentication
- Regular security audits
- Monitor logs for suspicious activity
- Keep dependencies updated

## Credentials That Must Be Protected

- Database connection strings and passwords
- MQTT broker credentials
- Razorpay API keys and webhook secrets
- WiFi passwords
- SSL/TLS certificates
- Session secrets
- API tokens

## Recommended Security Enhancements

1. **Add authentication layer**
   ```javascript
   // Example: JWT-based authentication
   const jwt = require('jsonwebtoken');
   ```

2. **Implement rate limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');
   ```

3. **Add CORS properly**
   ```javascript
   // Configure CORS for specific domains only
   app.use(cors({ origin: 'https://yourdomain.com' }));
   ```

4. **Input validation**
   ```javascript
   // Use express-validator or joi
   const { body, validationResult } = require('express-validator');
   ```

## License

This security policy is part of the project documentation.

---

**Last Updated:** February 2026
