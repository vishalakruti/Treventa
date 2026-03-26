#!/bin/bash
# Wrapper script to run Vite ignoring expo-specific arguments
# This allows the supervisor to run `yarn expo start --tunnel` 
# while actually running Vite

cd /app/frontend
exec npm run dev
