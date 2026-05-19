# Use Python 3.10 slim image as base
FROM python:3.11.2-slim

# Set the working directory
WORKDIR /app

# Copy requirements.txt from the root directory to the container
COPY queueconsumer/app/requirements.txt .

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the entire app folder into the container
COPY queueconsumer/app /app

# Set PYTHONPATH so modules can be found
ENV PYTHONPATH=/app
# Define the command to run the FastAPI app with uvicorn
CMD ["sh", "-c", "sleep 60  & python consumer.py "]
