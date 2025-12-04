---
title: Chatbot
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
sdk_version: "1.0"
app_file: app.py
pinned: false
---
# CampVerse Chatbot Microservice

## Features

- **Gemini AI Integration**: Enhanced NLP understanding using Google's Gemini API
- **Intent Classification**: Smart detection of user intents (event search, greetings, help, etc.)
- **Semantic Event Search**: Find events using natural language queries
- **FAQ Support**: Answer common questions about the platform
- **Real-time Chat**: WebSocket support for live conversations

## Quick Start for New Users

If you're new and want to run this chatbot microservice, you can choose either Docker or Python. Both methods are described below:

---

### 🚀 Run via Python (Local Development)

1. **Clone the Repository**
  ```bash
  git clone https://github.com/CcpC-cuj/CampVerse.git
  cd CampVerse/ML/chatbot
  ```

2. **Install Python & Dependencies**
  Make sure you have Python 3.10+ installed. Then install dependencies:
  ```bash
  pip install -r requirements.txt
  ```

3. **Set Environment Variables**
   ```bash
   export BACKEND_URL=http://localhost:5001  # Backend API URL
   export GEMINI_API_KEY=your_gemini_api_key  # For enhanced NLP (optional)
   ```

4. **Start the Backend Service**
   ```bash
   uvicorn app:app_socket --host 0.0.0.0 --port 8000
   ```

5. **Test with CLI Chat Client**
  Open a new terminal and run:
  ```bash
  python cli_chat.py
  ```
  Type your questions and interact with the bot.

---

### 🐳 Run via Docker (Containerized)

1. **Build the Docker Image**
  ```bash
  docker build -t chatbot-service .
  ```

2. **Run the Docker Container**
   ```bash
   docker run -p 8000:8000 -e BACKEND_URL=http://localhost:5001 chatbot-service
   ```3. **Test the Service**
  - REST API: 
    ```bash
    curl -X POST http://localhost:8000/chatbot -H "Content-Type: application/json" -d '{"question":"How do I register?"}'
    ```
  - Socket.IO: 
    ```bash
    python cli_chat.py
    ```

---

### 🌐 Integrate with Your Web App
Use REST API or Socket.IO as shown below to connect your frontend.

---

A production-ready chatbot microservice using FastAPI, Socket.IO, and sentence transformers for FAQ-based question answering.

## Features

- 🚀 **FastAPI REST API**: HTTP endpoint for Q&A
- 🔌 **Socket.IO Real-time**: WebSocket support for live chat
- 🤖 **AI-Powered**: Uses sentence transformers and FAISS for semantic search
- 🎯 **Intent Classification**: Detects greetings, event queries, help requests, and more
- 🔍 **Dynamic Event Discovery**: Fetches and searches live events from backend API
- 🐳 **Docker Ready**: Containerized for easy deployment
- 📝 **Logging**: Comprehensive logging for debugging
- ✅ **Input Validation**: Validates question length and content
- 🌐 **CORS Enabled**: Ready for frontend integration

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (React/Web)    │
└────────┬────────┘
         │
         │ HTTP POST /chatbot
         │ OR Socket.IO
         │
┌────────▼────────┐
│   app.py        │
│  FastAPI +      │
│  Socket.IO      │
└────────┬────────┘
         │
         │ Semantic Search
         │
┌────────▼────────┐
│   faq.json      │
│  (FAQ Database) │
└─────────────────┘
```

## API Endpoints

### REST API

**POST /chatbot**
```json
Request:
{
  "question": "How do I register?"
}

Response:
{
  "question": "How do I register?",
  "answer": "Click on the Register button..."
}
```

### Socket.IO Events

**Client → Server**
- `user_question`: Send a question
  ```javascript
  socket.emit('user_question', { question: 'How do I login?' });
  ```

**Server → Client**
- `bot_answer`: Receive answer
  ```javascript
  socket.on('bot_answer', (data) => {
    console.log(data.answer);
  });
  ```

## Setup & Installation

### Local Development

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   uvicorn app:app_socket --host 0.0.0.0 --port 8000
   ```

3. **Test with CLI client:**
   ```bash
   python cli_chat.py
   ```

### Docker Deployment

1. **Build the image:**
   ```bash
   docker build -t chatbot-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 8000:8000 chatbot-service
   ```

3. **Test the service:**
   - REST API: `curl -X POST http://localhost:8000/chatbot -H "Content-Type: application/json" -d '{"question":"How do I register?"}'`
   - Socket.IO: `python cli_chat.py`

## Project Structure

```
chatbot/
├── app.py              # Main backend (FastAPI + Socket.IO)
├── cli_chat.py         # CLI client for testing
├── Dockerfile          # Docker configuration
├── faq.json            # FAQ database
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## Integration with Frontend

### React Example (Socket.IO)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8000');

socket.on('connect', () => {
  console.log('Connected to chatbot');
});

socket.on('bot_answer', (data) => {
  console.log('Answer:', data.answer);
});

// Send question
socket.emit('user_question', { question: 'How do I login?' });
```

### React Example (REST API)

```javascript
const response = await fetch('http://localhost:8000/chatbot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'How do I login?' })
});

const data = await response.json();
console.log(data.answer);
```

## Configuration

### Environment Variables

You can configure the service using environment variables:

- `PORT`: Server port (default: 8000)
- `LOG_LEVEL`: Logging level (default: INFO)

### FAQ Management

Edit `faq.json` to add/update questions and answers:

```json
[
  {
    "question": "How do I register?",
    "answer": "Click on the Register button on the homepage..."
  }
]
```

After updating, rebuild the Docker image or restart the server.

## Monitoring & Logs

The service logs all:
- Client connections/disconnections
- Incoming questions
- Matched FAQ pairs
- Errors and warnings

View logs in Docker:
```bash
docker logs -f <container-id>
```

## Security

- CORS is enabled for all origins (configure for production)
- Input validation (max 512 characters)
- Error handling to prevent crashes
- No rate limiting (add if needed for production)

## Testing

### Manual Testing

1. Start the service
2. Run CLI client: `python cli_chat.py`
3. Type questions and verify responses

### Testing REST API

```bash
curl -X POST http://localhost:8000/chatbot \
  -H "Content-Type: application/json" \
  -d '{"question":"How do I register?"}'
```

## Troubleshooting

**Service won't start:**
- Check if port 8000 is available
- Verify all dependencies are installed
- Check logs for errors

**CLI client can't connect:**
- Ensure service is running on port 8000
- Check firewall settings
- Verify `python-socketio` is installed

**No answer returned:**
- Check if `faq.json` exists and is valid
- Verify the question exists in FAQ database
- Check server logs for errors

## Future Enhancements

- [ ] Add rate limiting for production
- [ ] Add authentication for Socket.IO
- [ ] Support multiple languages
- [ ] Add conversation history
- [ ] Implement fallback responses
- [ ] Add metrics and analytics

## License

Part of the CampVerse project.
