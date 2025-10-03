from fastapi import FastAPI, Request
from pydantic import BaseModel
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import faiss
import numpy as np

app = FastAPI()

class QuestionRequest(BaseModel):
    question: str

# Load resources once
df = pd.read_json('faq.json')
model = SentenceTransformer('all-MiniLM-L6-v2')
question_embeddings = model.encode(df['question'].tolist(), convert_to_tensor=True)
index = faiss.IndexFlatL2(question_embeddings.shape[1])
index.add(question_embeddings.cpu().numpy())

@app.post("/chatbot")
def chatbot(req: QuestionRequest):
    user_question_embedding = model.encode(req.question, convert_to_tensor=True)
    user_question_embedding_np = user_question_embedding.cpu().numpy().reshape(1, -1)
    distances, indices = index.search(user_question_embedding_np, k=1)
    best_match_index = indices[0][0]
    retrieved_answer = df.iloc[best_match_index]['answer']
    retrieved_question = df.iloc[best_match_index]['question']
    return {
        "question": retrieved_question,
        "answer": retrieved_answer
    }