#!/bin/bash

# Deploy Static Pages to Vercel
# Deploys all shared pages from public/ as a static site
# Usage: ./deploy-vercel.sh [--preview]
#
# Pages deployed: /submit, /moderate, /display, /queue, /history, /test, /checker
# Each page auto-detects the Hub URL via hub-connect.js + hub-config.json

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/public"

echo "🚀 Deploying static pages to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to public directory
cd "$PUBLIC_DIR"

echo "📦 Deploying static files from: $PUBLIC_DIR"
echo ""

# Deploy to Vercel
if [ "$1" == "--preview" ]; then
    echo "📋 Creating preview deployment..."
    vercel deploy
else
    echo "🌐 Deploying to production..."
    vercel deploy --prod
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Hub URL auto-detection:"
echo "   Pages read /hub-config.json to find the Hub's ngrok URL."
echo "   boot.sh automatically updates this file when ngrok starts."
echo "   To manually set: POST http://localhost:3000/api/config/mode"
echo '   Body: {"mode":"remote","publicUrl":"https://YOUR-NGROK-URL"}'
echo ""
