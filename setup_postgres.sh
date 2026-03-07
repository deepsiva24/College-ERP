#!/bin/bash
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/15/main/postgresql.conf
sudo bash -c 'echo "host all all 10.0.1.0/24 md5" >> /etc/postgresql/15/main/pg_hba.conf'
sudo bash -c 'echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/15/main/pg_hba.conf'
sudo bash -c 'echo "host all all ::1/128 md5" >> /etc/postgresql/15/main/pg_hba.conf'
sudo systemctl restart postgresql
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'erp-secure-production-db-password-2026';"
