import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {JSDOM} from 'jsdom';
import {createSeed} from '../src/lib/seed.ts';
import {STORAGE_KEY,dateKey} from '../src/lib/study.ts';
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost:3000'});
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLSelectElement','HTMLTextAreaElement','Event','MouseEvent','FormData','localStorage'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true};
dom.window.HTMLDialogElement.prototype.close=function(){this.open=false};
globalThis.fetch=async()=>({ok:true,json:async()=>({ai:false})});
const {createRoot}=await import('react-dom/client');
const {default:App}=await import('../src/App.tsx');
const {StudyProvider}=await import('../src/store.tsx');
const click=async element=>{assert.ok(element,'Expected an interactive element');await act(async()=>element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})))};
const button=(text,scope=document)=>[...scope.querySelectorAll('button')].find(b=>b.textContent.trim()===text||(b.closest('nav')&&b.textContent.trim().endsWith(text)));
const submit=async form=>{assert.ok(form,'Expected a form');await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})))};
const input=(name,value)=>{const field=document.querySelector(`[name="${name}"]`);assert.ok(field,`Expected ${name} input`);field.value=value;};
async function mount(seed=createSeed()){localStorage.clear();localStorage.setItem(STORAGE_KEY,JSON.stringify(seed));const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(StudyProvider,null,React.createElement(App))));return root}
async function unmount(root){await act(async()=>root.unmount())}
test('React backlog creates, edits, schedules and deletes nested tasks without losing sessions',async()=>{
 const root=await mount();try{
  await click(button('Study backlog'));await click(button('＋ Add learning goal'));
  input('title','Learn TypeScript');input('description','Write safer applications');input('due','2026-12-01');await submit(document.querySelector('dialog form'));
  assert.match(document.body.textContent,/Learn TypeScript/);
  await click(button('＋ Task'));input('title','Read narrowing chapter');input('due',dateKey(new Date()));await submit(document.querySelector('dialog form'));
  const task=JSON.parse(localStorage.getItem(STORAGE_KEY)).tasks[0];assert.equal(task.title,'Read narrowing chapter');
  const select=document.querySelector('.task-status');await act(async()=>{select.value='progress';select.dispatchEvent(new Event('change',{bubbles:true}))});
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).tasks[0].status,'progress');
  await click(button('Schedule'));assert.equal(document.querySelector('[name="title"]').value,'Read narrowing chapter');await submit(document.querySelector('dialog form'));
  let saved=JSON.parse(localStorage.getItem(STORAGE_KEY));assert.equal(saved.sessions.at(-1).task,task.id);assert.equal(saved.tasks[0].status,'progress');
  await click(button('Study calendar'));assert.match(document.body.textContent,/Due: Read narrowing chapter/);
  await click(button('Study backlog'));await click(button('Read narrowing chapter'));await click(button('Delete'));await click(button('Delete permanently'));
  saved=JSON.parse(localStorage.getItem(STORAGE_KEY));assert.equal(saved.tasks.length,0);assert.equal(saved.sessions.at(-1).task,'');assert.equal(saved.sessions.at(-1).title,'Read narrowing chapter');
 }finally{await unmount(root)}
});
test('legacy data survives React migration and all workspace screens render',async()=>{
 const legacy=createSeed();delete legacy.goals;delete legacy.tasks;legacy.resources[0].progress=5;const root=await mount(legacy);try{
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));assert.equal(saved.resources[0].progress,5);assert.deepEqual(saved.goals,[]);
  for(const name of ['Study backlog','My subjects','Books & courses','Study calendar','AI study coach','Overview']){await click(button(name));assert.ok(document.querySelector('h1'))}
  await click(button('Complete Type narrowing & inference')||document.querySelector('[aria-label="Complete Type narrowing & inference"]'));
  assert.equal(JSON.parse(localStorage.getItem(STORAGE_KEY)).sessions[0].done,true);
 }finally{await unmount(root)}
});
test('React escapes user titles and preserves malformed stored data',async()=>{
 const seed=createSeed();seed.goals=[{id:'g',title:'<script>alert(1)</script>',description:'',status:'backlog',priority:'normal',due:'',resource:'',subject:''}];let root=await mount(seed);try{await click(button('Study backlog'));assert.match(document.body.textContent,/<script>alert\(1\)<\/script>/);assert.equal(document.querySelectorAll('script').length,0)}finally{await unmount(root)}
 localStorage.setItem(STORAGE_KEY,'{invalid');root=createRoot(document.getElementById('root'));try{await act(async()=>root.render(React.createElement(StudyProvider,null,React.createElement(App))));assert.match(document.querySelector('[role="alert"]').textContent,/could not be loaded/);assert.equal(localStorage.getItem(STORAGE_KEY),'{invalid')}finally{await unmount(root)}
});
test('offline reading review saves notes, reflection and follow-up session',async()=>{
 const root=await mount();try{
  await click(button('Books & courses'));await click(button('✧ Chapter review'));
  const notes=document.querySelector('dialog textarea');await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(notes,'Type narrowing refines a union after checking a discriminant.');notes.dispatchEvent(new Event('input',{bubbles:true}))});
  await submit(document.querySelector('dialog form'));assert.match(document.body.textContent,/Offline reflection prompts/);
  const answer=[...document.querySelectorAll('dialog textarea')].at(-1);await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value').set.call(answer,'Check the kind property before using a union member.');answer.dispatchEvent(new Event('input',{bubbles:true}))});
  await submit([...document.querySelectorAll('dialog form')].at(-1));
  const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));assert.equal(saved.reviews.length,1);assert.match(saved.reviews[0].answer,/Check the kind/);assert.equal(saved.resources[0].notes.length,1);assert.match(saved.sessions.at(-1).title,/Recall chapter/);assert.equal(saved.sessions.at(-1).duration,15);
 }finally{await unmount(root)}
});
