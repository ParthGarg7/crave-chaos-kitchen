# CRAVE K3s Deployment

> Kubernetes (K3s) manifests and Chaos Mesh experiments for deploying CRAVE in a lightweight Kubernetes cluster with infrastructure-level fault injection.

---

## Overview

This directory contains everything needed to deploy CRAVE's backend infrastructure into a K3s cluster running inside WSL2. Combined with Chaos Mesh, this enables **infrastructure-level** fault injection (network partitions, pod kills, resource stress) in addition to the application-level failure simulator.

---

## Files

| File | Description |
|------|-------------|
| [`setup-k3s.md`](setup-k3s.md) | Step-by-step K3s + Chaos Mesh installation guide |
| `namespace.yaml` | Creates the `selfhealing` namespace |
| `crave-k3s-config.yaml` | ConfigMaps and RBAC for CRAVE in K3s |
| `crave-deployment.yaml` | Deployments + Services for crave-backend, crave-postgres, crave-redis |
| `chaos-mesh-experiments.yaml` | Pre-built Chaos Mesh experiments (network loss, pod failure, etc.) |

---

## Quick Start

```bash
# Prerequisites: WSL2 + K3s + Helm installed (see setup-k3s.md)

# 1. Create namespace
kubectl apply -f namespace.yaml

# 2. Deploy CRAVE
kubectl apply -f crave-k3s-config.yaml
kubectl apply -f crave-deployment.yaml

# 3. Wait for pods to be ready
kubectl rollout status deployment/crave-backend -n selfhealing --timeout=120s

# 4. (Optional) Apply chaos experiments
kubectl apply -f chaos-mesh-experiments.yaml
```

---

## Chaos Mesh Experiments

The `chaos-mesh-experiments.yaml` file contains pre-built experiments for testing self-healing at the infrastructure level:

| Experiment | Type | Target | Effect |
|-----------|------|--------|--------|
| Database network loss | NetworkChaos | crave-postgres | 100% packet loss for 3 minutes |
| Redis network partition | NetworkChaos | crave-redis | Isolates Redis from backend |
| Backend pod kill | PodChaos | crave-backend | Kills the backend pod |
| CPU stress | StressChaos | crave-backend | 90% CPU utilization |

---

For the full setup guide including WSL2, K3s, Helm, and Chaos Mesh installation, see [`setup-k3s.md`](setup-k3s.md).
