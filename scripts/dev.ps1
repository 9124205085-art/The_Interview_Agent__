# Start the Next.js app from frontend/ (required after frontend/backend split).
Set-Location (Join-Path $PSScriptRoot ".." "frontend")
npm run dev
