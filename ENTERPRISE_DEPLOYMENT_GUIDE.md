# Enterprise Deployment Guide (Zeecorp Phase-1)

**Target Infrastructure**: KVM 2 VPS (Ubuntu 22.04 LTS)
**Architecture**: Single-Node Docker Swarm (Compose)

## 1. Initial VPS Setup
Login to your fresh VPS via SSH:
```bash
ssh root@your-vps-ip
```

### Install Docker & Dependencies
Execute these commands to prepare the server:
```bash
# Update System
apt update && apt upgrade -y

# Install Docker
apt install docker.io docker-compose -y

# Enable Docker
systemctl enable docker
systemctl start docker

# Create Project Directories (As per Plan)
mkdir -p /opt/zeecorp/mongo_data
mkdir -p /opt/zeecorp/uploads
mkdir -p /opt/zeecorp/backups
mkdir -p /opt/zeecorp/scripts

# Set Permissions
chown -R 1000:1000 /opt/zeecorp/uploads
```

## 2. Deploy Code
You can clone your repository or upload the files manually.
Assuming you upload the code to `/opt/zeecorp/app`:

```bash
cd /opt/zeecorp/app
```

### Configure Environment
Create the `.env` file in `backend/.env`:
```bash
nano backend/.env
```
Paste your production variables:
```env
PORT=5000
MONGODB_URI=mongodb://mongodb:27017/zeecorp_db
REDIS_HOST=redis
REDIS_PORT=6379
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
JWT_SECRET=your_complex_secret
FRONTEND_URL=http://your-domain.com
```

## 3. Launch Application
Run the Docker containers:
```bash
# Build and Start in Background
docker-compose up -d --build
```

**Verify Status**:
```bash
docker-compose ps
```
You should see 4 services (frontend, backend, mongodb, redis) with Status `Up`.

## 4. Automation & Maintenance

### Setup Disk Monitoring (Every Hour)
1. Copy the script:
```bash
cp scripts/monitor_disk.sh /opt/zeecorp/scripts/
chmod +x /opt/zeecorp/scripts/monitor_disk.sh
```
2. Add to Crontab:
```bash
crontab -e
# Add line:
0 * * * * /opt/zeecorp/scripts/monitor_disk.sh >> /var/log/zeecorp_monitor.log 2>&1
```

### Setup Daily Backups (Every Night at 3 AM)
1. Copy the script:
```bash
cp scripts/backup.sh /opt/zeecorp/scripts/
chmod +x /opt/zeecorp/scripts/backup.sh
```
2. Add to Crontab:
```bash
# Add line:
0 3 * * * /opt/zeecorp/scripts/backup.sh >> /var/log/zeecorp_backup.log 2>&1
```

## 5. Migration Triggers (Phase 2)
Move to Phase 2 (Object Storage / Managed DB) if:
1.  **Disk Usage** consistently stays above **70%**.
2.  **Uploads Folder** exceeds **50 GB**.
3.  **Active Users** exceed **100 concurrent**.

## 6. Troubleshooting
- **View Logs**: `docker-compose logs -f backend`
- **Restart App**: `docker-compose restart backend`
- **Full Reset**: `docker-compose down && docker-compose up -d`
