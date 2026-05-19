FROM python:3.10-slim

WORKDIR /app

COPY esl/fs4/requirements.txt .

RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxmlsec1-dev \
    pkg-config \
    libtool \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

COPY esl/fs6/requirements.txt .
COPY esl/fs6/ESL.py .
COPY esl/fs6/_ESL.so .
COPY esl/fs6/app.py .
COPY esl/fs6/config.py .

# Set Python path to include ESL location
ENV PYTHONPATH=/

# Install any additional requirements
RUN pip3 install kafka-python;

CMD ["sh", "-c", "sleep 60  & python app.py "]