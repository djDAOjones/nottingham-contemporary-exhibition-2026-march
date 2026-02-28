#!/bin/bash

# Deploy Vercel App - Deploys the audience submission UI to Vercel
# Usage: ./deploy-vercel.sh [--preview]
#
# IMPORTANT: Before first deploy, you must set Root Directory in Vercel dashboard:
#   Settings → General → Root Directory → clear/empty (not "vercel-app")
#   This is because the CLI deploys from inside vercel-app/ already.

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
VERCEL_APP_DIR="$PROJECT_ROOT/vercel-app"

echo "🚀 Deploying Vercel App to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Navigate to vercel-app directory
cd "$VERCEL_APP_DIR"

echo "📦 Building and deploying from: $VERCEL_APP_DIR"
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
echo "📝 Next steps:"
echo "1. Copy the deployment URL from above"
echo "2. Set NEXT_PUBLIC_HUB_URL environment variable in Vercel dashboard"
echo "   → Settings → Environment Variables → NEXT_PUBLIC_HUB_URL = ws://YOUR-LAN-IP:3000"
echo "3. Generate QR codes pointing to the Vercel URL for audience access"
echo ""
