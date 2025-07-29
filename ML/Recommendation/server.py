from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json

app = Flask(__name__)
CORS(app)

# Load pre-trained model (if available)
try:
    with open('model/events_similarity.pkl', 'rb') as f:
        similarity_matrix = pickle.load(f)
    print("Loaded pre-trained similarity matrix")
except:
    similarity_matrix = None
    print("No pre-trained model found, using dynamic calculation")

@app.route('/recommend', methods=['POST'])
def recommend_events():
    try:
        data = request.json
        
        user_profile = data.get('userProfile', {})
        available_events = data.get('availableEvents', [])
        limit = data.get('limit', 10)
        
        if not available_events:
            return jsonify({
                'recommendations': [],
                'message': 'No events available for recommendation'
            })
        
        # Extract user interests and event features
        user_interests = user_profile.get('interests', [])
        user_skills = user_profile.get('skills', [])
        attended_events = user_profile.get('attendedEvents', [])
        
        # Create user profile vector
        user_profile_text = ' '.join(user_interests + user_skills)
        
        # Create event feature vectors
        event_features = []
        for event in available_events:
            event_text = f"{event.get('title', '')} {event.get('description', '')} {' '.join(event.get('tags', []))} {event.get('type', '')} {event.get('organizer', '')}"
            event_features.append(event_text)
        
        # Calculate similarity using TF-IDF and cosine similarity
        if event_features:
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            event_vectors = vectorizer.fit_transform(event_features)
            
            # Add user profile to the vector space
            user_vector = vectorizer.transform([user_profile_text])
            
            # Calculate similarities
            similarities = cosine_similarity(user_vector, event_vectors).flatten()
            
            # Create recommendations
            recommendations = []
            for i, event in enumerate(available_events):
                similarity_score = float(similarities[i])
                
                # Boost score based on user history
                if event.get('organizer') in [e.get('organizer') for e in attended_events]:
                    similarity_score += 0.2
                
                if event.get('type') in user_interests:
                    similarity_score += 0.3
                
                # Add common tags bonus
                event_tags = set(event.get('tags', []))
                user_interest_tags = set(user_interests)
                common_tags = event_tags.intersection(user_interest_tags)
                similarity_score += len(common_tags) * 0.1
                
                recommendations.append({
                    'eventId': event.get('eventId'),
                    'similarityScore': round(similarity_score, 3),
                    'reason': _get_recommendation_reason(event, user_profile, similarity_score)
                })
            
            # Sort by similarity score and return top recommendations
            recommendations.sort(key=lambda x: x['similarityScore'], reverse=True)
            recommendations = recommendations[:limit]
            
            return jsonify({
                'recommendations': recommendations,
                'message': 'Recommendations generated successfully'
            })
        else:
            return jsonify({
                'recommendations': [],
                'message': 'No event features available'
            })
            
    except Exception as e:
        return jsonify({
            'error': f'Error generating recommendations: {str(e)}',
            'recommendations': []
        }), 500

def _get_recommendation_reason(event, user_profile, similarity_score):
    reasons = []
    
    user_interests = user_profile.get('interests', [])
    attended_events = user_profile.get('attendedEvents', [])
    
    # Check for interest matches
    event_tags = set(event.get('tags', []))
    user_interest_tags = set(user_interests)
    common_tags = event_tags.intersection(user_interest_tags)
    
    if common_tags:
        reasons.append(f"Matches your interests: {', '.join(common_tags)}")
    
    if event.get('type') in user_interests:
        reasons.append(f"Matches your preferred event type: {event.get('type')}")
    
    # Check for organizer preference
    if event.get('organizer') in [e.get('organizer') for e in attended_events]:
        reasons.append(f"From organizer you've attended before: {event.get('organizer')}")
    
    if similarity_score > 0.5:
        reasons.append("High similarity to your profile")
    elif similarity_score > 0.2:
        reasons.append("Moderate similarity to your profile")
    else:
        reasons.append("Popular event")
    
    return '; '.join(reasons) if reasons else "Recommended for you"

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'ML Recommendation API',
        'model_loaded': similarity_matrix is not None
    })

if __name__ == '__main__':
    print("Starting ML Recommendation API server...")
    print("Available endpoints:")
    print("- POST /recommend: Generate event recommendations")
    print("- GET /health: Health check")
    app.run(host='0.0.0.0', port=5002, debug=True) 