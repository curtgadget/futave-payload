#!/bin/bash

# Watch Player Sync Progress
# Refreshes every 30 seconds

while true; do
  clear
  date
  echo ""
  ./scripts/check-sync-simple.sh
  echo ""
  echo "Refreshing in 30 seconds... (Press Ctrl+C to stop)"
  sleep 30
done
