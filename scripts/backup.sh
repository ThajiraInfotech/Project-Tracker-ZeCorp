#!/bin/bash
# zeecorp_backup.sh

# Configuration
BACKUP_DIR="/opt/zeecorp/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGO_CONTAINER="zeecorp_mongo"
UPLOADS_DIR="/opt/zeecorp/uploads"

echo "Starting Backup: $TIMESTAMP"

# Create backup directory
mkdir -p $BACKUP_DIR

# 1. MongoDB Backup
echo "Backing up MongoDB..."
docker exec $MONGO_CONTAINER mongodump --out /data/dump
# Copy dump from container to host
docker cp $MONGO_CONTAINER:/data/dump $BACKUP_DIR/mongo_$TIMESTAMP
# Zip it
tar -czf $BACKUP_DIR/db_backup_$TIMESTAMP.tar.gz -C $BACKUP_DIR mongo_$TIMESTAMP
# Cleanup raw dump
rm -rf $BACKUP_DIR/mongo_$TIMESTAMP
echo "MongoDB Backup Complete."

# 2. Uploads File Backup
echo "Backing up Uploads..."
tar -czf $BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz -C /opt/zeecorp uploads
echo "Uploads Backup Complete."

# 3. Retention Policy (Delete backups older than 7 days)
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +7 -delete
echo "Cleanup Complete."

echo "Backup Process Finished Successfully."
