import streamlit as st
import pandas as pd
from sentence_transformers import SentenceTransformer, util
import faiss
import numpy as np

# --- 1. Load Data and Model (This runs only once at the start) ---
@st.cache_resource
def load_resources():
    """Loads the FAQ data, creates embeddings, and builds the FAISS index."""
    # Load the FAQ data from the JSON file
    df = pd.read_json('faq.json')
    
    # Load a pre-trained sentence transformer model
    # This model is great for understanding the meaning of sentences.
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Create embeddings for all the questions in our FAQ
    # An embedding is a numerical representation of the text.
    question_embeddings = model.encode(df['question'].tolist(), convert_to_tensor=True)
    
    # Create a FAISS index to allow for fast similarity searching
    # We are telling FAISS that our vectors have a dimension of 384 (which is the output size of the 'all-MiniLM-L6-v2' model).
    index = faiss.IndexFlatL2(question_embeddings.shape[1])
    
    # Add our question embeddings to the FAISS index
    index.add(question_embeddings.cpu().numpy())
    
    return df, model, index

df, model, index = load_resources()

# --- 2. Build the Streamlit User Interface ---

st.title("🤖 Campverse Help Chatbot")
st.write("Ask me anything about the platform, and I'll do my best to find the answer!")

# Create a text input box for the user's question
user_question = st.text_input("What's your question?")

if user_question:
    # --- 3. Find the Most Relevant Answer ---
    
    # Create an embedding for the user's question
    user_question_embedding = model.encode(user_question, convert_to_tensor=True)
    
    # Reshape the embedding to be a 2D array for FAISS search
    user_question_embedding_np = user_question_embedding.cpu().numpy().reshape(1, -1)
    
    # Search the FAISS index for the most similar question
    # We're asking for the top 1 most similar result (k=1)
    distances, indices = index.search(user_question_embedding_np, k=1)
    
    # Get the index of the best match
    best_match_index = indices[0][0]
    
    # Retrieve the corresponding answer from our dataframe
    retrieved_answer = df.iloc[best_match_index]['answer']
    retrieved_question = df.iloc[best_match_index]['question']

    # --- 4. Display the Result ---
    st.write("Here's what I found:")
    
    # Using an expander to make the UI cleaner
    with st.expander(f"**Best Match:** {retrieved_question}"):
        st.write(retrieved_answer)