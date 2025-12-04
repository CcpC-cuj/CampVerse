---
title: Event Recommendation
emoji: 🧠
colorFrom: blue
colorTo: green
sdk: docker
sdk_version: "1.0"
app_file: server.py
pinned: false
---
# CampVerse Event Recommendation System

## Overview

A machine learning-based microservice that provides personalized event recommendations for CampVerse users using content-based filtering and TF-IDF similarity.

## Features

- 🎯 **Personalized Recommendations**: Based on user interests, skills, and event history
- 🔄 **Real-time Processing**: Dynamic recommendation generation via REST API
- 🛡️ **Fallback Support**: Backend automatically falls back to rule-based system if ML service unavailable
- 📊 **Similarity Scoring**: Uses TF-IDF and cosine similarity for accurate recommendations
- 🔧 **Easy Integration**: Simple REST API interface
- 🐳 **Dockerized**: Ready for containerized deployment

## Quick Start

### Prerequisites

- Python 3.10+
- Docker (optional)
- Flask and required Python packages

### Installation

#### Option 1: Local Setup

```bash
# Navigate to recommendation directory
cd ML/Recommendation

# Install dependencies
pip install -r requirements_server.txt

# Start the server
python server.py
```

Server will start on `http://localhost:5002`

#### Option 2: Docker

```bash
# Build Docker image
docker build -t ml-recommendation-service .

# Run container
docker run -p 5002:5002 ml-recommendation-service
```

#### Option 3: Docker Compose (Full Stack)

```bash
# From project root
docker-compose up -d
```

## API Documentation

### Health Check

**GET** `/health`

Check service status and availability.

**Response**:
```json
{
  "status": "healthy",
  "service": "ML Recommendation API",
  "model_loaded": false
}
```

### Generate Recommendations

**POST** `/recommend`

Generate personalized event recommendations for a user.

**Request Body**:
```json
{
  "userProfile": {
    "userId": "user123",
    "interests": ["AI", "Machine Learning", "Web Development"],
    "skills": ["Python", "JavaScript"],
    "attendedEvents": [
      {
        "eventId": "event1",
        "title": "Previous Event",
        "type": "Workshop",
        "tags": ["AI"],
        "organizer": "Tech Club"
      }
    ],
    "registeredEvents": []
  },
  "availableEvents": [
    {
      "eventId": "event2",
      "title": "AI Workshop",
      "description": "Learn about artificial intelligence",
      "type": "Workshop",
      "tags": ["AI", "Machine Learning"],
      "organizer": "Tech Club",
      "date": "2025-11-01"
    }
  ],
  "limit": 10,
  "page": 1
}
```

**Response**:
```json
{
  "recommendations": [
    {
      "eventId": "event2",
      "similarityScore": 0.85,
      "reason": "Matches your interests: AI, Machine Learning; From organizer you've attended before: Tech Club"
    }
  ],
  "message": "Recommendations generated successfully"
}
```

## Architecture

### System Design

```
┌─────────────┐      HTTP/REST      ┌──────────────────┐
│   Backend   │ ◄─────────────────► │  ML Recommender  │
│  (Node.js)  │                     │     (Flask)      │
└─────────────┘                     └──────────────────┘
      │                                      │
      │                                      │
      ▼                                      ▼
┌─────────────┐                     ┌──────────────────┐
│   MongoDB   │                     │  Pre-trained     │
│  (Events,   │                     │     Models       │
│   Users)    │                     │   (Pickled)      │
└─────────────┘                     └──────────────────┘
```

### Algorithm

1. **User Profile Construction**: Combine user interests and skills into text representation
2. **Event Feature Extraction**: Extract event title, description, tags, type, and organizer
3. **Vectorization**: Convert text to TF-IDF vectors
4. **Similarity Calculation**: Compute cosine similarity between user profile and events
5. **Score Boosting**: Apply bonuses for:
   - Same organizer as previously attended events (+0.2)
   - Event type matches user interests (+0.3)
   - Common tags with user interests (+0.1 per tag)
6. **Ranking**: Sort by final similarity score
7. **Response**: Return top N recommendations with reasons

## Model Training

### Content-Based Filtering

The system uses content-based filtering with two approaches:

#### 1. Training Pre-computed Models

```bash
# Create environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Train models
python main.py
```

This generates pre-computed similarity matrices saved in `model/` directory.

#### 2. Dynamic Calculation (Current Implementation)

The server dynamically calculates similarities for each request, allowing for:
- Real-time recommendations
- No model retraining required
- Flexibility with new events

### Dataset

