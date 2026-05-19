# 🛠️ If you are going to use the Gateway API instructions, you can install Istio using the minimal profile because you will not need the istio-ingressgateway which is otherwise installed by default:

# 🛠️ Installing Istio with Minimal Profile and Gateway API Support

This guide explains how to install [Istio](https://istio.io) using the **minimal profile**, and enable **Gateway API** support for lightweight Kubernetes environments (e.g., EKS, local, dev).

---

## 📦 Prerequisites

- A Kubernetes cluster (e.g., EKS, Minikube, kind)
- `kubectl` configured and authenticated
- `curl`, `tar`, and basic CLI tools installed
- Port 80/443 open in your AWS security group (for EKS)

---

## ✅ Step 1: Download Istio CLI

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.21.1 sh -
cd istio-1.21.1
export PATH=$PWD/bin:$PATH


istioctl install --set profile=minimal -y .
