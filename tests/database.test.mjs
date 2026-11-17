import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {openStudyDatabase} from '../database.mjs';
import {createHandler} from '../server.mjs';
import {createSeed} from '../src/lib/seed.ts';
test('SQLite preserves the full workspace after closing and reopening the database',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'e-study-db-test-')),filename=join(directory,'study.sqlite');let db;
 try{
  const state=createSeed();state.resources[0].notes=[{chapter:1,text:'Important notes'}];state.reviews=[{id:'rev',resource:'r1',chapter:1,questions:'What?',answer:'An answer',confidence:'good',date:'2026-11-17'}];state.goals=[{id:'g',title:'Learn',description:'Goal',status:'backlog',priority:'high',due:'2026-12-01',subject:'ts',resource:'r1'}];state.tasks=[{...state.goals[0],id:'t',goal:'g'}];
  db=openStudyDatabase(filename);assert.equal(db.read(),null);const first=db.initialize(state);assert.equal(first.revision,1);
  const next=structuredClone(state);next.tasks[0].status='done';db.save(next,1);db.close();db=openStudyDatabase(filename);assert.deepEqual(db.read().state,next);assert.equal(db.read().revision,2);
 }finally{db?.close();await rm(directory,{recursive:true,force:true})}
});
test('initialization is idempotent and a stale revision cannot overwrite newer changes',()=>{
 const db=openStudyDatabase(':memory:');try{
  const state=createSeed();db.initialize(state);const newer=structuredClone(state);newer.resources[0].progress=6;db.save(newer,1);
  assert.equal(db.initialize(state).state.resources[0].progress,6);
  assert.throws(()=>db.save(state,1),error=>error.status===409);
  assert.equal(db.read().state.resources[0].progress,6);assert.equal(db.read().revision,2);
 }finally{db.close()}
});
test('invalid state is rejected without modifying the last saved workspace',()=>{
 const db=openStudyDatabase(':memory:');try{const state=createSeed();db.initialize(state);const invalid=structuredClone(state);invalid.sessions[0].time='99:99';assert.throws(()=>db.save(invalid,1),/invalid study session/);assert.throws(()=>db.save({...state,tasks:[{id:'x'}]},1),/Invalid study data/);assert.deepEqual(db.read().state,state);assert.equal(db.read().revision,1)}finally{db.close()}
});
function call(handler,{method='GET',url='/api/study',body,headers={}}={}){
 return new Promise((resolve,reject)=>{
  const req=Readable.from(body===undefined?[]:[typeof body==='string'?body:JSON.stringify(body)]);Object.assign(req,{method,url,headers:{host:'localhost:3000',...headers}});
  const res={statusCode:200,headers:{},setHeader(key,value){this.headers[key]=value},writeHead(code,headers={}){this.statusCode=code;Object.assign(this.headers,headers)},end(value){resolve({status:this.statusCode,headers:this.headers,data:value?JSON.parse(value):null})}};
  handler(req,res).catch(reject);
 });
}
test('study API initializes, loads and saves SQLite records with conflict and input errors',async()=>{
 const db=openStudyDatabase(':memory:'),handler=createHandler({database:db});try{
  assert.equal((await call(handler)).data.workspace,null);
  const state=createSeed();let response=await call(handler,{method:'POST',body:{state}});assert.equal(response.status,200);assert.equal(response.data.workspace.revision,1);
  state.resources[0].progress=7;response=await call(handler,{method:'PUT',body:{state,revision:1}});assert.equal(response.data.workspace.state.resources[0].progress,7);
  assert.equal((await call(handler,{method:'PUT',body:{state,revision:1}})).status,409);
  assert.equal((await call(handler,{method:'PUT',body:'not json'})).status,400);
  assert.equal((await call(handler,{method:'POST',body:{state:{}}})).status,400);
  assert.equal((await call(handler,{method:'DELETE'})).status,405);
  assert.equal((await call(handler)).headers['Cache-Control'],'no-store');
 }finally{db.close()}
});
test('study API rejects foreign hosts and cross-origin writes before touching the database',async()=>{
 const db=openStudyDatabase(':memory:'),handler=createHandler({database:db});try{
  assert.equal((await call(handler,{headers:{host:'attacker.example'}})).status,403);
  for(const method of ['POST','PUT'])assert.equal((await call(handler,{method,body:{state:createSeed()},headers:{origin:'https://attacker.example'}})).status,403);
  assert.equal(db.read(),null);
 }finally{db.close()}
});
