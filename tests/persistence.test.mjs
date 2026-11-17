import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspace,WorkspaceClient,MIGRATION_BACKUP_KEY} from '../src/lib/persistence.ts';
import {STORAGE_KEY} from '../src/lib/study.ts';
import {createSeed} from '../src/lib/seed.ts';
function storage(raw){const values=new Map(raw===undefined?[]:[[STORAGE_KEY,raw]]);return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}}
const response=(workspace,status=200,error='Conflict')=>({ok:status===200,status,json:async()=>({workspace,error})});
test('first load imports browser data with a separate immutable migration backup',async()=>{
 const legacy=createSeed();delete legacy.goals;delete legacy.tasks;legacy.resources[0].progress=5;const raw=JSON.stringify(legacy),local=storage(raw);let saved;
 const result=await loadWorkspace(local,async(_,options)=>{if(options.method==='GET')return response(null);saved=JSON.parse(options.body).state;return response({state:saved,revision:1})});
 assert.equal(result.state.resources[0].progress,5);assert.deepEqual(saved.goals,[]);assert.equal(local.getItem(MIGRATION_BACKUP_KEY),raw);assert.equal(local.getItem(STORAGE_KEY),raw);
});
test('existing server data takes precedence over a stale browser copy',async()=>{
 const local=storage('malformed old browser value'),server=createSeed();server.resources[0].progress=7;let calls=0;
 const result=await loadWorkspace(local,async(_,options)=>{calls++;assert.equal(options.method,'GET');return response({state:server,revision:9})});
 assert.equal(result.state.resources[0].progress,7);assert.equal(calls,1);assert.equal(local.getItem(STORAGE_KEY),'malformed old browser value');
});
test('malformed browser data or failed server load never initializes with sample data',async()=>{
 for(const raw of ['{invalid',JSON.stringify({subjects:[]})]){let calls=0;const local=storage(raw);await assert.rejects(loadWorkspace(local,async()=>{calls++;return response(null)}),/could not be loaded/);assert.equal(calls,1);assert.equal(local.getItem(STORAGE_KEY),raw)}
 await assert.rejects(loadWorkspace(storage(),async()=>{throw Error('Server offline')}),/Server offline/);
});
test('queued saves use sequential revisions even when responses are delayed',async()=>{
 const revisions=[],client=new WorkspaceClient(4,async(_,options)=>{const body=JSON.parse(options.body);revisions.push(body.revision);await new Promise(resolve=>setTimeout(resolve,5));return response({state:body.state,revision:body.revision+1})});
 await Promise.all([client.save(createSeed()),client.save(createSeed()),client.save(createSeed())]);assert.deepEqual(revisions,[4,5,6]);
});
test('conflict stops later queued saves and retry cannot silently overwrite',async()=>{
 let calls=0;const client=new WorkspaceClient(1,async()=>{calls++;return response(null,409,'Changed in another tab')});
 const results=await Promise.allSettled([client.save(createSeed()),client.save(createSeed())]);assert.ok(results.every(r=>r.status==='rejected'));await assert.rejects(client.retry(createSeed()),/Changed in another tab/);assert.equal(calls,1);
});
test('a transient save failure can retry the latest state with its original revision',async()=>{
 let fail=true;const revisions=[],client=new WorkspaceClient(2,async(_,options)=>{revisions.push(JSON.parse(options.body).revision);if(fail)throw Error('Network down');return response({state:createSeed(),revision:3})});
 await assert.rejects(client.save(createSeed()),/Network down/);fail=false;await client.retry(createSeed());assert.deepEqual(revisions,[2,2]);
});
