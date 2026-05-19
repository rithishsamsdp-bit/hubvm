#!/bin/bash
echo "Waiting for Kafka to be ready..."
while ! timeout 2 bash -c "echo > /dev/tcp/kafka/9092"; do
  sleep 2
done
echo "Kafka is up. Starting consumer..."
exec python kafka/consumer_manager.py
