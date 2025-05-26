/**
 * Script to update .env file with Supabase credentials
 * Run with: node update-env.js
 */
const fs = require('fs');
const path = require('path');

// Define the environment variables
const envVars = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ydnygntfkrleiseuciwq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs
SUPABASE_URL=https://ydnygntfkrleiseuciwq.supabase.co

# CINCEL API Configuration
CINCEL_BASE_URL=https://sandbox.api.cincel.digital
CINCEL_API_KEY=your_cincel_api_key
CINCEL_WEBHOOK_SECRET=your_webhook_secret
`;

// Path to the .env file
const envPath = path.join(__dirname, '.env');

// Write the environment variables to the .env file
fs.writeFileSync(envPath, envVars);

console.log('.env file updated successfully with Supabase credentials!'); 