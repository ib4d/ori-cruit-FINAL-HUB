#!/bin/bash
set -e
echo "── Deploy started: $(date) ──"
cd /opt/ori-cruit-hub
git pull origin main
docker compose up -d --build
docker image prune -f
echo "── Deploy complete: $(date) ──"
docker compose ps
