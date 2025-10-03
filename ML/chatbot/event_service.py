"""
Event Discovery Service
Fetches and searches events from the backend API
"""
import requests
import logging
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger("chatbot.events")

class EventService:
    def __init__(self, backend_url: str, model: SentenceTransformer):
        self.backend_url = backend_url
        self.model = model
        self.events_cache = []
        self.events_embeddings = None
        
    def fetch_events(self) -> List[Dict]:
        """Fetch all approved public events from backend"""
        try:
            response = requests.get(f"{self.backend_url}/api/events", timeout=5)
            if response.status_code == 200:
                data = response.json()
                self.events_cache = data.get("data", {}).get("events", [])
                logger.info(f"Fetched {len(self.events_cache)} events from backend")
                
                # Pre-compute embeddings for all events
                self._compute_event_embeddings()
                return self.events_cache
            else:
                logger.error(f"Failed to fetch events: {response.status_code}")
                return []
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            return []
    
    def _compute_event_embeddings(self):
        """Compute embeddings for all events"""
        if not self.events_cache:
            return
        
        event_texts = []
        for event in self.events_cache:
            # Combine title, description, and tags for better matching
            text = f"{event.get('title', '')} {event.get('description', '')} {' '.join(event.get('tags', []))}"
            event_texts.append(text)
        
        self.events_embeddings = self.model.encode(event_texts, convert_to_tensor=False)
        logger.info(f"Computed embeddings for {len(event_texts)} events")
    
    def search_events(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search events using semantic similarity"""
        if not self.events_cache or self.events_embeddings is None:
            self.fetch_events()
        
        if not self.events_cache:
            logger.warning("No events available in cache")
            return []
        
        # Encode user query
        query_embedding = self.model.encode([query], convert_to_tensor=False)
        
        # Calculate cosine similarity
        similarities = cosine_similarity(query_embedding, self.events_embeddings)[0]
        
        # Log similarity scores for debugging
        logger.info(f"Query: {query}")
        logger.info(f"Similarity scores: min={similarities.min():.3f}, max={similarities.max():.3f}, mean={similarities.mean():.3f}")
        
        # Get top k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        # Filter events with similarity > threshold (lowered to 0.15 for better recall)
        results = []
        for idx in top_indices:
            score = similarities[idx]
            if score > 0.15:  # Lowered threshold
                event = self.events_cache[idx].copy()
                event['similarity_score'] = float(score)
                results.append(event)
                logger.info(f"  Event '{event.get('title', 'Untitled')}' matched with score {score:.3f}")
        
        logger.info(f"Found {len(results)} matching events for query: {query}")
        return results
    
    def format_event_response(self, events: List[Dict]) -> str:
        """Format events into a conversational response"""
        if not events:
            return "Sorry, I couldn't find any events matching your query. Try searching for something like 'hackathon', 'AI workshop', or 'coding competition'."
        
        response = f"I found {len(events)} event(s) for you:\n\n"
        
        for i, event in enumerate(events, 1):
            title = event.get('title', 'Untitled Event')
            date = event.get('date', 'TBA')[:10] if event.get('date') else 'TBA'
            description = event.get('description', '')
            
            # Truncate description
            if len(description) > 100:
                description = description[:97] + "..."
            
            response += f"{i}. **{title}**\n"
            response += f"   📅 Date: {date}\n"
            
            if description:
                response += f"   📝 {description}\n"
            
            # Add website link if available
            if event.get('socialLinks', {}).get('website'):
                response += f"   🔗 [More Info]({event['socialLinks']['website']})\n"
            
            response += "\n"
        
        return response.strip()
