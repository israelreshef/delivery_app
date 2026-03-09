# 🌪️ Annual Disaster Recovery (DR) Drill Runbook

This document outlines the step-by-step procedure for the annual measurable DR restore drill.

## 🏁 Prerequisites
- **Backup Account**: Ensure access to the separate AWS backup account.
- **Tools**: AWS CLI, Terraform, and `spire-server` binaries.
- **Environment**: Use a clean, isolated VPC for recovery.

## 🛠️ Restoration Steps
1. **Infrastructure Recovery**: 
   - Apply Terraform to the recovery VPC.
   - Verify SPIRE server connectivity and mTLS certificate issuance.
2. **Database Point-in-Time Restore (PITR)**:
   - Restore the PostgreSQL RDS instance from the most recent immutable snapshot.
   - Match the encryption key ID with the one stored in the backup vault.
3. **Secrets Recovery**:
   - Re-import the HSM-wrapped master key into the recovery CloudHSM cluster.
   - Verify `secrets_manager.py` can decrypt test secrets.
4. **Service Startup**:
   - Deploy backend and frontend containers to the recovery VPC.
   - Verify health check endpoints (`/api/health`).

## ⏱️ RTO Measurement
- **Start Timer**: The moment the "outage" is declared.
- **End Timer**: The moment the first successful authenticated order is placed in the recovery environment.
- **Target**: 
  - Payment: **15 mins**
  - Orders: **1 hour**

## 📊 RPO Verification
- **Test**: Place an order 1 minute before the simulated outage.
- **Verification**: Ensure the order exists in the restored database.
- **Target**:
  - Payment: **0 mins** (Sync Replication)
  - Orders: **5 mins** (Async Replication)

## ✍️ Sign-off Template
- **Drill Date**: `YYYY-MM-DD`
- **Lead SRE**: `[Name]`
- **Measured RTO**: `[X minutes]`
- **Measured RPO**: `[Y minutes]`
- **Findings/Issues**: `[List any gaps discovered]`
- **Approval**: `[Security Lead Signature]`
