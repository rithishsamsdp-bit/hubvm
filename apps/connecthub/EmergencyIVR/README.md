# Emergency IVR Consumer

Dedicated Kafka consumer pod that originates emergency IVR calls via FreeSWITCH ESL.

## Architecture

```
Emergency Orchestrator (telephony pod)
  → Kafka topic: emergency-ivr-calls
    → EmergencyIVR Consumer (this pod)
      → FreeSWITCH ESL originate
        → sofia/gateway/{carrier}/{number} &transfer(ivr_flow XML default)
```

## Files

| File | Description |
|------|-------------|
| `app/emergency_consumer.py` | Main Kafka consumer — listens on `emergency-ivr-calls`, originates calls via ESL |
| `app/config.py` | Settings loaded from env vars (Kafka + FreeSWITCH) |
| `app/ESL.py` + `app/_ESL.so` | FreeSWITCH ESL native library |
| `app/requirements.txt` | Python dependencies |
| `app/.env` | Local dev environment variables |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KAFKA_HOST` | Kafka broker host | — |
| `KAFKA_PORT` | Kafka broker port | — |
| `FS_SERVER` | FreeSWITCH ESL host | `13.232.198.50` |
| `FS_PORT` | FreeSWITCH ESL port | `8021` |
| `FS_PASSWORD` | FreeSWITCH ESL password | `Pulse#$2024` |

In K8s, these come from `kafka-details` and `freeswitch-secrets`.

## Kafka Message Format

Topic: `emergency-ivr-calls`

```json
{
  "lead_number": "917010635230",
  "campaign_id": 4,
  "carrierName": "gateway_name",
  "campaignName": "Emergency_4",
  "database": "database_name",
  "c_Id": "EMG_4_917010635230"
}
```

## Deployment

### Docker Build
```bash
docker build -t emergency-ivr-consumer -f docker/EmergencyIVR/Dockerfile .
```

### K8s
```bash
kubectl apply -f k8/EmergencyIVR/deployment.yaml
```

### CI/CD
Automated via GitHub Actions (`.github/workflows/emergencyivr.yml`).  
Triggers on pushes to `main` branch when files in `EmergencyIVR/` or `docker/EmergencyIVR/` change. Redeploy: fix ESL disconnect causing CANCEL...

## Local Development

```bash
cd EmergencyIVR/app
pip install -r requirements.txt
python emergency_consumer.py
```
