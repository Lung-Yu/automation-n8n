#!/bin/bash

# Go to the project root directory
cd "$(dirname "$0")/.."

# Set default environment variables if not already set
export N8N_HOST=${N8N_HOST:-localhost}
export N8N_PROTOCOL=${N8N_PROTOCOL:-http}
export N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY:-your-secret-key}

# Start n8n using docker-compose
docker-compose up -d

echo "N8N is starting up..."
echo "You can access it at ${N8N_PROTOCOL}://${N8N_HOST}:5678"
