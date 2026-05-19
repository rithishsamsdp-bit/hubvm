# ConnectHub Team Chat Microservice

This microservice provides real-time chat capabilities (1-to-1 and Group messages) within the ConnectHub ecosystem.

## 🚀 Architecture
- **Backend**: FastAPI (Python 3.11)
- **Real-time**: Socket.IO (python-socketio)
- **Database**: MySQL (SQLAlchemy Async)
- **Storage**: Amazon S3 (for file sharing)
- **Deployment**: Kubernetes (EKS) via GitHub Actions

## 📂 Project Structure
- `app/main.py`: Entry point for FastAPI and Socket.IO.
- `app/chatsocket/`: Socket.IO namespaces and event handlers.
- `app/controllers/`: REST API endpoints for users, rooms, and messages.
- `app/repos/`: Data access layer.
- `app/models/`: SQLAlchemy database models.
- `app/utils/`: shared utilities (lifespan, S3 client).

## 🛠️ Deployment Configuration
- **Dockerfile**: Located in `docker/chat-backend/Dockerfile`.
- **K8s Manifests**: Located in `k8/chat-backend/`.
- **CI/CD**: `.github/workflows/chat-backend.yml`.

## 🔒 Company Restriction (PTPL Only)
As per requirements, the frontend menu for this service is restricted to the **PTPL** account code. This is managed in the frontend `useAuthStore.js`..

## 📡 Endpoints
- **REST**: `/chat/v1/*`
- **WebSocket**: `/chatsocket` (Socket.IO namespace `/chat`)

## ⚡ Manual Trigger
Adding or modifying any file in this directory (like this README) will trigger the GitHub Action to build and deploy the `fastapi-chat` pod to the Kubernetes cluster.
