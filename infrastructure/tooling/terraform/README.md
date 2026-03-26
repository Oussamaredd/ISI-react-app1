# Terraform Compatibility Stub

This directory is the current EcoTrack Terraform compatibility point.

Current scope:

- Docker-provider only
- no cloud resources
- no remote state backend
- no multi-environment Terraform workspaces

Why it exists:

- preserve a future-compatible IaC entry point for later platform expansion
- keep the current monolith deployment baseline honest about what is and is not repo-owned today
- avoid inventing AWS/Azure/Kubernetes infrastructure that is outside the active deployment scope

Current M9 classification:

- `M9.2` remains `DEFERRED_PLATFORM`
- the supported deployment path is Cloudflare Pages + Render + Neon, documented in `docs/runbooks/DEPLOYMENT_PLATFORM_ROLLOUT_PLAN.md`

Validation:

```bash
terraform fmt -check
terraform validate
```

Run those commands only when Terraform is installed on the validating machine.
