output "frontend_url" {
  value = "http://localhost:3000"
  description = "URL to access the frontend"
}

output "backend_url" {
  value = "http://localhost:5000/api/tickets"
  description = "URL to access the backend API"
}

output "database_url" {
  value = "postgres://postgres:postgres@localhost:5432/ticketdb"
  description = "Connection string for PostgreSQL database"
}
