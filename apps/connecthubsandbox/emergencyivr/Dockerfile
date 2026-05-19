# Use Python 3.10 slim image as base (same as Predectivelogic)
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy requirements.txt
COPY EmergencyIVR/app/requirements.txt .

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire app folder into the container
COPY EmergencyIVR/app /app

# Set PYTHONPATH so modules can be found
ENV PYTHONPATH=/app

# Run the emergency IVR consumer
CMD ["python", "emergency_consumer.py"]
