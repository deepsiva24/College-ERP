# Enable required APIs

resource "google_project_service" "compute_api" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run_api" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam_api" {
  project            = var.project_id
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess_api" {
  project            = var.project_id
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

# Ensure APIs are enabled before any resources are provisioned
# This is a bit of a hack to force dependency on all standard resourcs
resource "time_sleep" "wait_for_apis" {
  depends_on = [
    google_project_service.compute_api,
    google_project_service.run_api,
    google_project_service.iam_api,
    google_project_service.vpcaccess_api
  ]
  
  create_duration = "30s"
}
