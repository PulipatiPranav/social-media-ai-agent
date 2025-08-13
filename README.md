# Social Media Creative Manager - Backend API

A Node.js/Express.js backend API for the Social Media Creative Manager AI Agent that helps influencers and content creators generate viral content ideas, analyze their personal style, track trends, and optimize their social media presence.

## Features

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **AI Integration**: OpenAI and Replicate API integration for content generation
- **Social Media APIs**: Integration with Instagram, TikTok, and YouTube APIs
- **Analytics**: Performance tracking and AI-powered coaching
- **Content Management**: Scheduling and calendar management
- **Security**: Rate limiting, CORS, helmet security headers
- **Logging**: Winston-based logging system
- **Error Handling**: Comprehensive error handling and validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Environment**: dotenv

## Project Structure

```
src/
├── config/
│   ├── database.js      # MongoDB connection configuration
│   └── logger.js        # Winston logger configuration
├── middleware/
│   ├── security.js      # Security middleware (helmet, cors, rate limiting)
│   ├── errorHandler.js  # Global error handling
│   └── requestLogger.js # HTTP request logging
├── routes/
│   └── index.js         # Main API routes
├── app.js               # Express app configuration
└── server.js            # Server startup
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Set your MongoDB Atlas connection string
   - Generate secure JWT secrets
   - Configure other environment variables as needed

### Running the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on the port specified in your `.env` file (default: 3000).

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Endpoints

### Health Check
- `GET /api/health` - Health check endpoint
- `GET /api` - API information and available endpoints

### Future Endpoints (to be implemented)
- `/api/auth` - Authentication endpoints
- `/api/ai` - AI processing endpoints
- `/api/social` - Social media integration endpoints
- `/api/analytics` - Analytics and performance endpoints
- `/api/schedule` - Content scheduling endpoints

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment mode | development |
| `MONGODB_URI` | MongoDB connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Required |
| `JWT_EXPIRE` | JWT token expiration | 15m |
| `JWT_REFRESH_EXPIRE` | Refresh token expiration | 7d |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |
| `LOG_LEVEL` | Logging level | info |

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Request rate limiting
- **Input Validation**: Request validation with Joi
- **Error Handling**: Secure error responses
- **Logging**: Request and error logging

## Error Handling

The API uses a comprehensive error handling system:

- **Development**: Detailed error information including stack traces
- **Production**: Sanitized error responses without sensitive information
- **Custom Error Classes**: Operational vs programming errors
- **Global Error Handler**: Centralized error processing

## Logging

Winston-based logging system with:
- **Multiple log levels**: error, warn, info, http, debug
- **File logging**: Separate error and combined logs
- **Console logging**: Colored output for development
- **Request logging**: HTTP request/response logging

## Contributing

1. Follow the existing code structure and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Follow security best practices

## License

MIT