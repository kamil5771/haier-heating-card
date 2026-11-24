import {copyFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['--check','src/haier-heating-card.js'],{stdio:'inherit'});
mkdirSync('dist',{recursive:true});
copyFileSync('src/haier-heating-card.js','dist/haier-heating-card.js');
