# Use official Python image
FROM python:3.13-slim

WORKDIR /app

# Install build tools for numpy/faiss
RUN apt-get update && apt-get install -y build-essential gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "app:app_socket", "--host", "0.0.0.0", "--port", "8000"]
