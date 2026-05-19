# Use an official Python image as a parent image
FROM python:3.11.2-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY socketioserver/requirements.txt .

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*


# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container
COPY socketioserver/app/ /app/ 

# Expose the application port (default FastAPI port is 8000)
EXPOSE 8000

# Define the command to run the FastAPI app with uvicorn
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["uvicorn", "main:combined_asgi_app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--timeout-keep-alive", "0", "--no-server-header"] 
