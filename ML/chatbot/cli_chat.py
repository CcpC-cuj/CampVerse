import socketio
import sys
import threading
import time

sio = socketio.Client()
user_can_input = threading.Event()
user_can_input.set()

@sio.event
def connect():
    print("\n✅ Connected to CampVerse Chatbot!")
    print("Type your questions below. Press Ctrl+C to exit.\n")

@sio.event
def disconnect():
    print("\n❌ Disconnected from chatbot backend.")

@sio.event
def bot_answer(data):
    print("\n------------------------------")
    if 'error' in data:
        print(f"❌ Error: {data['error']}")
    else:
        print(f"🤖 Bot says: {data['answer']}")
        print(f"   (Matched FAQ: {data['question']})")
    print("------------------------------\n")
    time.sleep(2)
    user_can_input.set()

def ask_user():
    while True:
        user_can_input.wait()
        question = input("You: ")
        if question.strip():
            sio.emit('user_question', {'question': question})
        else:
            print("⚠️  Please enter a valid question.\n")
        user_can_input.clear()

try:
    sio.connect('http://localhost:8000')
    user_thread = threading.Thread(target=ask_user)
    user_thread.daemon = True
    user_thread.start()
    while True:
        pass
except KeyboardInterrupt:
    print("\n👋 Goodbye!")
    sio.disconnect()
    sys.exit(0)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
