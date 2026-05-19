#!/bin/bash

set -e

OLD_K8_DIR="k8"
NEW_K8_DIR="k8s"
BASE_DIR="$NEW_K8_DIR/base"
OVERLAY_DIR="$NEW_K8_DIR/overlays/prod"

ECR_REGISTRY="647096474516.dkr.ecr.ap-south-1.amazonaws.com/connecthub"

echo "🚀 Starting K8s refactor..."

mkdir -p "$BASE_DIR"
mkdir -p "$OVERLAY_DIR"

# Services to skip (non-standard workloads)
SKIP_SERVICES=("kafka" "ingress" "gateway" "httproute" "pvc" "keys" "esl")

for svc_path in $OLD_K8_DIR/*; do
  svc=$(basename "$svc_path")

  # Skip unwanted services
  if [[ " ${SKIP_SERVICES[@]} " =~ " ${svc} " ]]; then
    echo "⏭ Skipping $svc"
    continue
  fi

  echo "🔧 Processing $svc..."

  BASE_SVC_DIR="$BASE_DIR/$svc"
  OVERLAY_SVC_DIR="$OVERLAY_DIR/$svc"

  mkdir -p "$BASE_SVC_DIR"
  mkdir -p "$OVERLAY_SVC_DIR"

  # ---- Copy deployment ----
  if [[ -f "$svc_path/deployment.yaml" ]]; then
    cp "$svc_path/deployment.yaml" "$BASE_SVC_DIR/deployment.yaml"

    # Replace image with placeholder
    sed -i 's|image:.*|image: REPLACE_IMAGE|g' "$BASE_SVC_DIR/deployment.yaml"

    # Inject imagePullSecrets if not present
    if ! grep -q "imagePullSecrets" "$BASE_SVC_DIR/deployment.yaml"; then
      sed -i '/spec:/a\      imagePullSecrets:\n        - name: ecr-secret' "$BASE_SVC_DIR/deployment.yaml"
    fi
  fi

  # ---- Copy service ----
  if [[ -f "$svc_path/service.yaml" ]]; then
    cp "$svc_path/service.yaml" "$BASE_SVC_DIR/service.yaml"
  fi

  # ---- Create base kustomization ----
  cat <<EOF > "$BASE_SVC_DIR/kustomization.yaml"
resources:
  - deployment.yaml
EOF

  if [[ -f "$BASE_SVC_DIR/service.yaml" ]]; then
    echo "  - service.yaml" >> "$BASE_SVC_DIR/kustomization.yaml"
  fi

  # ---- Create overlay kustomization ----
  cat <<EOF > "$OVERLAY_SVC_DIR/kustomization.yaml"
resources:
  - ../../../base/$svc

images:
  - name: REPLACE_IMAGE
    newName: $ECR_REGISTRY/$svc
    newTag: latest
EOF

done

echo "✅ Refactor complete!"
