# BOLA/IDOR Endpoint Inventory (auto-generated)

| File | Route | Methods | Params | Verdict |
|---|---|---|---|---|
| auth.py | /fcm-token | 'POST' | no | REVIEW |
| auth.py | /2fa/setup | 'POST' | no | REVIEW |
| auth.py | /2fa/verify-and-enable | 'POST' | no | REVIEW |
| orders.py | /price-estimate | 'GET' | no | REVIEW |
| orders.py | /quote | 'POST' | no | REVIEW |
| orders.py | /price-estimate | 'GET' | no | REVIEW |
| payments.py | /create-intent | 'POST' | no | REVIEW |
| privacy.py | /consent | 'POST' | no | REVIEW |
| support.py | /upload | 'POST' | no | REVIEW |
| wallet.py | /charge-card | 'POST' | no | REVIEW |

## Verdict Summary

| Verdict | Count |
|---|---|
| OK(public) | 33 |
| OWNED | 37 |
| REVIEW | 10 |
| ROLE | 207 |
| UNAUTHED | 4 |