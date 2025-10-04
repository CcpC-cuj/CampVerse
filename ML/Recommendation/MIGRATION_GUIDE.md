# ML Recommendation Microservice - Migration and Deployment Guide

## Overview

This guide helps you migrate from the current system to include the ML recommendation microservice without disrupting existing functionality.

## Pre-Migration Checklist

- [ ] Backup current database
- [ ] Review current event discovery implementation
- [ ] Test current system thoroughly
- [ ] Review infrastructure capacity
- [ ] Prepare rollback plan

## Migration Steps

### Phase 1: Preparation (No Impact)

#### Step 1: Add Environment Variables

Add to your `.env` file or environment configuration:

```bash
# ML Recommendation Service
ML_API_URL=http://ml-recommendation:5002
ML_RECOMMENDATION_ENABLED=false  # Start disabled
ML_API_TIMEOUT=10000
```

**Note**: Initially set `ML_RECOMMENDATION_ENABLED=false` to ensure zero impact.

#### Step 2: Verify Configuration

Check that the backend can read the new configuration:

```bash
cd Backend
node -e "const {config} = require('./config/environment'); console.log(config.ml);"
```

Expected output:
```javascript
{
  recommendationEnabled: false,
  apiUrl: 'http://ml-recommendation:5002',
  timeout: 10000,
  fallbackEnabled: true,
  retryAttempts: 2,
  retryDelay: 1000
}
```

### Phase 2: Deploy ML Service (No Impact)

#### Step 3: Build ML Service Container

```bash
# Build the ML recommendation service
cd ML/Recommendation
docker build -t ml-recommendation-service .
```

#### Step 4: Test ML Service Locally

```bash
# Run ML service standalone
docker run -p 5002:5002 ml-recommendation-service

# Test health endpoint
curl http://localhost:5002/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "ML Recommendation API",
  "model_loaded": false
}
```

#### Step 5: Test ML Recommendation Endpoint

```bash
curl -X POST http://localhost:5002/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "userProfile": {
      "interests": ["AI", "Machine Learning"],
      "skills": ["Python"],
      "attendedEvents": []
    },
    "availableEvents": [
      {
        "eventId": "test1",
        "title": "AI Workshop",
        "description": "Learn AI basics",
        "tags": ["AI", "Workshop"],
        "type": "Workshop",
        "organizer": "Tech Club"
      }
    ],
    "limit": 5
  }'
```

### Phase 3: Integration Testing (No Impact)

#### Step 6: Start All Services with Docker Compose

```bash
# From project root
docker-compose up -d

# Verify all services are running
docker-compose ps
```

Expected output should show:
- backend (running)
- ml-recommendation (running)
- mongo (running)
- redis (running)
- frontend (running)

#### Step 7: Test Backend Integration (ML Still Disabled)

```bash
# Login to get token
TOKEN=$(curl -X POST http://localhost:5001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-user@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# Test recommendations endpoint (should use fallback)
curl -X GET "http://localhost:5001/api/recommendations/events?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

Verify response contains:
- `recommendations` array
- `note: "Using fallback recommendations (ML feature disabled)"`

### Phase 4: Gradual Rollout (Controlled Impact)

#### Step 8: Enable ML Recommendations for Testing

Update environment variable:
```bash
ML_RECOMMENDATION_ENABLED=true
```

Restart backend:
```bash
docker-compose restart backend
```

#### Step 9: Test ML-Powered Recommendations

```bash
# Test recommendations endpoint (should use ML service)
curl -X GET "http://localhost:5001/api/recommendations/events?limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

Verify response:
- No `note` about fallback
- `similarityScore` values present
- `reason` field explains recommendations

#### Step 10: Monitor System Performance

Monitor for 24-48 hours:

**Check Backend Logs**:
```bash
docker logs -f backend
```

Look for:
- ML API call success/failure rates
- Response times
- Fallback usage

**Check ML Service Logs**:
```bash
docker logs -f ml-recommendation-service
```

Look for:
- Request counts
- Processing times
- Errors

**Check Resource Usage**:
```bash
docker stats
```

Monitor:
- CPU usage
- Memory usage
- Network I/O

### Phase 5: Production Deployment

#### Step 11: Deploy to Staging Environment

1. Update staging environment variables
2. Deploy using your CI/CD pipeline
3. Run automated tests
4. Perform manual testing

#### Step 12: Deploy to Production

**Option A: Blue-Green Deployment** (Recommended)
1. Deploy new version to green environment
2. Test thoroughly
3. Switch traffic to green
4. Monitor for issues
5. Keep blue as rollback option

**Option B: Rolling Update**
1. Deploy to subset of instances
2. Monitor for issues
3. Gradually increase traffic
4. Complete rollout if stable

#### Step 13: Monitor Production

**First 24 Hours**:
- Check error rates every hour
- Monitor API response times
- Review user feedback
- Check fallback usage rate

**First Week**:
- Daily performance reviews
- User engagement metrics
- Recommendation quality feedback
- System stability monitoring

## Rollback Procedures

### Quick Rollback (Disable ML Feature)

If issues are detected:

```bash
# Set environment variable
ML_RECOMMENDATION_ENABLED=false

# Restart backend
docker-compose restart backend
```

System immediately falls back to rule-based recommendations.

### Full Rollback (Remove ML Service)

If ML service causes infrastructure issues:

```bash
# Stop ML service
docker-compose stop ml-recommendation

# Update docker-compose.yml to comment out ml-recommendation service
# Restart system
docker-compose up -d
```

