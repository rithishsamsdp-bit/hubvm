# Use an official Python image as a parent image
FROM python:3.11.2-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file to the container
COPY ivrblastAuth/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container
COPY ivrblastAuth/app/ /app/ 

# Expose the application port (default FastAPI port is 8000)
EXPOSE 8000

# Define the command to run the FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]