
# Hugging Face Spaces Dockerfile template
# Read the doc: https://huggingface.co/docs/hub/spaces-sdks-docker
FROM python:3.9

RUN useradd -m -u 1000 user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

ENV PORT=7860
# Environment variables (set via HF Spaces secrets or docker-compose)
ENV GEMINI_API_KEY=""
ENV BACKEND_URL=""

WORKDIR /app

COPY --chown=user ./requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user . /app

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
