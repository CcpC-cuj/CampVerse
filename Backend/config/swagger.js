/**
 * Swagger/OpenAPI Configuration
 * Comprehensive API documentation setup
 */

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampVerse API',
      version: '1.0.0',
      description: 'Comprehensive API for CampVerse - Event Management Platform',
      contact: {
        name: 'CampVerse Team',
        email: '',
        url: ''
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://campverse-backend.onrender.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john@cuj.ac.in' },
            phone: { type: 'string', example: '1234567890' },
            roles: { type: 'array', items: { type: 'string' }, example: ['student'] },
            isVerified: { type: 'boolean', example: true },
            canHost: { type: 'boolean', example: false }
          }
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            title: { type: 'string', example: 'Tech Workshop' },
            description: { type: 'string', example: 'Learn about latest technologies' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            location: { type: 'string', example: 'Main Campus' },
            maxParticipants: { type: 'number', example: 100 }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Error message' },
            correlationId: { type: 'string', example: '1234567890-abc123' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints'
      },
      {
        name: 'Users',
        description: 'User management and profile operations'
      },
      {
        name: 'Events',
        description: 'Event creation, management, and participation'
      },
      {
        name: 'Institutions',
        description: 'Educational institution management'
      },
      {
        name: 'Certificates',
        description: 'Certificate generation and management'
      },
      {
        name: 'Recommendations',
        description: 'Event and content recommendations'
      }
    ]
  },
  apis: [
    './Routes/*.js',
    './Controller/*.js',
    './Models/*.js'
  ],
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #9b5de5; }
    .swagger-ui .scheme-container { background: #f8f9fa; }
  `,
  customSiteTitle: 'CampVerse API Documentation',
  customfavIcon: '/favicon.ico'
};

module.exports = swaggerOptions;
