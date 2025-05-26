#!/bin/bash

# This script deploys the Edge Functions to Supabase

# Install Supabase CLI if not already installed
if ! command -v supabase &> /dev/null
then
    echo "Supabase CLI not found, installing..."
    # For macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install supabase/tap/supabase
    else
        # For other systems, recommend manual install
        echo "Please install Supabase CLI manually: https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

# Set environment variables
export SUPABASE_URL=https://ydnygntfkrleiseuciwq.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs

# Configure Supabase CLI
supabase init || true

# Set environment variables for the Edge Functions
cat > .env.edge << EOF
CINCEL_BASE_URL=https://sandbox.api.cincel.digital
CINCEL_API_KEY=cincel_sandbox_api_key_12345
CINCEL_WEBHOOK_SECRET=test_webhook_secret_54321
SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
EOF

# Login to Supabase
echo "Please log in to Supabase CLI when prompted..."
supabase login

# Deploy the Edge Functions
echo "Deploying Edge Functions..."
supabase functions deploy create-cincel-document --project-ref ydnygntfkrleiseuciwq
supabase functions deploy cincel-webhook --project-ref ydnygntfkrleiseuciwq
supabase functions deploy check-document-status --project-ref ydnygntfkrleiseuciwq

# Set environment variables for the deployed functions
echo "Setting environment variables for the Edge Functions..."
supabase secrets set --env-file .env.edge --project-ref ydnygntfkrleiseuciwq

echo "Deployment completed!" 