# Use Python 3.10 slim image as base
FROM python:3.10-slim


ENV TZ=Asia/Kolkata

# Install tzdata + dependencies
RUN apt-get update && apt-get install -y \
    tzdata \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && ln -fs /usr/share/zoneinfo/Asia/Kolkata /etc/localtime \
    && echo "Asia/Kolkata" > /etc/timezone \
    && dpkg-reconfigure -f noninteractive tzdata \
    && rm -rf /var/lib/apt/lists/*
# Set the working directory
WORKDIR /app

# Copy requirements.txt from the root directory to the container
COPY Predectivelogic/app/requirements.txt .

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the entire app folder into the container
COPY Predectivelogic/app /app

# Set PYTHONPATH so modules can be found
ENV PYTHONPATH=/app
# Define the command to run the FastAPI app with uvicorn
CMD ["sh", "-c", "sleep 60  & python Predectivemonitor.py "]
