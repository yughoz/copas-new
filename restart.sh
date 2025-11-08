#!/bin/bash

# Quick restart script for Copas App

echo "🔄 Restarting Copas App..."

# Kill existing process
pm2 delete copas-app 2>/dev/null || true

# Wait a moment
sleep 2

# Start with updated configuration
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Show status
pm2 status

echo "✅ App restarted!"
echo "🌐 Check logs: pm2 logs copas-app"