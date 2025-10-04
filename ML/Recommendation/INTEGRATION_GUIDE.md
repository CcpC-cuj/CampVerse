# ML Recommendation Microservice Integration Guide

## Overview

This document provides comprehensive guidance for integrating the ML-based event recommendation microservice with the CampVerse backend.

## Architecture

The recommendation system is deployed as a separate microservice that:
- Runs independently in its own Docker container
- Communicates with the backend via REST API
- Provides personalized event recommendations based on user profiles
- Has fallback mechanisms to ensure system stability

## Components

### 1. ML Recommendation Service (Python/Flask)
- **Location**: `ML/Recommendation/`
- **Port**: 5002
- **Main File**: `server.py`
- **Endpoints**:
  - `POST /recommend` - Generate event recommendations
  - `GET /health` - Health check endpoint

### 2. Backend Integration (Node.js/Express)
- **Location**: `Backend/Controller/recommendation.js`
- **Routes**: `Backend/Routes/recommendationRoutes.js`
- **Endpoints**:
  - `GET /api/recommendations/events` - Get personalized recommendations
  - `GET /api/recommendations/events/:eventId/similar` - Get similar events
  - `POST /api/recommendations/preferences` - Update user preferences

## Implementation Details

### Feature Toggle

The recommendation system includes a feature toggle to enable/disable ML recommendations without affecting the system:

**Environment Variable**: `ML_RECOMMENDATION_ENABLED=true|false`

- When **enabled**: Uses ML microservice for recommendations
- When **disabled**: Uses fallback rule-based recommendations
- When **ML service unavailable**: Automatically falls back to rule-based system

### Request Flow

1. **User Request** → Frontend calls `/api/recommendations/events`
2. **Backend Processing** → Backend fetches user profile and available events
3. **ML Service Call** → Backend sends data to ML microservice via HTTP
4. **ML Processing** → ML service calculates similarity scores using TF-IDF and cosine similarity
5. **Response** → Backend receives recommendations and enriches with event details
6. **Frontend Display** → User sees personalized recommendations

### Fallback Mechanism

If the ML service is unavailable or returns an error, the system automatically uses a fallback recommendation engine that:
- Scores events based on user interests and skills
- Matches event tags with user preferences
- Considers attended event organizers
- Ensures users always get recommendations

## Configuration

### Backend Environment Variables

Add to `.env` or Docker environment:

```bash
# ML Recommendation Service
ML_API_URL=http://ml-recommendation:5002
ML_RECOMMENDATION_ENABLED=true
ML_API_TIMEOUT=10000
```

### Docker Compose

The service is defined in `docker-compose.yml`:

```yaml
ml-recommendation:
  build:
    context: ./ML/Recommendation
    dockerfile: Dockerfile
  container_name: ml-recommendation-service
  ports:
    - "5002:5002"
  environment:
    - FLASK_ENV=production
  networks:
    - campverse
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
```

## API Contract

### POST /recommend

**Request Body**:
```json
{
  "userProfile": {
    "userId": "string",
    "interests": ["string"],
    "skills": ["string"],
    "attendedEvents": [
      {
        "eventId": "string",
        "title": "string",
        "type": "string",
        "tags": ["string"],
        "organizer": "string"
      }
    ]
  },
  "availableEvents": [
    {
      "eventId": "string",
      "title": "string",
      "description": "string",
      "type": "string",
      "tags": ["string"],
      "organizer": "string"
    }
  ],
  "limit": 10
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "eventId": "string",
      "similarityScore": 0.85,
      "reason": "Matches your interests: AI, Machine Learning"
    }
  ],
  "message": "Recommendations generated successfully"
}
```

## Deployment

### Local Development

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check service health**:
   ```bash
   curl http://localhost:5002/health
   ```

3. **Test recommendations**:
   ```bash
   curl -X GET http://localhost:5001/api/recommendations/events \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Production Deployment

1. **Set environment variables** in your hosting platform (Render, AWS, etc.)
2. **Deploy ML service** as a separate container/service
3. **Configure backend** to point to ML service URL
4. **Enable health checks** to monitor service availability
5. **Set up monitoring** for recommendation API performance

## Testing

### Unit Tests

Test the fallback mechanism:
```javascript
// Test when ML service is disabled
process.env.ML_RECOMMENDATION_ENABLED = 'false';
// Verify fallback recommendations are returned

