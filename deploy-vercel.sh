#!/bin/bash
# ==========================================
# DEPLOY TO VERCEL (Frontend)
# ==========================================
# Usage: ./deploy-vercel.sh
# Prerequisites: Vercel CLI installed (npm i -g vercel)

echo "🚀 Deploying Frontend to Vercel..."

# Verify we're in the right directory
if [ ! -f "tracker_live.html" ]; then
  echo "❌ Error: tracker_live.html not found"
  echo "Run this script from: C:\Users\inbou\victor-ia-tracker"
  exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "⚠️ Vercel CLI not installed. Installing..."
  npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "📋 Vercel Login..."
vercel login

# Deploy
echo "📦 Deploying to Vercel..."
vercel --prod

# Get the deployment URL
VERCEL_URL=$(vercel --prod --confirm 2>&1 | grep -oP 'https://[^ ]+')

echo ""
echo "✅ Deployment Complete!"
echo "🌐 Live at: https://tracker.victor-ia.xyz/"
echo "   (or: $VERCEL_URL)"
echo ""
echo "📝 Next steps:"
echo "   1. Start API server: node api-endpoints.js"
echo "   2. Configure Python collector"
echo "   3. Setup Task Scheduler"
echo ""