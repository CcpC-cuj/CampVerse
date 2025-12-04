"""
Gemini AI Service for Enhanced NLP Understanding
Uses Google's Gemini API for better intent detection and conversational responses
"""
import os
import logging
import json
import re
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger("chatbot.gemini")

# Try to import google.generativeai
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Gemini features disabled.")


class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model = None
        self.initialized = False
        
        if GEMINI_AVAILABLE and self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.initialized = True
                logger.info("Gemini AI service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
        else:
            if not GEMINI_AVAILABLE:
                logger.warning("Gemini library not available")
            if not self.api_key:
                logger.warning("GEMINI_API_KEY not set")
    
    def is_available(self) -> bool:
        """Check if Gemini service is available"""
        return self.initialized and self.model is not None
    
    def classify_intent(self, user_message: str) -> Tuple[str, float, Dict]:
        """
        Use Gemini to classify user intent with high accuracy
        Returns: (intent, confidence, extracted_entities)
        """
        if not self.is_available():
            return 'unknown', 0.0, {}
        
        prompt = f"""You are an intent classifier for CampVerse, a college event discovery platform.

Analyze the following user message and classify it into ONE of these intents:
- greeting: User says hi, hello, hey, good morning, etc.
- farewell: User says bye, goodbye, see you, etc.
- thanks: User expresses gratitude
- event_search: User is looking for events, hackathons, workshops, competitions, etc.
- event_details: User wants details about a specific event
- registration_help: User wants help with event registration
- host_help: User wants to host/organize an event
- account_help: User has account/profile related questions
- general_question: General questions about the platform
- feedback: User giving feedback or suggestions

Also extract any relevant entities like:
- event_type: hackathon, workshop, seminar, webinar, competition, etc.
- time_frame: today, tomorrow, this week, upcoming, etc.
- topic: AI, ML, web development, coding, etc.
- location: any mentioned location

User message: "{user_message}"

Respond in this exact JSON format:
{{
    "intent": "intent_name",
    "confidence": 0.95,
    "entities": {{
        "event_type": null,
        "time_frame": null,
        "topic": null,
        "location": null
    }},
    "reasoning": "brief explanation"
}}"""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                intent = result.get('intent', 'general_question')
                confidence = result.get('confidence', 0.8)
                entities = result.get('entities', {})
                logger.info(f"Gemini classified intent: {intent} ({confidence}) for: {user_message}")
                return intent, confidence, entities
            else:
                logger.warning(f"Could not parse Gemini response: {response_text}")
                return 'general_question', 0.5, {}
                
        except Exception as e:
            logger.error(f"Gemini intent classification failed: {e}")
            return 'unknown', 0.0, {}
    
    def generate_response(self, user_message: str, intent: str, entities: Dict, 
                         events: Optional[List[Dict]] = None, context: str = "") -> str:
        """
        Generate a natural, conversational response using Gemini
        """
        if not self.is_available():
            return None
        
        # Build context about available events
        events_context = ""
        if events:
            events_context = "\n\nAvailable events:\n"
            for i, event in enumerate(events[:5], 1):
                title = event.get('title', 'Untitled')
                date = event.get('date', 'TBA')[:10] if event.get('date') else 'TBA'
                desc = event.get('description', '')[:100]
                event_type = event.get('type', 'event')
                tags = ', '.join(event.get('tags', [])[:3])
                events_context += f"{i}. {title} ({event_type})\n   Date: {date}\n   Tags: {tags}\n   Description: {desc}...\n\n"
        
        prompt = f"""You are CampVerseBot, a friendly and helpful assistant for CampVerse - a college event discovery platform.

User's message: "{user_message}"
Detected intent: {intent}
Extracted entities: {json.dumps(entities)}
{events_context}
{context}

Guidelines:
- Be friendly, concise, and helpful
- If events are provided, recommend them naturally
- For event searches, list events with dates and brief descriptions
- Use emojis sparingly for a friendly tone
- If no events match, suggest alternative searches
- For greetings, introduce yourself briefly
- For help requests, explain what you can do
- Keep responses under 200 words unless listing multiple events

Generate a natural, helpful response:"""

        try:
            response = self.model.generate_content(prompt)
            generated_text = response.text.strip()
            logger.info(f"Gemini generated response for intent: {intent}")
            return generated_text
        except Exception as e:
            logger.error(f"Gemini response generation failed: {e}")
            return None
    
    def enhance_search_query(self, user_message: str, entities: Dict) -> str:
        """
        Use Gemini to extract better search keywords from user message
        """
        if not self.is_available():
            return user_message
        
        prompt = f"""Extract the main search keywords from this event search query.
User message: "{user_message}"
Entities detected: {json.dumps(entities)}

Return only the key search terms separated by spaces (no explanation, just the keywords):"""

        try:
            response = self.model.generate_content(prompt)
            keywords = response.text.strip()
            logger.info(f"Enhanced search query: {keywords}")
            return keywords if keywords else user_message
        except Exception as e:
            logger.error(f"Query enhancement failed: {e}")
            return user_message
    
    def get_contextual_response(self, intent: str) -> Optional[str]:
        """
        Get quick responses for simple intents without API call
        """
        quick_responses = {
            'greeting': "Hi there! 👋 I'm CampVerseBot, your campus event assistant. I can help you discover hackathons, workshops, seminars, and more! What are you looking for today?",
            'farewell': "Goodbye! 👋 Feel free to come back anytime you need help finding events. Have a great day!",
            'thanks': "You're welcome! 😊 Let me know if there's anything else I can help you with!",
        }
        return quick_responses.get(intent)


# Singleton instance
_gemini_service = None

def get_gemini_service() -> GeminiService:
    """Get or create the singleton Gemini service instance"""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
