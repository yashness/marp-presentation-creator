FROM oven/bun:1.3.5 AS bun

FROM python:3.13-slim

RUN apt-get update && apt-get install -y \
    chromium \
    nodejs \
    espeak-ng \
    libsndfile1 \
    build-essential \
    g++ \
    ffmpeg \
    libreoffice-impress \
    && rm -rf /var/lib/apt/lists/*

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
COPY --from=bun /usr/local/bin/bunx /usr/local/bin/bunx
ENV BUN_INSTALL=/usr/local/bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"
ENV CHROME_PATH=/usr/bin/chromium
RUN bun add -g @marp-team/marp-cli

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY . .

# Create non-root user and set permissions
RUN groupadd -r appuser && useradd -r -g appuser appuser && \
    chown -R appuser:appuser /app && \
    mkdir -p /app/data /app/logs /home/appuser/.cache/uv && \
    chown -R appuser:appuser /app/data /app/logs /home/appuser/.cache

USER appuser

EXPOSE 8000

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()"

# Production mode by default (use docker-compose for dev with --reload)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
