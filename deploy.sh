#!/bin/bash

# Production Deployment Script for Copas App

echo "🚀 Starting Copas App Deployment..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v)
echo "Node.js version: $node_version"

if ! [[ $node_version =~ ^v1[8-9]|v[2-9][0-9] ]]; then
    echo "❌ Node.js version 18 or higher required"
    exit 1
fi

# Install dependencies
echo "📦 Installing production dependencies..."
npm ci --production

# Build the application
echo "🔨 Building Next.js application..."
npm run build

# Set production environment
export NODE_ENV=production

# Start with PM2 if available, otherwise use node directly
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting with PM2 process manager..."
    pm2 delete copas-app 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 logs copas-app --lines 20
else
    echo "🏃‍♂️ Starting with Node.js directly..."
    nohup node server.js > app.log 2>&1 &
    echo "App started in background. PID: $!"
    echo "To stop: kill $!"
    echo "To view logs: tail -f app.log"
fi

echo "✅ Deployment complete!"
echo "🌐 App should be available at: http://localhost:3000"