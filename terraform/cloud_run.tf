# Service Account for Cloud Run
resource "google_service_account" "run_sa" {
  account_id   = "erp-run-sa"
  display_name = "ERP Cloud Run Service Account"
}

# Enable Cloud Run Admin role for the SA (minimal permissions needed to run the service)
resource "google_project_iam_member" "run_sa_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.run_sa.email}"
}

# Backend Cloud Run Service
resource "google_cloud_run_v2_service" "backend" {
  name     = "school-erp-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      max_instance_count = 2 # Prevent excessive scaling charges
    }
    
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/erp-repo/backend:latest"
      
      env {
        name  = "DATABASE_URL"
        # We use the internal IP of the VM to connect securely across the VPC
        value = "postgresql://postgres:${var.db_password}@${google_compute_instance.db_instance.network_interface[0].network_ip}:5432/postgres"
      }
    }

    service_account = google_service_account.run_sa.email

    # Direct VPC Egress configuration
    vpc_access {
      network_interfaces {
        network    = google_compute_network.vpc_network.id
        subnetwork = google_compute_subnetwork.subnet.id
      }
      egress = "PRIVATE_RANGES_ONLY"
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image] # Don't replace service just because image tag changes
  }
}

# Allow Unauthenticated access to Backend
resource "google_cloud_run_service_iam_member" "backend_public" {
  location = google_cloud_run_v2_service.backend.location
  project  = google_cloud_run_v2_service.backend.project
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Frontend Cloud Run Service
resource "google_cloud_run_v2_service" "frontend" {
  name     = "school-erp-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      max_instance_count = 2
    }
    
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/erp-repo/frontend:latest"
      
      env {
        name  = "VITE_API_BASE_URL"
        value = google_cloud_run_v2_service.backend.uri # Point frontend to the dynamic backend URI
      }
    }

    service_account = google_service_account.run_sa.email
  }

  lifecycle {
     ignore_changes = [template[0].containers[0].image]
  }
}

# Allow Unauthenticated access to Frontend
resource "google_cloud_run_service_iam_member" "frontend_public" {
  location = google_cloud_run_v2_service.frontend.location
  project  = google_cloud_run_v2_service.frontend.project
  service  = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Output the URLs
output "backend_url" {
  value = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  value = google_cloud_run_v2_service.frontend.uri
}