Training data is in `dataset/`:
- `events.json`: Event data with titles, descriptions, tags
- `users.json`: User profiles with interests and history

**Note**: Update these files periodically with real data for better recommendations.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Flask environment mode |
| `FLASK_APP` | `server.py` | Main Flask application |
| `PORT` | `5002` | Server port |

### Server Configuration

Edit `server.py` to modify:
- Port number
- CORS settings
- Model paths
- Scoring weights

## Integration with Backend

The ML service integrates seamlessly with the CampVerse backend:

### Backend Configuration

```javascript
// Backend environment variables
ML_API_URL=http://ml-recommendation:5002
ML_RECOMMENDATION_ENABLED=true
ML_API_TIMEOUT=10000
```

### Backend Controller

The backend automatically:
1. Fetches user profile and event data
2. Calls ML API with prepared data
3. Handles ML service failures with fallback
4. Enriches recommendations with full event details
5. Returns formatted response to frontend

See `Backend/Controller/recommendation.js` for implementation.

## Testing

### Unit Tests (Python)

```bash
# Run Python tests
pytest tests/
```

### Integration Tests (Backend)

```bash
# Run backend integration tests
cd Backend
npm test -- __tests__/integration/recommendation.integration.test.js
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:5002/health

# Test recommendations
curl -X POST http://localhost:5002/recommend \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

## Deployment

### Development

```bash
docker-compose up -d
```

### Production

1. **Set environment variables** on hosting platform
2. **Deploy ML service** as separate container
3. **Configure backend** to use ML service URL
4. **Enable health checks** and monitoring
5. **Set up logging** and alerting

### Scaling

For high traffic:
- Deploy multiple ML service instances
- Use load balancer (nginx, traefik)
- Implement Redis caching for recommendations
- Consider GPU acceleration for large-scale deployments

## Performance

### Benchmarks

- **Request Processing**: ~100-300ms per request
- **Concurrent Requests**: Handles 50+ concurrent users
- **Memory Usage**: ~200-500MB per instance
- **CPU Usage**: Low, scales horizontally

### Optimization Tips

1. **Caching**: Cache recommendations with TTL
2. **Batch Processing**: Process multiple users together
3. **Limit Events**: Send only recent/relevant events to ML service
4. **Model Precomputation**: Use pre-trained models for faster inference
5. **Connection Pooling**: Reuse HTTP connections

## Monitoring

### Health Checks

- Endpoint: `GET /health`
- Docker: Built-in healthcheck
- Kubernetes: Liveness and readiness probes

### Metrics to Track

- Request count and rate
- Response times (p50, p95, p99)
- Error rates
- Resource usage (CPU, memory)
- Recommendation quality (user engagement)

### Logging

Logs include:
- Request/response details
- Processing times
- Errors and exceptions
- Model loading status

## Troubleshooting

### Common Issues

**1. Service won't start**
- Check Python version (3.10+)
- Verify dependencies installed
- Check port 5002 not in use

**2. Poor recommendations**
- Update training data
- Review user profile quality
- Adjust scoring weights
- Collect user feedback

**3. High memory usage**
- Limit event batch size
- Use pre-computed models
- Implement request throttling

**4. Slow responses**
- Implement caching
- Reduce vectorization complexity
- Scale horizontally

## Future Enhancements

- [ ] **Collaborative Filtering**: User-to-user similarity
- [ ] **Hybrid Approach**: Combine content and collaborative filtering
- [ ] **Deep Learning**: Neural network-based recommendations
- [ ] **A/B Testing**: Test different algorithms
- [ ] **Feedback Loop**: Learn from user interactions
- [ ] **Explainable AI**: Better recommendation reasons
- [ ] **Real-time Updates**: WebSocket for live recommendations
- [ ] **Multi-modal**: Consider images, videos, etc.

## Documentation

- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Migration Guide**: See `MIGRATION_GUIDE.md`
- **API Documentation**: See backend Swagger docs
- **Architecture Document**: See `Event Recommendation System Doc.pdf`

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Follow code review process

## License

Part of CampVerse project. See main repository for license details.

## Support

- GitHub Issues: Report bugs and request features
- Documentation: Check guides in this directory
- Team Contact: Reach out to development team

---

**Recommendation system**

**Content Based Filtering**

Create an environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Then run following commands:

```bash
pip install -r requirements.txt
```

To train the model:
```bash
python main.py
```
(make sure the dataset is loaded properly)

To use pre-built model:
Use models from folder name **model/**

---

**Collaborative filtering** - Coming soon!

---

**Version**: 1.0.0  
**Last Updated**: October 4, 2025  
**Maintained By**: CampVerse Development Team

 
