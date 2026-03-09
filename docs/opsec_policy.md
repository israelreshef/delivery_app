# 🛡️ Operational Security (OPSEC) Policy

## 🏛️ 1. Privileged Access Workstations (PAW)
- **Specification**: 
  - Operating System: Hardened Linux (Fedora/Ubuntu LTS) or macOS (managed).
  - No Local Admin: Users do not have sudo/admin rights for daily use.
  - EDR Mandatory: CrowdStrike Falcon or SentinelOne must be active.
  - Connectivity: PAW → VPN → Bastion Host → Production. No direct internet-to-prod access.
  - **Role Responsible**: IT/Security Lead

## 🔑 2. JIT (Just-In-Time) Access Workflow
- **Rules**:
  - Request required for ANY production access.
  - Maximum duration: **4 hours** (Hard Kill).
  - Dual Control: 2nd person approval required (Self-approval blocked).
  - Full Recording: All shell/DB sessions recorded and archived for 90 days.
  - **Role Responsible**: SRE Team

## 🚪 3. Personnel & Offboarding
- **Background Checks**: Criminal and credit history mandatory for employees with production access.
- **Phishing**: Quarterly mandatory simulations. Failure requires immediate remediation training.
- **Offboarding Checklist**:
  1. Revoke SSO (Google Workspace/Okta).
  2. Revoke VPN access.
  3. Revoke Vault & HSM credentials.
  4. Revoke GitHub & CI/CD access.
  5. Wipe PAW machine remotely (if applicable).
  6. Revoke access to 3rd party providers (Stripe, AWS, etc.).
- **SLA**: Full revocation within **1 hour** of departure trigger.
- **Role Responsible**: HR + IT Security

## 🚨 4. Break-Glass Procedure
- **Usage**: Only for critical P0 outages where 2nd-person approval is impossible.
- **Review**: Mandatory 24-hour post-incident review by Security Lead.
- **Forensics**: Immutable logs preserved immediately after session end.
- **Role Responsible**: Engineering Director
