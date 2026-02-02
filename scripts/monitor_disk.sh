#!/bin/bash

# Configuration
THRESHOLD_WARNING=60
THRESHOLD_ALERT=70
THRESHOLD_CRITICAL=80
EMAIL="admin@zeecorp.com" # Replace with actual email
SLACK_WEBHOOK_URL="" # Optional: Add Slack/Discord webhook here

# Get current disk usage percentage for root partition /
CURRENT_USAGE=$(df / | grep / | awk '{ print $5 }' | sed 's/%//g')

echo "Current Disk Usage: $CURRENT_USAGE%"

if [ "$CURRENT_USAGE" -ge "$THRESHOLD_CRITICAL" ]; then
    MESSAGE="CRITICAL ALERT: VPS Disk usage is at ${CURRENT_USAGE}%. IMMEDIATE ACTION REQUIRED. Uploads may fail."
    echo $MESSAGE
    # Example: Send alert to Backend API to notify admin dashboard
    # curl -X POST http://localhost:5000/api/system/alert -d "{\"message\": \"$MESSAGE\", \"level\": \"critical\"}"
    
elif [ "$CURRENT_USAGE" -ge "$THRESHOLD_ALERT" ]; then
    MESSAGE="ALERT: VPS Disk usage is at ${CURRENT_USAGE}%. Plan cleanup or storage upgrade soon."
    echo $MESSAGE
    
elif [ "$CURRENT_USAGE" -ge "$THRESHOLD_WARNING" ]; then
    MESSAGE="WARNING: VPS Disk usage is at ${CURRENT_USAGE}%. Monitor closely."
    echo $MESSAGE
fi
