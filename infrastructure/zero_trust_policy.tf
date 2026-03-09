# 🧱 Zero Trust Architecture Policy

# Global Trust Settings
resource "spiffe_server" "main" {
  cluster_id = "tzir-delivery-prod"
  trust_domain = "tzir.delivery"
}

# Identity Provisioning (SPIRE)
resource "spiffe_id" "backend" {
  spiffe_id = "spiffe://tzir.delivery/backend"
  selector  = ["docker:label:service=backend"]
  ttl       = "24h" # Max validity for identity tokens
}

resource "spiffe_id" "realtime_engine" {
  spiffe_id = "spiffe://tzir.delivery/realtime"
  selector  = ["docker:label:service=realtime"]
  ttl       = "24h"
}

# mTLS Enforcement (Service Mesh Layer)
# Note: This abstractly configures the sidecar proxies (Envoy/Istio)
resource "mesh_policy" "mtls_strict" {
  name = "default-strict-mtls"
  spec {
    mtls {
      mode = "STRICT" # No plain-text internal traffic
    }
  }
}

# Performance Optimized Connection Pooling
# mTLS overhead target <2ms per call
resource "envoy_cluster" "backend_to_realtime" {
  name = "realtime_engine_cluster"
  common_http_protocol_options {
    idle_timeout = "300s" # Keep connections alive
  }
  circuit_breakers {
    thresholds {
      max_connections = 1000
      max_requests    = 5000
    }
  }
}

# WAF (Web Application Firewall) Policy
# Initial: 48h Baseline in COUNT (Learning) Mode
resource "aws_wafv2_web_acl" "main" {
  name  = "tzir-delivery-api-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "tzirWafMetric"
    sampled_requests_enabled   = true
  }

  # OWASP Top 10 Rule Set
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      count {} # Learning mode: log but don't block
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "awsCommonRules"
      sampled_requests_enabled   = true
    }
  }
}

# RASP (Runtime Application Self-Protection) Policy
# Logic enforced via PyRASP middleware in backend code
resource "backend_security_policy" "rasp_config" {
  service = "backend"
  spec {
      enforce_integrity = true
      detect_debugging  = true
      detect_injection  = true
      action            = "LOG_ONLY" # Transition to BLOCK after 48h
  }
}
