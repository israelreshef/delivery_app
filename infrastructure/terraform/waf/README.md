# AWS WAFv2 for TZIR Delivery API — S3

Managed-rule WebACL (AWS WAFv2) for the production API edge:

| Rule | Group / Type | Priority |
|------|--------------|----------|
| Common RuleSet (OWASP baseline) | `AWSManagedRulesCommonRuleSet` | 10 |
| SQL injection | `AWSManagedRulesSQLiRuleSet` | 20 |
| XSS | `AWSManagedRulesXSSRuleSet` | 30 |
| IP reputation (threat intel feeds) | `AWSManagedRulesAmazonIpReputationList` | 40 |
| Rate-based per-IP burst | custom `rate_based_statement` | 50 |

Logging goes to CloudWatch (`/aws/wafv2/tzir-<env>-api`, 90-day retention) with
the `Authorization` header redacted.

## Apply

```bash
cd infrastructure/terraform/waf
terraform init
terraform apply \
  -var "apprunner_service_arn=arn:aws:apprunner:eu-west-1:123456789012:service/tzir-api/1a2b3c4d" \
  -var "region=eu-west-1"
```

Leave `apprunner_service_arn` empty when you only want the ACL prepared and
will attach it later via the AWS console.

## Notes

- App Runner supports WAF attachment at the service level (REGIONAL scope).
- The edge WAF complements the in-app layer (`backend/utils/request_waf.py`,
  `SECURITY_WAF_ENABLED=true`) — edge blocks at the network layer, the app
  enforces the same rules even when the edge is bypassed (e.g. local dev).
- The `nginx` reverse-proxy variant for non-AWS deployments lives in
  `../proxy/`.