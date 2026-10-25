# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
# Vite config outputs straight into backend/static (see vite.config.ts)
COPY backend/ /app/backend/
RUN npm run build

# ---- Stage 2: Python runtime serving API + built static files ----
FROM python:3.12-slim AS runtime
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
# Overwrite with the freshly built frontend static files from stage 1
COPY --from=frontend-build /app/backend/static ./static

ENV PORT=8080
EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "app:app"]
