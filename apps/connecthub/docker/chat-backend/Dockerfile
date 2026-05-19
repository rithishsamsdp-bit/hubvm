# Use an official Python image as a parent image
FROM python:3.11.2-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY chat-backend/requirements.txt .

# Install dependencies
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container
COPY chat-backend/app/ /app/ 

# Expose the application port
EXPOSE 5060

# Define the command to run the ASGI app with uvicorn
# We run combined_asgi_app so that Socket.IO is included
CMD ["uvicorn", "main:combined_asgi_app", "--host", "0.0.0.0", "--port", "5060"]
