import { spawn } from 'node:child_process';

const python = spawn(process.env.PYTHON || 'python3', ['api_server.py'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

const viteBin = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const vite = spawn(viteBin, [], {
  cwd: process.cwd(),
  env: { ...process.env, VITE_API_BASE_URL: '/api' },
  stdio: 'inherit',
  shell: process.platform === 'win32'
});

function stop(code = 0) {
  if (!python.killed) python.kill('SIGTERM');
  if (!vite.killed) vite.kill('SIGTERM');
  process.exit(code);
}

python.on('exit', code => {
  if (code && !vite.killed) stop(code);
});
vite.on('exit', code => stop(code || 0));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
