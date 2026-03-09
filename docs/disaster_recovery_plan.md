# 🌪️ Disaster Recovery (DR) Plan - Tzir Delivery

## 🏷️ 1. Recovery Objectives (RTO/RPO)
| Service Tier | RTO (Target) | RPO (Target) | Failure Scenario |
| :--- | :--- | :--- | :--- |
| **Payment & Billing** | 15 Minutes | 0 (No Data Loss) | DB Corruption / Single-Region Fail |
| **Active Orders** | 1 Hour | 5 Minutes | Service Outage |
| **Analytics/Reporting** | 24 Hours | 1 Hour | Misc Infrastructure Fail |

## 🏗️ 2. Resilience Architecture
### Immutable Backups (WORM)
- **Technology**: S3 Object Lock (Compliance mode).
- **Isolation**: Backups are stored in a **SEPARATE AWS ACCOUNT** (Tzir-Backup-Vault). 
- **Encryption**: Separate KMS keys in the backup account.
- **Duration**: 7-year retention for Israeli Privacy compliance (Amendment 13).

### Air-Gapped Strategy
- Monthly offline backup copy stored in a non-cloud environment (Physical vault or secondary cloud provider).

### Multi-Region Failover
- Staging environment is warm-standby in a different region (e.g., eu-central-1 vs eu-west-1).

## 🚑 3. Crisis Management
1. **Activation**: Lead SRE or Security Head declares P0 DR event.
2. **Infrastructure Recovery**: Terraform apply against backup region using HSM-backed secrets.
3. **Database Restore**: Point-in-time recovery (PITR) to latest valid timestamp.
4. **Validation**: Smoke test core flows (Auth -> Order -> Payment).

## 🧪 4. Testing & Maintenance
- **Quarterly**: Chaos Engineering (Kill random pods/instances).
- **Bi-Annual**: Measured restore drill (Must meet RTO/RPO).
- **Annual**: Full Disaster Tabletop simulation.

---
> [!IMPORTANT]
> A compromised root account in the main production account **cannot** delete backups in the separate WORM account.