// Test when ML service is unavailable
// Mock axios to throw error
// Verify fallback recommendations are returned
```

### Integration Tests

1. Test ML service independently
2. Test backend with ML service running
3. Test backend with ML service stopped (fallback)
4. Test end-to-end recommendation flow

### Load Testing

- Test recommendation API with multiple concurrent requests
- Monitor ML service response times
- Verify fallback mechanism under load

## Performance Considerations

### Caching
Consider implementing caching for:
- User profiles (reduce DB queries)
- Available events (refresh periodically)
- Recommendation results (TTL-based)

### Optimization
- Limit event list sent to ML service (filter by date, status)
- Implement pagination for large result sets
- Use connection pooling for HTTP requests
- Monitor ML service memory usage

### Scaling
- ML service can be scaled horizontally
- Use load balancer for multiple ML instances
- Consider Redis for caching recommendations

## Monitoring

### Health Checks
- Backend: `/health` endpoint
- ML Service: `/health` endpoint
- Monitor response times and error rates

### Logging
- Log all ML API calls and responses
- Track fallback usage frequency
- Monitor recommendation quality metrics

### Metrics to Track
- ML service availability (uptime)
- Response time (p50, p95, p99)
- Fallback usage rate
- User engagement with recommendations

## Troubleshooting

### ML Service Not Responding

**Symptoms**: Backend logs show ML API errors

**Solutions**:
1. Check ML service is running: `docker ps | grep ml-recommendation`
2. Check ML service logs: `docker logs ml-recommendation-service`
3. Verify network connectivity: `docker network inspect campverse`
4. Check environment variables are set correctly

### Poor Recommendation Quality

**Symptoms**: Users report irrelevant recommendations

**Solutions**:
1. Review training data in `dataset/events.json`
2. Update user profiles with accurate interests/skills
3. Retrain model with fresh data
4. Adjust similarity calculation weights in `server.py`

### High Latency

**Symptoms**: Slow recommendation responses

**Solutions**:
1. Implement caching (Redis)
2. Reduce number of events sent to ML service
3. Optimize TF-IDF vectorization
4. Scale ML service horizontally

## Model Training and Updates

### Training Data

The model uses data from:
- `dataset/events.json` - Event data
- `dataset/users.json` - User data

### Retraining the Model

1. Update training data in `dataset/`
2. Run training script:
   ```bash
   cd ML/Recommendation
   python main.py
   ```
3. New models saved to `model/` directory
4. Restart ML service to load new models

### Model Files

- `events_similarity.pkl` - Precomputed event similarity matrix
- `events_vector.pkl` - Event feature vectors
- `users_similarity.pkl` - User similarity matrix
- `users_vector.pkl` - User feature vectors

## Security Considerations

1. **API Security**:
   - Implement API key authentication for ML service
   - Use internal network for backend-ML communication
   - Validate input data before sending to ML service

2. **Data Privacy**:
   - Don't log sensitive user information
   - Anonymize data sent to ML service if needed
   - Comply with data protection regulations

3. **Rate Limiting**:
   - Apply rate limiting to recommendation endpoints
   - Prevent abuse of ML service resources

## Future Enhancements

1. **Collaborative Filtering**: Add user-to-user similarity
2. **A/B Testing**: Test different recommendation algorithms
3. **Feedback Loop**: Learn from user interactions
4. **Real-time Updates**: Update recommendations as user browses
5. **Hybrid Approach**: Combine content-based and collaborative filtering
6. **Personalized Ranking**: Rerank results based on user context
7. **Explainable AI**: Provide better reasons for recommendations

## Support and Contact

For issues or questions:
- Check logs in `Backend/logs/` and ML service logs
- Review this guide and documentation
- Contact the development team

## Changelog

### v1.0.0 (Current)
- Initial microservice integration
- Feature toggle implementation
- Fallback mechanism
- Docker containerization
- Health checks and monitoring

---

**Last Updated**: October 4, 2025  
**Version**: 1.0.0  
**Maintained By**: CampVerse Development Team
