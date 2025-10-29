# Use official Python image
FROM python:3.13-slim

WORKDIR /app

# Install build tools and curl for healthcheck, then clean up
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    curl && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt ./

# Install Python dependencies
RUN pip install -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1001 chatbot && \
    chown -R chatbot:chatbot /app

USER chatbot

EXPOSE 8000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/docs || exit 1

CMD ["uvicorn", "app:app_socket", "--host", "0.0.0.0", "--port", "8000"]
