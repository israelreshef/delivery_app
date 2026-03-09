# 🛡️ Security Disclosure & Bug Bounty Policy

Tzir Delivery values the work of the security research community. This policy outlines our commitment to responsible disclosure and our reward program for qualifying vulnerabilities.

## 🤝 Responsible Disclosure Guidelines
We ask that security researchers:
- Provide us with a reasonable amount of time to resolve the issue before making any info public.
- Make a good faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our service.
- Only interact with accounts you own or with explicit permission from the account holder.

## 🏆 Bug Bounty Reward Tiers
Rewards are based on the severity of the vulnerability as determined by our engineering team (CVSS v3.1).

| Severity | Reward Range (ILS) | Description |
| :--- | :--- | :--- |
| **Critical** | 10,000+ | RCE, SQLi (Full DB access), Unauthorized access to PII, Payment bypass. |
| **High** | 5,000 - 10,000 | Stored XSS reaching sensitive users, Full Broken Auth, IDOR on sensitive data. |
| **Medium** | 1,000 - 5,000 | Reflected XSS, CSRF on sensitive actions, Sensitive data exposure in logs. |
| **Low** | Swag / Recognition| SPF/DMARC issues, Fingerprinting, Non-sensitive data leaks. |

## ⏲️ Response SLA
- **Acknowledge**: Within 24 hours.
- **Triage**: Within 7 days.
- **Fix**: Within 30 days.

## 🚀 Launch Condition
The Bug Bounty program will officially launch **6 months** after the application has been stable in production. Until then, we welcome responsible disclosure but do not guarantee financial rewards.

## 📬 Reporting
Please send all security reports to: **security@tzir-delivery.co.il**
Include detailed steps to reproduce, a PoC, and the potential impact.
