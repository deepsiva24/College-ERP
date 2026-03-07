variable "project_id" {
  description = "The ID of the GCP project"
  type        = string
}

variable "region" {
  description = "The default compute region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The default compute zone"
  type        = string
  default     = "us-central1-a"
}

variable "db_password" {
  description = "The password for the PostgreSQL database"
  type        = string
  sensitive   = true
}
