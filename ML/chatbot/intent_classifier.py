"""
Intent Classification Service
Detects user intent: greeting, event_search, help, thanks, farewell, general_question
"""
import re
import logging
from typing import Tuple

logger = logging.getLogger("chatbot.intent")

class IntentClassifier:
    def __init__(self):
        # Define intent patterns with priority order
        self.intent_patterns = {
            'greeting': [
                r'^(hi|hello|hey|good morning|good afternoon|good evening|greetings|hii|hiii|helllo)[\s!?.]*$',
                r'\b(hi|hello|hey|good morning|good afternoon|good evening|greetings)\b',
            ],
            'farewell': [
                r'\b(bye|goodbye|see you|farewell|take care|good night)\b',
            ],
            'thanks': [
                r'\b(thank|thanks|appreciate|grateful|thx)\b',
            ],
            'host_help': [
                # Host-specific questions (check before event_search)
                r'\b(register|create|host|organize|add|post|submit|upload)\b.{0,50}\b(my event|an event|event)\b',
                r'\b(how to|how can i|how do i)\b.{0,50}\b(register|create|host|organize|add|post)\b.{0,50}\b(event)\b',
                r'\b(host|organizer|organiser)\b',
            ],
            'event_search': [
                # Direct event queries (search/find only)
                r'\b(show|find|search|list|get|display|tell|give|want|need|looking for)\b.{0,50}\b(event|hackathon|workshop|competition|seminar|webinar|conference|meetup|contest|fest|festival)\b',
                # Time-based queries
                r'\b(upcoming|today|tomorrow|this week|this month|next|future|soon|latest|recent)\b.{0,50}\b(event|hackathon|workshop)\b',
                # Location-based queries
                r'\b(at|in|near|on)\b.{0,50}\b(campus|college|university|cuj|ccpc)\b',
                # Category-based
                r'\b(ai|ml|tech|coding|programming|software|web|mobile|data|science)\b.{0,50}\b(event|hackathon|workshop)\b',
                # Simple keywords
                r'^(event|hackathon|workshop|competition|seminar|webinar|conference|meetup)s?\s*$',
            ],
            'help': [
                r'\b(help|support|assist|guide|what can you do|how does)\b',
            ],
        }
    
    def classify(self, text: str) -> Tuple[str, float]:
        """
        Classify user intent from text
        Returns: (intent, confidence)
        Priority: greeting/farewell/thanks > event_search > help > general_question
        """
        text_lower = text.lower().strip()
        
        # Priority 1: Check for exact greetings (single word)
        if text_lower in ['hi', 'hello', 'hey', 'hii', 'hiii', 'helllo', 'good morning', 'good afternoon', 'good evening']:
            logger.info(f"Detected intent: greeting for text: {text}")
            return 'greeting', 0.95
        
        # Priority 2: Check for farewell and thanks
        for intent in ['farewell', 'thanks']:
            for pattern in self.intent_patterns[intent]:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    logger.info(f"Detected intent: {intent} for text: {text}")
                    return intent, 0.9
        
        # Priority 3: Check for host_help (before event_search to avoid false positives)
        for pattern in self.intent_patterns['host_help']:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.info(f"Detected intent: host_help for text: {text}")
                return 'host_help', 0.9
        
        # Priority 4: Check for event_search
        for pattern in self.intent_patterns['event_search']:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.info(f"Detected intent: event_search for text: {text}")
                return 'event_search', 0.85
        
        # Priority 5: Check for help
        for pattern in self.intent_patterns['help']:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.info(f"Detected intent: help for text: {text}")
                return 'help', 0.8
        
        # Priority 5: Check for greeting (broader match)
        for pattern in self.intent_patterns['greeting']:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.info(f"Detected intent: greeting for text: {text}")
                return 'greeting', 0.85
        
        # Default to general question
        logger.info(f"Detected intent: general_question for text: {text}")
        return 'general_question', 0.5
    
    def get_response_for_intent(self, intent: str) -> str:
        """Get predefined response for specific intents"""
        responses = {
            'greeting': "Hi! I'm CampVerseBot, here to help you discover events and answer your questions. You can ask me about upcoming hackathons, workshops, or any other events!",
            'farewell': "Goodbye! If you need anything else, just ask. Have a great day!",
            'thanks': "You're welcome! If you have more questions, feel free to ask.",
            'help': "I can help you with:\n\n• Finding events (hackathons, workshops, competitions)\n• Answering questions about CampVerse\n• Registration and account help\n\nJust ask me anything!",
            'host_help': "🎯 To register your event as a host:\n\n1️⃣ Sign Up/Login - Create an account or log in\n\n2️⃣ Go to Dashboard - Navigate to your host dashboard\n\n3️⃣ Create Event - Click 'Create Event' button\n\n4️⃣ Fill Details - Add title, description, date, venue, etc.\n\n5️⃣ Submit - Your event will be reviewed and published\n\n💡 Need more help? Check our Host Guide or contact support!",
        }
        return responses.get(intent, "")
