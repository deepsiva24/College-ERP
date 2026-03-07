# Service Account for the Database VM
resource "google_service_account" "db_sa" {
  account_id   = "erp-db-sa"
  display_name = "ERP Database VM Service Account"
}

# Add roles to the DB Service Account
resource "google_project_iam_member" "db_sa_roles" {
  project = var.project_id
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])
  role   = each.key
  member = "serviceAccount:${google_service_account.db_sa.email}"
}

# The Compute Engine Instance (Database)
resource "google_compute_instance" "db_instance" {
  name         = "school-erp-db"
  machine_type = "e2-micro" # Always Free Tier eligible
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 30 # Up to 30GB Standard PD is free tier
      type  = "pd-standard"
    }
  }

  network_interface {
    network    = google_compute_network.vpc_network.id
    subnetwork = google_compute_subnetwork.subnet.id

    # Ephemeral public IP to allow outbound internet access for updates
    # This costs a small amount but simplifies setup vs. Cloud NAT
    access_config {}
  }

  service_account {
    email  = google_service_account.db_sa.email
    scopes = ["cloud-platform"]
  }

  tags = ["erp-db"]

  # Startup script to install PostgreSQL and configure it for remote access
  metadata_startup_script = <<-EOF
    #!/bin/bash
    
    # Install PostgreSQL
    apt-get update
    apt-get install -y postgresql postgresql-contrib

    # Start and enable the service
    systemctl start postgresql
    systemctl enable postgresql

    # Configure PostgreSQL for remote access
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/15/main/postgresql.conf
    
    # Allow connections from the VPC subnet
    echo "host all all 10.0.1.0/24 md5" >> /etc/postgresql/15/main/pg_hba.conf
    
    # Restart to apply configuration
    systemctl restart postgresql

    # Create the default postgres user and set the password
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '${var.db_password}';"
  EOF
}
