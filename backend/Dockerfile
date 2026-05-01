FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for cryptography, psycopg2, etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip, setuptools, wheel (important for dependency resolution)
RUN pip install --upgrade pip setuptools wheel

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application (kept --reload as you asked)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]