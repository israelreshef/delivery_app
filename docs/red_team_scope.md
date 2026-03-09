# 🎯 Red Team Engagement Scope & Rules of Engagement

This document defines the scope and rules for external security assessments and red team exercises for the Tzir Delivery platform.

## 🕵️ Engagement Scope
The following assets are **IN SCOPE** for the assessment:
- **Web Application**: `https://api.tzir-delivery.co.il` and all subdomains.
- **Admin Dashboard**: `https://admin.tzir-delivery.co.il`.
- **Mobile Applications**: Android and iOS production binaries.
- **Infrastructure**: AWS Production & Staging accounts (limited to platform-layer vulnerabilities).
- **Social Engineering**: Phishing and Vishing targeting employees with production access (must be pre-coordinated).

## 🚫 Out of Scope
The following are strictly **OUT OF SCOPE**:
- Physical security of offices or data centers.
- DDoS/DoS attacks that impact service availability for real users.
- Destruction of real customer data (use test accounts only).
- Vulnerabilities in 3rd party providers (Stripe, AWS, Google) unless they are misconfigurations on our side.

## ⚖️ Rules of Engagement
- **Notification**: The Security Lead must be notified 24 hours prior to starting active scanning.
- **Evidence**: All findings must be accompanied by a clear PoC, screenshots/video, and impact analysis.
- **Communication**: Use a secure, encrypted channel (Signal/Proton) for sharing vulnerability data.
- **Cleanup**: The testing team must assist in cleaning up any test data or "backdoors" created during the exercise.

## 🎓 Required Tester Certifications
Minimum one of the following must be held by the lead tester:
- **CREST** Certified Infrastructure / Web Tester.
- **OSCP** (Offensive Security Certified Professional).
- **OSWE** (Offensive Security Web Expert).
- **GIAC** GXPN or GWAPT.

## 📦 Evidence Handling
- Findings must be stored in an encrypted vault.
- PII must not be exported from the environment; use masked evidence only.
- Final report must be delivered via encrypted channel and deleted by the tester within 30 days of project close.
