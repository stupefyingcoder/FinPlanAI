# One Python image: the API imports the ML package directly, so a prediction and a
# planning answer are both function calls rather than a second service.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# curl is used by the compose healthcheck; the rest are wheels' runtime libs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Requirements first so a code change does not reinstall the dependency tree.
COPY ml/requirements-serve.txt /app/ml/requirements-serve.txt
COPY backend/requirements.txt /app/backend/requirements.txt

# No PyTorch. The allocation network is 4,677 parameters and is evaluated in
# NumPy from the exported .npz weights, so the image does not carry a 536 MB
# framework to do three matrix multiplies — which is what keeps an image under
# the size limits of most free hosting tiers. Training uses ml/requirements.txt,
# outside the image entirely.
RUN pip install -r /app/ml/requirements-serve.txt -r /app/backend/requirements.txt

COPY ml /app/ml
COPY backend /app/backend

# The backend imports finplan_ml from ../ml relative to itself.
ENV PYTHONPATH=/app/backend:/app/ml

COPY backend/entrypoint.sh /app/entrypoint.sh
# Belt and braces on line endings. .gitattributes already pins this file to LF,
# which covers a normal clone — but a ZIP download, a patch applied on Windows or
# a contributor with unusual git settings can still deliver CRLF, and a CRLF
# shebang fails in the container with "no such file or directory", an error that
# points at the interpreter rather than the real cause.
RUN tr -d '\r' < /app/entrypoint.sh > /app/entrypoint.tmp && mv /app/entrypoint.tmp /app/entrypoint.sh && chmod +x /app/entrypoint.sh
$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

WORKDIR /app/backend
EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["api"]
