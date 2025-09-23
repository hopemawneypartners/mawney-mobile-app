#!/bin/bash

echo "🚀 Starting Mawney Partners App..."

# Clear any existing processes
pkill -f "expo start" || true
pkill -f "Metro" || true

# Wait a moment
sleep 2

# Start the app with local network access
echo "📱 Starting Expo development server..."
npx expo start --lan --clear

echo "✅ App should now be running!"
echo "📱 Scan the QR code with Expo Go app"
echo "🌐 Or visit http://localhost:8081 for web version"

