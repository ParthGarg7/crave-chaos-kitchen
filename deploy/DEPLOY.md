# Deploying CRAVE to Oracle Cloud Free Tier

End-to-end guide: from a fresh OCI account to a live HTTPS link. Total time about 30-45 minutes.

---

## 1. Create the VM (Always Free)

1. OCI Console -> Compute -> Instances -> **Create instance**
2. Image: **Ubuntu 24.04** (aarch64)
3. Shape: **Ampere A1.Flex** - 2 OCPUs, 8 GB RAM is plenty (you can go up to 4/24 free)
4. Add your SSH public key, create, and note the **public IP**
5. (Recommended) Reserve the IP: Networking -> Reserved public IPs -> reserve and assign, so it never changes

> If you get "Out of capacity" for A1: retry at off-peak hours or pick another availability domain. It clears up.

## 2. Open ports 80 and 443 (two firewalls!)

**OCI Security List** (Networking -> VCN -> your subnet -> Security List -> Add ingress rules):

| Source | Protocol | Dest. port |
|--------|----------|-----------|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

**On the VM** (Ubuntu images from Oracle ship with restrictive iptables):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 3. Point a domain at the VM

Cheapest good option - **DuckDNS** (free):

1. Sign in at https://www.duckdns.org (GitHub login works)
2. Create subdomain `crave-chaos-kitchen` -> set its IP to your VM's public IP
3. Your live link becomes `https://crave-chaos-kitchen.duckdns.org`

Or buy a domain and create an **A record** to the VM IP. Caddy handles HTTPS automatically either way.

## 4. Install Docker

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

## 5. Deploy

```bash
git clone https://github.com/ParthGarg7/crave-chaos-kitchen.git
cd crave-chaos-kitchen
cp deploy/.env.prod.example .env
nano .env        # set DOMAIN, a strong POSTGRES_PASSWORD, and SECRET_KEY (openssl rand -hex 32)
docker compose -f docker-compose.prod.yml up -d --build
```

First boot takes a few minutes (arm64 image builds + Let's Encrypt certificate issuance).

## 6. Seed demo data (first run only)

```bash
docker exec crave-backend python init_db.py
```

## 7. Verify

- `https://<your-domain>/` - the app
- `https://<your-domain>/api/v1/restaurants` - API responds
- `https://<your-domain>/docs` - Swagger UI

---

## Updating a running deployment

```bash
cd crave-chaos-kitchen
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Notes

- The **injector** container is not part of the production stack on purpose - chaos scenarios are driven manually from the developer dashboard (role-guarded).
- The Niramay/RabbitMQ integration ships **dormant** (`NIRAMAY_PUBLISH_ENABLED=false`); production keeps it off.
- Only Caddy is internet-facing. Postgres/Redis/backend/frontend have no published ports.
- Free-tier bandwidth is 10 TB/month - effectively unlimited for a portfolio app.
