#!/bin/bash

# Simple Player Sync Status Checker
# Usage: ./scripts/check-sync-simple.sh

echo ""
echo "📊 Player Sync Status Check"
echo "============================"
echo ""

# Check if process is running
PROCESS=$(ps aux | grep -E "syncPlayers|payload jobs:run" | grep -v grep)
if [ -n "$PROCESS" ]; then
  echo "✅ Player sync process IS RUNNING"
  echo ""
  echo "$PROCESS"
else
  echo "⏸️  Player sync process NOT RUNNING"
fi

echo ""
echo "📊 Checkpoint Status (from MongoDB):"
echo ""

# Query MongoDB for checkpoint
mongosh futave-backend --quiet --eval '
  const checkpoint = db.getCollection("player-sync-checkpoints").findOne({ syncId: "player-sync-main" });

  if (!checkpoint) {
    print("❌ No checkpoint found");
  } else {
    const now = new Date();
    const lastSync = new Date(checkpoint.lastSyncTime);
    const minutesAgo = Math.floor((now - lastSync) / 1000 / 60);

    print("Mode:", checkpoint.mode);
    print("Current Page:", checkpoint.currentPage.toLocaleString());
    print("Players Processed:", checkpoint.playersProcessed.toLocaleString());
    print("Last Updated:", minutesAgo, "minutes ago");
    print("");
    print("Stats:");
    print("  Created:", checkpoint.stats.playersCreated.toLocaleString());
    print("  Updated:", checkpoint.stats.playersUpdated.toLocaleString());
    print("  Failed:", checkpoint.stats.playersFailed);
    print("  Pages Completed:", checkpoint.stats.pagesCompleted.toLocaleString());
    print("");

    if (minutesAgo < 2) {
      print("🔄 Sync appears to be ACTIVE (updated recently)");
    } else {
      print("⏸️  Sync appears PAUSED (last update", minutesAgo, "min ago)");
      print("");
      print("To resume:");
      print("NODE_OPTIONS=\"--expose-gc\" pnpm payload jobs:run syncPlayers 2");
    }

    if (checkpoint.totalPagesDiscovered) {
      const progress = ((checkpoint.currentPage / checkpoint.totalPagesDiscovered) * 100).toFixed(1);
      print("");
      print("Progress:", progress + "%", "(" + checkpoint.currentPage.toLocaleString(), "/", checkpoint.totalPagesDiscovered.toLocaleString(), "pages)");
    }
  }
'

echo ""
