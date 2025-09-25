# Environment Setup Guide

## 🔧 Quick Setup

### For Local Development
```bash
cd Backend
npm run setup:env
```

This will automatically create a `.env` file with secure defaults for development.

### For CI/CD
The GitHub Actions workflow automatically creates the necessary environment files during testing.

## 📋 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your-very-secure-secret-key-here` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/campverse` |
| `EMAIL_USER` | Email service username | `your-email@example.com` |
| `EMAIL_PASSWORD` | Email service password | `your-app-password` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5001` |
| `FRONTEND_URL` | Frontend URL | `http://localhost:3000` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `ML_API_KEY` | ML service API key | - |
| `STORAGE_PROVIDER` | Storage provider | `firebase` |

## 🚀 Setup Instructions

### 1. Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campverse
   ```

2. **Install dependencies**
   ```bash
   cd Backend
   npm install
   ```

3. **Set up environment**
   ```bash
   npm run setup:env
   ```

4. **Configure your environment**
   - Edit `Backend/.env` with your actual values
   - Set up MongoDB and Redis
   - Configure email service

5. **Start development server**
   ```bash
   npm run dev
   ```

### 2. Production Deployment

1. **Set environment variables** in your deployment platform:
   - Render: Use the dashboard environment variables
   - Heroku: Use `heroku config:set`
   - Docker: Use environment files or docker-compose

2. **Required production variables**:
   ```bash
   NODE_ENV=production
   JWT_SECRET=your-production-jwt-secret-32-chars-minimum
   MONGO_URI=your-production-mongodb-uri
   EMAIL_USER=your-production-email
   EMAIL_PASSWORD=your-production-email-password
   ```

### 3. CI/CD Pipeline

The GitHub Actions workflow automatically handles environment setup:

- **Test Environment**: Automatically created with test values
- **Security Audit**: Runs with secure test credentials
- **Build Process**: Uses environment variables from secrets

## 🔒 Security Best Practices

### Environment Variable Security

1. **Never commit `.env` files** - They're in `.gitignore`
2. **Use strong JWT secrets** - Minimum 32 characters
3. **Rotate secrets regularly** - Especially in production
4. **Use different secrets** for different environments

### Production Security

1. **Use environment-specific secrets**
2. **Enable HTTPS** in production
3. **Use secure database connections**
4. **Monitor for security issues**

## 🛠️ Troubleshooting

### Common Issues

1. **Missing environment variables**
   ```bash
   npm run setup:env
   ```

2. **JWT secret too short**
   - Ensure JWT_SECRET is at least 32 characters
   - Use the setup script to generate a secure secret

3. **Database connection issues**
   - Check MONGO_URI format
   - Ensure MongoDB is running
   - Verify network connectivity

4. **Email service issues**
   - Check EMAIL_USER and EMAIL_PASSWORD
   - Verify email service credentials
   - Test email service connectivity

### Debug Commands

```bash
# Check environment variables
npm run setup:env

# Run security audit
npm run security:full-audit

# Test database connection
npm run health:check

# Check linting
npm run lint:check
```

## 📁 File Structure

```
Backend/
├── .env                    # Local environment (gitignored)
├── .env.example           # Environment template
├── .env.test              # Test environment
├── scripts/
│   ├── setup-env.js       # Environment setup script
│   └── security-audit.js  # Security audit script
└── config/
    └── security.js        # Security configuration
```

## 🔄 Environment Workflow

### Development
1. Run `npm run setup:env`
2. Edit `.env` with your values
3. Start development server

### Testing
1. CI/CD automatically creates test environment
2. Tests run with secure test credentials
3. Security audit runs automatically

### Production
1. Set environment variables in deployment platform
2. Deploy with secure production values
3. Monitor for security issues

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section
2. Run the security audit: `npm run security:full-audit`
3. Verify environment variables: `npm run setup:env`
4. Check the logs for specific error messages

---

**✅ Your environment is now secure and ready for development!**