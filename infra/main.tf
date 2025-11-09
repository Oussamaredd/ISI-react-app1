provider "docker" {}

# Create Docker network (so containers can talk to each other)
resource "docker_network" "app_network" {
  name = "react_app1_network"
}

# Create persistent volume for PostgreSQL
resource "docker_volume" "pgdata" {
  name = "ticket_pgdata"
}

# PostgreSQL Database container
resource "docker_container" "ticket_db" {
  name  = "ticket_db"
  image = "postgres:15"

  env = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=postgres",
    "POSTGRES_DB=ticketdb"
  ]

  
  # Persist database data here
  mounts {
    target = "/var/lib/postgresql/data"
    source = docker_volume.pgdata.name
    type   = "volume"
  }

  # Optional: initialize schema only if volume is new
  # Comment this out once DB is initialized
  #mounts {
  #  target = "/docker-entrypoint-initdb.d/init.sql"
   # source = abspath("${path.module}/init.sql")
   # type   = "bind"
  #}

  networks_advanced {
    name = docker_network.app_network.name
  }

  ports {
    internal = 5432
    external = 5432
  }
}

# Backend container (Node.js / Express)
resource "docker_container" "backend" {
  name  = "ticket_backend"
  image = "react-app1-backend"

  env = [
    "DB_HOST=ticket_db",
    "DB_USER=postgres",
    "DB_PASSWORD=postgres",
    "DB_NAME=ticketdb",
    "DB_PORT=5432"
  ]

  networks_advanced {
    name = docker_network.app_network.name
  }

  ports {
    internal = 5000
    external = 5000
  }

  depends_on = [docker_container.ticket_db]
}

# Frontend container (React)
resource "docker_container" "frontend" {
  name  = "ticket_frontend"
  image = "react-app1-frontend"

  networks_advanced {
    name = docker_network.app_network.name
  }

  ports {
    internal = 80
    external = 3000
  }

  depends_on = [docker_container.backend]
}
