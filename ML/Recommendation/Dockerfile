FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements_server.txt ./

RUN pip install --no-cache-dir -r requirements_server.txt

# Copy application files
COPY server.py ./
# COPY Infer.py ./   # Removed because Infer.py does not exist
COPY model/ ./model/

# Create non-root user
RUN useradd -m -u 1001 mluser && \
    chown -R mluser:mluser /app

USER mluser

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5002/health || exit 1

# Run the server
CMD ["python", "server.py"] 