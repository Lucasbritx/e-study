import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runProcess} from '../codex.mjs';
function fakeProcess(callback){return (bin,args,options)=>{const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};queueMicrotask(()=>callback(child,{bin,args,options}));return child}}
test('CLI inputs go to stdin with no shell interpolation',async()=>{const payload='$(touch unexpected); `echo unsafe`';let seen='';const output=await runProcess(['exec','-'],{input:payload,spawnImpl:fakeProcess((child,{options,args})=>{assert.equal(options.shell,false);assert.deepEqual(args,['exec','-']);seen=child.stdin.read().toString();child.stdout.write('Tutor response');child.emit('close',0)})});assert.equal(seen,payload);assert.equal(output,'Tutor response')});
test('CLI exit failures hide raw diagnostics',async()=>{await assert.rejects(runProcess([],{spawnImpl:fakeProcess(child=>{child.stderr.write('private-account-details');child.emit('close',1)})}),error=>!error.message.includes('private-account-details')&&error.message.includes('login status'))});
test('missing executable returns actionable failure',async()=>{await assert.rejects(runProcess([],{spawnImpl:fakeProcess(child=>child.emit('error',Error('ENOENT')))}),/Install Codex/)});
