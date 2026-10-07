#!/bin/sh
set -eu
umask 077
mkdir -p /backups
while true; do
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  pending="/backups/transmetro-$stamp.sql.partial"
  if mariadb-dump --host=db --user=transmetro --single-transaction --skip-lock-tables transmetro_db > "$pending"; then
    mv "$pending" "/backups/transmetro-$stamp.sql"
    gzip "/backups/transmetro-$stamp.sql"
    find /backups -name 'transmetro-*.sql.gz' -type f -mtime +14 -delete
    echo "Respaldo terminado: $stamp"
  else
    rm -f "$pending"
    echo 'Falló el respaldo de MariaDB.' >&2
  fi
  sleep 86400
done
