variable "db_user" {
  type        = string
  default     = "postgres"
  description = "Database username used by the application"
}

variable "db_password" {
  type        = string
  default     = "changeme"
  description = "Database password used by the application"
  sensitive   = true
}

variable "db_host" {
  type        = string
  default     = "localhost"
  description = "Hostname for the PostgreSQL instance"
}

variable "db_port" {
  type        = number
  default     = 5432
  description = "Port for the PostgreSQL instance"
}

variable "db_name" {
  type        = string
  default     = "ticketdb"
  description = "Database name for the application"
}
