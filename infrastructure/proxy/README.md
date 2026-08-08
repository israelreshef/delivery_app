# TZIR Delivery — Edge Web Application Firewall proxy (nginx) — S3

A ready-to-run nginx **reverse proxy + edge WAF** that sits in front of the
Flask backend (upstream `backend:5000`). It covers URI/query/header-layer WAF
rules, TLS termination, request-size caps and nginx rate limiting.

> Deep body inspection (JSON SQLi/XSS) lives in the app itself
> (`backend/utils/request_waf.py`, `SECURITY_WAF_ENABLED=true` in production).
> This nginx layer protects the network edge; the two form a defence-in-depth
> story together.

## Files

| File | Purpose |
|------|---------|
| `nginx.conf`              | Main proxy config: TLS port, rate-limit zones, body caps, upstream |
| `waf_uri.conf`            | Edge WAF: regex blocking on URI / query / headers (SQLi, XSS, traversal, bad UAs) |
| `upstream.conf`           | Upstream server definition (`backend:5000`) |
| `docker-compose.yml`      | Local/dev stack: `waf` (nginx) -> `backend` -> `redis` |

## Local run

```powershell
cd infrastructure/proxy
# One-off self-signed certs (dev only)
New-Item -ItemType Directory -Force -Path certs | Out-Null
openssl req -x509 -nodes -newkey rsa:2048 -days 365 -keyout certs/tzir.key -out certs/tzir.crt -subj "/CN=localhost"
docker compose up -d
# API reachable at https://localhost:8443 (backend stays private on :5000)
```

## Verify

```bash
curl -k https://localhost:8443/api/health                       # 200 {"status":"healthy",...}
curl -k "https://localhost:8443/api/orders?q=union%20select%201,2"   # 403 (WAF)
curl -k -s -o /dev/null -w "%{http_code}\n" https://localhost:8443/api/docs   # 200
```

## Production (AWS)

App Runner does not attach WAF ACLs to its managed domain. Deploy this nginx
as a reverse proxy inside your VPC (ECS Fargate / EC2) in front of the app, or
attach the `aws_wafv2_web_acl` from `../terraform/waf/main.tf` to your ALB /
AppRunner oauth. See the terraform dir for the managed-rule WebACL.