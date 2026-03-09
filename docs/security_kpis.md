# 📈 Security KPIs Dashboard

This document tracks the critical security health metrics for Tzir Delivery on a monthly basis.

## 🔬 Core Metrics
| KPI | Definition | Target |
| :--- | :--- | :--- |
| **MTTD** | Mean Time To Detect (from event start to alert) | < 5 Minutes |
| **MTTR** | Mean Time To Respond (from alert to mitigation) | < 30 Minutes |
| **Patch Lag** | Avg days from CVE publish to production fix | < 3 Days (Critical) |
| **WAF Block Rate** | % of total requests blocked by WAF/RASP | Monitor Trend |
| **Auth Failures** | Number of failed login attempts per 1k users | < 5% |
| **Anomaly Hits** | Number of Behavioral Anomaly triggers | Monitor Trend |

## 🛡️ Health Indicators
- **Failed Login Trend**: Spike > 20% indicates potential brute-force/credential stuffing.
- **Rate-Limit Violations**: Increase indicates bot activity or API misuse.
- **Admin Step-up Rate**: % of admin actions requiring 2nd factor or re-auth.

## 📊 Monthly Review Items
- **Phishing Simulation**: % click rate (Target: < 5%).
- **JIT Access Count**: Number of production sessions granted.
- **DPA Review**: Number of 3rd party audits completed.

## 📅 KPI Tracking (2026)
| Month | MTTD | MTTR | Patch Lag | WAF Blocks | Phish Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **March** | | | | | |
| **April** | | | | | |
| **May**   | | | | | |

> [!NOTE]
> Metrics are automatically exported from CloudWatch and Datadog/Sentry logs into this dashboard monthly.
