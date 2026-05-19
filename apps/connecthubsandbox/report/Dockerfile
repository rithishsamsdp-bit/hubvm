# Use an official Python image as a parent image
FROM python:3.11.2-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY report/requirements.txt .

RUN apt-get update -o Acquire::Retries=3 && apt-get install -o Acquire::Retries=3 -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*


# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container
COPY report/app/ /app/ 

# Expose the application port (default FastAPI port is 8000)
EXPOSE 8000

# Define the command to run the FastAPI app with uvicorn
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--timeout-keep-alive", "0", "--no-server-header"] 
CMD ["gunicorn","main:app","-k","uvicorn.workers.UvicornWorker","-w","1","--threads","2","--bind","0.0.0.0:8000","--timeout","30","--keep-alive", "2"]
# CMD [  "uvicorn",  "main:app",  "--host", "0.0.0.0",  "--port", "8000",  "--loop", "uvloop",  "--http", "httptools",  "--timeout-keep-alive", "5"]
