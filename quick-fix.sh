#!/bin/bash

echo "🚨 QUICK FIX FOR STATIC FILES ISSUE"
echo "=================================="

# Kill all existing processes
echo "🛑 Stopping existing processes..."
pm2 delete copas-app 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true

# Wait for processes to stop
sleep 3

# Try Option 1: Built-in Next.js server (recommended)
echo "🔄 Option 1: Starting with built-in Next.js server..."
NODE_ENV=production node_modules/.bin/next start -H 0.0.0.0 -p 3000 &

# Wait a moment for startup
sleep 5

# Test if it's working
echo "🧪 Testing localhost connection..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Option 1 successful! App is running on port 3000"
    echo "🌐 Access at: http://31.56.56.39:3000"
    echo ""
    echo "📋 To stop this server:"
    echo "pkill -f 'next start'"
    echo ""
    echo "📋 To monitor logs:"
    echo "tail -f ~/.pm2/logs/copas-app-out.log 2>/dev/null || echo 'No PM2 logs for this option'"
else
    echo "❌ Option 1 failed, trying Option 2..."

    # Kill the failed process
    pkill -f "next start" 2>/dev/null || true
    sleep 2

    # Try Option 2: Custom server
    echo "🔄 Option 2: Starting with custom server..."
    NODE_ENV=production node server.js &

    sleep 5

    # Test again
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        echo "✅ Option 2 successful! App is running on port 3000"
        echo "🌐 Access at: http://31.56.56.39:3000"
        echo ""
        echo "📋 To stop this server:"
        echo "pkill -f 'node server.js'"
    else
        echo "❌ Both options failed. Checking for errors..."
        echo "🔍 Checking if port 3000 is available:"
        netstat -tlnp | grep 3000 || echo "Port 3000 is available"
        echo ""
        echo "🔍 Checking Node.js processes:"
        ps aux | grep -E "(next|node)" | grep -v grep || echo "No relevant processes found"
    fi
fi

echo ""
echo "🌐 Try accessing: http://31.56.56.39:3000"
echo "📱 Check browser console for any remaining errors"