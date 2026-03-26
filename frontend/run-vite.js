// Wrapper to run Vite, ignoring expo-specific command line arguments
// This allows the supervisor to run `yarn expo start --tunnel` 
// while actually running Vite

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run vite directly, ignoring any arguments passed
const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

vite.on('close', (code) => {
  process.exit(code);
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});
