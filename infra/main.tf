terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {} # (later, optional)
}

# Cloud resources will go here later:
#
# - EC2 instance or ECS cluster
# - Security groups
# - Networking (VPC)
# - Cloud PostgreSQL (Neon / RDS)
# - Load balancer
