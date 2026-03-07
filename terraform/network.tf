# Custom VPC Network
resource "google_compute_network" "vpc_network" {
  name                    = "school-erp-vpc"
  auto_create_subnetworks = false
}

# Subnet for our resources
resource "google_compute_subnetwork" "subnet" {
  name          = "school-erp-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id
}

# Firewall Rule: Allow internal traffic (Cloud Run to Database)
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.1.0/24"]
}

# Firewall Rule: Allow SSH via Identity-Aware Proxy (IAP)
# This is much more secure than allowing SSH from 0.0.0.0/0
resource "google_compute_firewall" "allow_ssh_iap" {
  name    = "allow-ssh-iap"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
}
