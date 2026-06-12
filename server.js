// Render deployment entry point
// Render defaults to running `node server.js` if the Start Command is not configured.
// This script automatically redirects the execution to the compiled backend in the monorepo.

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DriftIQ Backend for Render deployment...');

// Path to the backend workspace
const backendDir = path.join(__dirname, 'apps', 'backend');

// Spawn the production start command from within the backend directory
const child = spawn('npm', ['run', 'start:prod'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});

child.on('error', (err) => {
  console.error('❌ Failed to start backend:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Backend process exited with code ${code}`);
  process.exit(code || 0);
});
