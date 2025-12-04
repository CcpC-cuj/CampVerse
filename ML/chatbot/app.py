import pandas as pd
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import socketio
import logging
import os

# Import custom services
from event_service import EventService
from intent_classifier import IntentClassifier
from gemini_service import get_gemini_service, GeminiService

# --- Logging setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chatbot")

# --- Load resources ---
try:
    df = pd.read_json('faq.json')
    model = SentenceTransformer('all-MiniLM-L6-v2')
    question_embeddings = model.encode(df['question'].tolist(), convert_to_tensor=True)
    index = faiss.IndexFlatL2(question_embeddings.shape[1])
    index.add(question_embeddings.cpu().numpy())
    
    # Initialize event service and intent classifier
    backend_url = os.getenv('BACKEND_URL') or 'https://campverse-26hm.onrender.com' or 'http://localhost:5000'
    # If BACKEND_URL is not set, try Render, then fallback to localhost
    event_service = EventService(backend_url, model)
    intent_classifier = IntentClassifier()
    
    # Initialize Gemini service for enhanced NLP
    gemini_service = get_gemini_service()
    if gemini_service.is_available():
        logger.info("✅ Gemini AI service is available for enhanced NLP")
    else:
        logger.warning("⚠️ Gemini AI not available, using fallback intent classifier")
    
    # Fetch events on startup
    event_service.fetch_events()
    
    logger.info("Resources loaded successfully.")
except Exception as e:
    logger.error(f"Error loading resources: {e}")
    raise

# --- FastAPI REST API ---
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

@app.post("/chatbot")
async def chatbot(req: QuestionRequest, request: Request):
    question = req.question.strip()
    if not question:
        logger.warning("Received empty question.")
        return {"error": "Question cannot be empty."}
    if len(question) > 512:
        logger.warning("Question too long.")
        return {"error": "Question too long."}
    try:
        # Try Gemini for enhanced understanding first
        if gemini_service.is_available():
            intent, confidence, entities = gemini_service.classify_intent(question)
            logger.info(f"Gemini Intent: {intent} (confidence: {confidence}), entities: {entities}")
            
            # Quick responses for simple intents
            quick_response = gemini_service.get_contextual_response(intent)
            if quick_response:
                return {
                    "question": question,
                    "answer": quick_response,
                    "intent": intent,
                    "ai_enhanced": True
                }
            
            # Event search with enhanced understanding
            if intent in ['event_search', 'event_details']:
                # Enhance search query using extracted entities
                search_query = gemini_service.enhance_search_query(question, entities)
                events = event_service.search_events(search_query, top_k=5)
                
                # Generate natural response using Gemini
                response = gemini_service.generate_response(
                    question, intent, entities, events
                )
                if not response:
                    response = event_service.format_event_response(events)
                
                return {
                    "question": question,
                    "answer": response,
                    "intent": intent,
                    "events": events,
                    "ai_enhanced": True
                }
            
            # For other intents, generate contextual response
            response = gemini_service.generate_response(question, intent, entities)
            if response:
                return {
                    "question": question,
                    "answer": response,
                    "intent": intent,
                    "ai_enhanced": True
                }
        
        # Fallback to original intent classifier
        intent, confidence = intent_classifier.classify(question)
        logger.info(f"Fallback Intent: {intent} (confidence: {confidence})")
        
        # Handle specific intents
        if intent in ['greeting', 'farewell', 'thanks', 'help', 'host_help']:
            response = intent_classifier.get_response_for_intent(intent)
            return {
                "question": question,
                "answer": response,
                "intent": intent,
                "ai_enhanced": False
            }
        
        # Handle event search
        if intent == 'event_search':
            events = event_service.search_events(question, top_k=5)
            response = event_service.format_event_response(events)
            return {
                "question": question,
                "answer": response,
                "intent": intent,
                "events": events,
                "ai_enhanced": False
            }
        
        # Default: FAQ search
        user_question_embedding = model.encode(question, convert_to_tensor=True)
        user_question_embedding_np = user_question_embedding.cpu().numpy().reshape(1, -1)
        distances, indices = index.search(user_question_embedding_np, k=1)
        best_match_index = indices[0][0]
        retrieved_answer = df.iloc[best_match_index]['answer']
        retrieved_question = df.iloc[best_match_index]['question']
        logger.info(f"FAQ match: {question} -> {retrieved_question}")
        return {
            "question": retrieved_question,
            "answer": retrieved_answer,
            "intent": intent,
            "ai_enhanced": False
        }
    except Exception as e:
        logger.error(f"Error processing question: {e}")
        return {"error": "Internal server error."}

# --- Socket.IO real-time API ---
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app_socket = socketio.ASGIApp(sio, app)

@sio.event
def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def user_question(sid, data):
    question = data.get('question', '').strip()
    if not question:
        await sio.emit('bot_answer', {'error': 'Question cannot be empty.'}, to=sid)
        logger.warning(f"Empty question from {sid}")
        return
    if len(question) > 512:
        await sio.emit('bot_answer', {'error': 'Question too long.'}, to=sid)
        logger.warning(f"Long question from {sid}")
        return
    try:
        # Classify intent
        intent, confidence = intent_classifier.classify(question)
        logger.info(f"Intent: {intent} (confidence: {confidence})")
        
        # Handle specific intents
        if intent in ['greeting', 'farewell', 'thanks', 'help', 'host_help']:
            response = intent_classifier.get_response_for_intent(intent)
            await sio.emit('bot_answer', {
                'question': question,
                'answer': response,
                'intent': intent
            }, to=sid)
            return
        
        # Handle event search
        if intent == 'event_search':
            events = event_service.search_events(question, top_k=5)
            response = event_service.format_event_response(events)
            await sio.emit('bot_answer', {
                'question': question,
                'answer': response,
                'intent': intent
            }, to=sid)
            logger.info(f"SocketIO event search: {question}")
            return
        
        # Default: FAQ search
        user_question_embedding = model.encode(question, convert_to_tensor=True)
        user_question_embedding_np = user_question_embedding.cpu().numpy().reshape(1, -1)
        distances, indices = index.search(user_question_embedding_np, k=1)
        best_match_index = indices[0][0]
        retrieved_answer = df.iloc[best_match_index]['answer']
        retrieved_question = df.iloc[best_match_index]['question']
        await sio.emit('bot_answer', {
            'question': retrieved_question,
            'answer': retrieved_answer,
            'intent': intent
        }, to=sid)
        logger.info(f"SocketIO answered: {question} -> {retrieved_question}")
    except Exception as e:
        await sio.emit('bot_answer', {'error': 'Internal server error.'}, to=sid)
        logger.error(f"SocketIO error for {sid}: {e}")

# --- For Uvicorn ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app_socket, port=8000)