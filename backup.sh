#!/bin/sh
# Backup de la data de Jarvis Platform
# Uso: ./backup.sh
# Restaurar: tar -xzf backup_FECHA.tar.gz -C /

BACKUP_FILE="jarvis-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
docker run --rm \
  -v jarvis-config-data:/data \
  -v "$(pwd)":/backup \
  alpine \
  tar -czf "/backup/$BACKUP_FILE" -C /data .

echo "Backup guardado en: $BACKUP_FILE"
