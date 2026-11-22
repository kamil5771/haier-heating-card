import { copyFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
mkdirSync('dist', { recursive: true });
execFileSync(process.execPath, ['--check', 'src/haier-heating-card.js'], { stdio: 'inherit' });
copyFileSync('src/haier-heating-card.js', 'dist/haier-heating-card.js');
console.log('Built dist/haier-heating-card.js');
