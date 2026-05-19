# Use an official Python image as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY elevenlabs_standalone/requirements.txt .

RUN apt-get update --fix-missing && apt-get install -y --fix-missing \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container
COPY elevenlabs_standalone/app/ /app/ 

# Expose the application port (default FastAPI port is 8050)
EXPOSE 8050

# Copy ESL library files since it's required for python ESL API execution
COPY livemonitoring/app/ESL.py /app/ESL.py
COPY livemonitoring/app/_ESL.so /app/_ESL.so

# Define the command to run the FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8050"]
