FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements_server.txt ./
RUN pip install --no-cache-dir -r requirements_server.txt

# Copy application files
COPY server.py ./
COPY Infer.py ./
COPY model/ ./model/

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:5002/health')"

# Run the server
CMD ["python", "server.py"] 