## Verification Checklist

After migration, verify:

- [ ] Users can browse events normally
- [ ] Recommendations are displayed on discover page
- [ ] Similar events appear on event detail pages
- [ ] System works when ML service is down (fallback)
- [ ] Response times are acceptable (< 2 seconds)
- [ ] No increase in error rates
- [ ] Resource usage is within limits
- [ ] Logs show successful ML API calls

## Common Issues and Solutions

### Issue 1: ML Service Not Responding

**Symptoms**: Backend logs show "ML service unavailable"

**Solution**:
```bash
# Check ML service status
docker-compose ps ml-recommendation

# Check ML service logs
docker logs ml-recommendation-service

# Restart ML service
docker-compose restart ml-recommendation
```

### Issue 2: High Memory Usage

**Symptoms**: ML service consuming excessive memory

**Solution**:
```yaml
# Add resource limits to docker-compose.yml
ml-recommendation:
  # ... other config
  deploy:
    resources:
      limits:
        memory: 1G
      reservations:
        memory: 512M
```

### Issue 3: Slow Recommendations

**Symptoms**: Recommendation API taking > 3 seconds

**Solution**:
1. Implement caching for recommendations
2. Reduce number of events sent to ML service
3. Optimize TF-IDF calculation
4. Consider precomputing recommendations

### Issue 4: Poor Recommendation Quality

**Symptoms**: Users report irrelevant recommendations

**Solution**:
1. Review and update training data
2. Collect user feedback
3. Retrain model with recent data
4. Adjust similarity scoring weights

## Performance Optimization

### Caching Strategy

Implement Redis caching:

```javascript
// Cache user profile for 5 minutes
await redis.setex(`user:profile:${userId}`, 300, JSON.stringify(userProfile));

// Cache recommendations for 1 hour
await redis.setex(`recommendations:${userId}`, 3600, JSON.stringify(recommendations));
```

### Database Optimization

Add indexes for frequent queries:

```javascript
// User interests lookup
User.collection.createIndex({ interests: 1 });

// Event tags lookup
Event.collection.createIndex({ tags: 1, verificationStatus: 1, date: 1 });
```

### API Optimization

Implement request batching:

```javascript
// Batch multiple recommendation requests
const batchRecommendations = async (userIds) => {
  // Process multiple users in single ML API call
};
```

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Availability**
   - ML service uptime
   - Successful API calls rate

2. **Performance**
   - Response time (p50, p95, p99)
   - Request throughput

3. **Quality**
   - User engagement with recommendations
   - Click-through rate
   - Fallback usage rate

4. **Resources**
   - CPU usage
   - Memory usage
   - Network bandwidth

### Alert Thresholds

Set up alerts for:
- ML service down for > 5 minutes
- Response time > 3 seconds for 5 minutes
- Error rate > 5% for 5 minutes
- Memory usage > 80% for 10 minutes

## Testing Scenarios

### Load Testing

```bash
# Install load testing tool
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:5001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
    - post:
        url: '/api/users/login'
        json:
          email: 'test@example.com'
          password: 'password'
        capture:
          json: '$.token'
          as: 'token'
    - get:
        url: '/api/recommendations/events'
        headers:
          Authorization: 'Bearer {{ token }}'
EOF

# Run load test
artillery run load-test.yml
```

### Integration Testing

Run automated tests:

```bash
cd Backend
npm test -- __tests__/integration/recommendation.integration.test.js
```

### End-to-End Testing

Manual test scenarios:
1. Login as user
2. Navigate to discover events page
3. Verify recommendations appear
4. Click on recommended event
5. Verify similar events appear
6. Test with different user profiles

## Success Criteria

The migration is successful when:

1. ✅ All services running without errors
2. ✅ Response times < 2 seconds (p95)
3. ✅ Fallback works when ML service unavailable
4. ✅ No increase in error rates
5. ✅ User engagement metrics stable or improved
6. ✅ Resource usage within acceptable limits
7. ✅ Zero downtime during deployment
8. ✅ Rollback plan tested and working

## Post-Migration Tasks

### Week 1
- [ ] Daily monitoring of key metrics
- [ ] Collect user feedback
- [ ] Review and address any issues
- [ ] Document lessons learned

### Week 2-4
- [ ] Analyze recommendation effectiveness
- [ ] A/B test improvements
- [ ] Optimize performance bottlenecks
- [ ] Plan model retraining

### Month 2+
- [ ] Review training data quality
- [ ] Implement feedback loop
- [ ] Consider advanced features
- [ ] Scale based on usage patterns

## Support

For issues during migration:

1. Check logs: `docker logs backend` and `docker logs ml-recommendation-service`
2. Review this guide
3. Check Integration Guide in `INTEGRATION_GUIDE.md`
4. Contact development team

## Appendix

### Useful Commands

```bash
# View all logs
docker-compose logs -f

# Restart specific service
docker-compose restart [service-name]

# Check service health
curl http://localhost:5001/health
curl http://localhost:5002/health

# View resource usage
docker stats

# Backup database
docker exec mongo mongodump -d campverse -o /backup

# Clear caches
docker exec redis redis-cli FLUSHALL
```

### Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ML_API_URL` | `http://localhost:5002` | ML service endpoint |
| `ML_RECOMMENDATION_ENABLED` | `false` | Enable/disable ML recommendations |
| `ML_API_TIMEOUT` | `10000` | Request timeout (ms) |

---

**Last Updated**: October 4, 2025  
**Version**: 1.0.0  
**Maintained By**: CampVerse Development Team
