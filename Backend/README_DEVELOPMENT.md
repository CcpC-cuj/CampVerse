# CampVerse Backend - Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 5.0
- Redis >= 6.0
- Git

### Setup Development Environment

1. **Clone and checkout development branch**
   ```bash
   git clone https://github.com/CcpC-cuj/CampVerse.git
   cd CampVerse/Backend
   git checkout development/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment files
   cp .env.example .env
   cp env.test.example .env.test
   
   # Edit .env with your development values
   nano .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Development Commands

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Check linting without warnings
npm run lint:check

# Format code
npm run format

# Check code formatting
npm run format:check
```

### Security
```bash
# Audit dependencies
npm run security:audit

# Fix security issues
npm run security:fix
```

### Database
```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset test database
npm run db:reset
```

### Docker
```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Start with docker-compose
npm run docker:compose

# Stop docker-compose
npm run docker:compose:down
```

## 🏗️ Project Structure

```
Backend/
├── config/                 # Configuration files
│   ├── environment.js     # Environment configuration
│   └── swagger.js         # API documentation
├── Controller/            # Business logic controllers
├── Middleware/            # Express middleware
├── Models/                # Database models
├── Routes/                # API route definitions
├── Services/              # Business services
├── Utils/                 # Utility functions
├── __tests__/             # Test files
├── .env.example           # Environment variables template
├── env.test.example       # Test environment template
└── README_DEVELOPMENT.md  # This file
```

## 🔒 Security Features

### Password Policy
- Minimum 8 characters
- Must include uppercase, lowercase, numbers, and special characters
- Pattern: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/`

### Rate Limiting
- **Authentication endpoints**: 10 requests per 15 minutes
- **API endpoints**: 100 requests per 15 minutes
- **Sensitive operations**: 5 requests per 15 minutes

### CORS Configuration
- Environment-specific allowed origins
- Secure headers configuration
- Preflight caching (24 hours)

### Input Validation
- Joi schema validation
- Input sanitization
- SQL injection prevention
- XSS protection

## 🧪 Testing Strategy

### Test Environment
- Separate test database
- Mock external services
- Environment-specific configuration
- Coverage reporting

### Test Types
- **Unit tests**: Individual functions and modules
- **Integration tests**: API endpoints and database operations
- **Performance tests**: Load testing and memory management
- **Security tests**: Authentication and authorization

### Running Tests
```bash
# Run specific test file
npm test -- userController.test.js

# Run tests with specific pattern
npm test -- --testNamePattern="User registration"

# Run tests with verbose output
npm test -- --verbose
```

## 📊 Monitoring & Health Checks

### Health Endpoint
- **URL**: `/health`
- **Response**: Comprehensive system status
- **Services**: MongoDB, Redis, Memory usage
- **Status**: OK, DEGRADED, ERROR

### Logging
- **Levels**: error, warn, info, debug
- **Format**: JSON in production, simple in development
- **Correlation IDs**: Request tracking
- **File logging**: Production only

### Memory Management
- Automatic cleanup of global objects
- Memory usage monitoring
- Garbage collection optimization
- Leak prevention

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Staging
```bash
npm run start:staging
```

### Production
```bash
npm start
```

### Docker
```bash
# Build and run
npm run docker:build
npm run docker:run

# Or use docker-compose
npm run docker:compose
```

## 🔍 Debugging

### Environment Variables
```bash
# Check current environment
echo $NODE_ENV

# List all environment variables
npm run env:list
```

### Logs
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log
```

### Database
```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/campverse"

# Connect to Redis
redis-cli
```

## 📝 Code Standards

### Naming Conventions
- **Variables**: camelCase
- **Functions**: camelCase
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: camelCase.js

### Error Handling
- Use custom error classes
- Include correlation IDs
- Log errors with context
- Return appropriate HTTP status codes

### Async/Await
- Use async/await instead of callbacks
- Handle errors with try/catch
- Use Promise.all for parallel operations

## 🚨 Common Issues & Solutions

### MongoDB Connection Issues
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection string
echo $MONGO_URI
```

### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis

# Restart Redis
sudo systemctl restart redis

# Check Redis connection
redis-cli ping
```

### Port Already in Use
```bash
# Find process using port
lsof -i :5001

# Kill process
kill -9 <PID>

# Or use different port
PORT=5002 npm run dev
```

## 🤝 Contributing

### Before Committing
```bash
# Run pre-commit checks
npm run precommit

# Or run individually
npm run lint:check
npm run format:check
npm run test:ci
```

### Code Review Checklist
- [ ] Tests pass
- [ ] Linting passes
- [ ] Code is formatted
- [ ] Security audit passes
- [ ] Documentation updated
- [ ] Environment variables documented

### Pull Request Process
1. Create feature branch from `development/backend`
2. Make changes and test thoroughly
3. Run all quality checks
4. Create pull request
5. Request review from team
6. Merge after approval

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [JWT.io](https://jwt.io/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/CcpC-cuj/CampVerse/issues)
- **Documentation**: [Project Wiki](https://github.com/CcpC-cuj/CampVerse/wiki)
- **Team**: Contact development team via Slack/Teams

---

**Remember**: Always work in the `development/backend` branch to avoid affecting production!
