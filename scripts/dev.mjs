import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const processes=[['backend','dev'],['frontend','dev'],['backend','worker']].map(([folder,script])=>spawn(process.platform==='win32'?'npm.cmd':'npm',['run',script],{cwd:root+folder,stdio:'inherit',shell:process.platform==='win32',windowsHide:true}));
function stop(){for(const child of processes)child.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of processes)child.on('exit',code=>{if(code){stop();process.exitCode=code;}});
