output "frontend_url" {
  value = "http://localhost:3000"
  description = "URL to access the frontend"
}

output "backend_url" {
  value = "http://localhost:5000/api/tickets"
  description = "URL to access the backend API"
}

output "database_url" {
  value       = "postgres://${var.db_user}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}"
  description = "Connection string for PostgreSQL database"
  sensitive   = true
}
