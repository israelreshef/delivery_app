# AWS WAFv2 WebACL for the TZIR Delivery API (S3 — WAF at the edge).
#
# Managed rule groups (AWS) + a rate-based rule, attached to the
# App Runner service (or an ALB) via `aws_wafv2_web_acl_association`.
#
# Apply:
#   cd infrastructure/terraform/waf
#   terraform init && terraform apply

variable "environment" {
  type        = string
  default     = "production"
  description = "Deployment environment (used for naming)."
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "apprunner_service_arn" {
  type        = string
  default     = ""
  description = "ARN of the App Runner service to protect. Leave empty to skip association."
}

variable "rate_limit_per_ip" {
  type        = number
  default     = 2000
  description = "Max requests per 5-min window per IP (app-level limits are stricter)."
}

provider "aws" {
  region = var.region
}

locals {
  name_prefix = "tzir-${var.environment}"
}

# ---------------------------------------------------------------------------
# Web ACL
# ---------------------------------------------------------------------------
resource "aws_wafv2_web_acl" "api" {
  name        = "${local.name_prefix}-api-waf"
  description = "WAF for TZIR Delivery API (managed OWASP groups + rate rule)"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # 1) Managed Common RuleSet (OWASP top-10 baseline)
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tzirWafCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # 2) Managed SQL injection rule set
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tzirWafSqlInjection"
      sampled_requests_enabled   = true
    }
  }

  # 3) Managed XSS rule set
  rule {
    name     = "AWS-AWSManagedRulesXSSRuleSet"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesXSSRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tzirWafXss"
      sampled_requests_enabled   = true
    }
  }

  # 4) Managed IP reputation (AWS threat intel feeds)
  rule {
    name     = "AWS-AWSManagedRulesAmazonIpReputationList"
    priority = 40

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesAmazonIpReputationList"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tzirWafIpReputation"
      sampled_requests_enabled   = true
    }
  }

  # 5) Rate-based rule (per-IP burst shield)
  rule {
    name     = "TZIRRateBasedRule"
    priority = 50

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_ip
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "tzirWafRateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "tzirWafWebAcl"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = var.environment
    Project     = "tzir-delivery"
    ManagedBy   = "terraform"
  }
}

# ---------------------------------------------------------------------------
# Logging (CloudWatch)
# ---------------------------------------------------------------------------
resource "aws_wafv2_web_acl_logging_configuration" "api" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.api.arn

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/${local.name_prefix}-api"
  retention_in_days = 90
  tags = {
    Environment = var.environment
  }
}

# ---------------------------------------------------------------------------
# Association with the protected resource
# ---------------------------------------------------------------------------
resource "aws_wafv2_web_acl_association" "apprunner" {
  count        = var.apprunner_service_arn != "" ? 1 : 0
  resource_arn = var.apprunner_service_arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "web_acl_id" {
  value = aws_wafv2_web_acl.api.id
}

output "web_acl_arn" {
  value = aws_wafv2_web_acl.api.arn
}