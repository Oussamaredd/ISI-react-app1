# Docker-only Terraform workspace for EcoTrack.
#
# This directory intentionally avoids AWS/S3 scaffolding until cloud IaC is in scope.
# Keep this stack aligned with the local Docker workflow defined in:
# - infrastructure/docker-compose.yml
# - infrastructure/environments/.env.docker

# Example resources can be added here later when we decide to manage
# Docker networks/volumes/images via Terraform.
