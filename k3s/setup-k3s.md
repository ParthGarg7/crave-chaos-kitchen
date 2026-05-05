# K3s Setup Guide — Self Healing Cloud Phase 2
# Run all commands in WSL2 Ubuntu terminal
# Estimated setup time: 20-30 minutes

## Step 1: Install WSL2 (PowerShell as Admin)

```powershell
wsl --install
wsl --set-default-version 2
```

Install Ubuntu from Microsoft Store then open Ubuntu.

## Step 2: Install K3s inside WSL2

```bash
curl -sfL https://get.k3s.io | sh -

# Verify K3s is running
sudo systemctl status k3s

# Set up kubectl access
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config

# Verify kubectl works
kubectl get nodes
# Expected: NAME   STATUS   ROLES   AGE   VERSION
#           ...    Ready    ...
```

## Step 3: Install Chaos Mesh

```bash
# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

kubectl create ns chaos-mesh

helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/k3s/containerd/containerd.sock

# Verify Chaos Mesh pods running
kubectl get pods -n chaos-mesh
# All pods must show Running before continuing
```

## Step 4: Create namespace

```bash
kubectl apply -f k3s/namespace.yaml
kubectl get ns selfhealing
```

## Step 5: Build and import images into K3s

```bash
# Build images (run from project root)
docker build -t crave-backend:latest ./backend
docker build -t niramay-backend:latest ./backend
docker build -t niramay-frontend:latest ./frontend

# Import into K3s containerd (run in WSL2)
docker save crave-backend:latest | sudo k3s ctr images import -
docker save niramay-backend:latest | sudo k3s ctr images import -
docker save niramay-frontend:latest | sudo k3s ctr images import -

# Verify images imported
sudo k3s ctr images ls | grep -E "crave|niramay"
```

## Step 6: Deploy RBAC and applications

```bash
# RBAC must be first (Niramay needs ServiceAccount)
kubectl apply -f k3s/niramay-rbac.yaml

# Deploy CRAVE config and permissions
kubectl apply -f k3s/crave-k3s-config.yaml

# Deploy CRAVE (database + redis + backend)
kubectl apply -f k3s/crave-deployment.yaml

# Wait for CRAVE to be ready
kubectl rollout status deployment/crave-backend \
  -n selfhealing --timeout=120s

# Deploy Niramay
kubectl apply -f k3s/niramay-deployment.yaml

# Wait for Niramay to be ready
kubectl rollout status deployment/niramay-backend \
  -n selfhealing --timeout=120s
```

## Step 7: Verify everything is running

```bash
kubectl get pods -n selfhealing
# Expected: all pods show Running/Ready

kubectl get services -n selfhealing
# Expected: all services listed with ClusterIPs

# Check CRAVE health
kubectl exec -n selfhealing \
  deployment/crave-backend -- \
  curl -s http://localhost:8000/health

# Check detailed health
kubectl exec -n selfhealing \
  deployment/crave-backend -- \
  curl -s http://localhost:8000/health/detailed
```

## Step 8: Access frontend

```bash
# Frontend is on NodePort 30000
# Get WSL2 IP address
ip addr show eth0 | grep "inet " | awk '{print $2}'

# Open in browser: http://<WSL2-IP>:30000

# Or use port forwarding
kubectl port-forward svc/niramay-frontend \
  3000:3000 -n selfhealing &
```

## Step 9: Run first healing demo

```bash
# Apply a single chaos experiment
kubectl apply -f - << 'EOF'
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: database-error-demo
  namespace: selfhealing
spec:
  action: loss
  mode: one
  selector:
    namespaces: [selfhealing]
    labelSelectors:
      app: crave-backend
  direction: to
  target:
    mode: one
    selector:
      namespaces: [selfhealing]
      labelSelectors:
        app: crave-postgres
  loss:
    loss: "100"
  duration: "3m"
EOF

# Watch Niramay detect and heal it
# Open dashboard and enable healing
```

## Troubleshooting

```bash
# Pod not starting — check events
kubectl describe pod -n selfhealing <pod-name>

# Image not found
sudo k3s ctr images ls | grep <image-name>

# K3s not starting
sudo systemctl restart k3s
sudo journalctl -u k3s -f

# Chaos Mesh not injecting
kubectl get pods -n chaos-mesh
kubectl describe networkchaos database-error-experiment -n selfhealing
```
