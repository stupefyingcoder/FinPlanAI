# One Python image serves both the API and the Streamlit planner: they share the
# ML package and its dependencies, and torch is far too large to install twice.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# curl is used by the compose healthcheck; the rest are wheels' runtime libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so a code change does not reinstall torch.
COPY ml/requirements.txt /app/ml/requirements.txt
COPY backend/requirements.txt /app/backend/requirements.txt

# CPU-only torch: the GPU build is several gigabytes and nothing here needs it.
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r /app/ml/requirements.txt -r /app/backend/requirements.txt

COPY ml /app/ml
COPY backend /app/backend

# The backend imports finplan_ml from ../ml relative to itself.
ENV PYTHONPATH=/app/backend:/app/ml

COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /app/backend
EXPOSE 8000 8501

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["api"]
