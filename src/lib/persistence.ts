import type {StudyState} from '../types';
import {migrateState,STORAGE_KEY} from './study';
import {createSeed} from './seed';
export const MIGRATION_BACKUP_KEY='e-study-v1-migration-backup';
interface Workspace {state:StudyState;revision:number;updatedAt:string}
type Fetcher=typeof fetch;
export class PersistenceError extends Error {constructor(message:string,public conflict=false){super(message)}}
async function request(fetcher:Fetcher,method:string,body?:unknown):Promise<Workspace|null>{
 const response=await fetcher('/api/study',{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await response.json();
 if(!response.ok)throw new PersistenceError(data.error||'The server could not save study data.',response.status===409);
 return data.workspace;
}
export class WorkspaceClient {
 private queue:Promise<void>=Promise.resolve();
 private failure:unknown=null;
 constructor(private revision:number,private fetcher:Fetcher=fetch){}
 save(state:StudyState):Promise<void>{
  const task=this.queue.then(async()=>{
   if(this.failure)throw this.failure;
   const workspace=await request(this.fetcher,'PUT',{state,revision:this.revision});
   if(!workspace)throw new Error('The server returned no saved workspace.');
   this.revision=workspace.revision;
  });
  this.queue=task.catch(error=>{this.failure=error});return task;
 }
 retry(state:StudyState){this.queue=this.queue.then(()=>{if(this.failure instanceof PersistenceError&&this.failure.conflict)throw this.failure;this.failure=null});return this.save(state)}
}
export async function loadWorkspace(storage:Storage,fetcher:Fetcher=fetch){
 let workspace=await request(fetcher,'GET');
 if(!workspace){
  let raw:string|null=null;
  try{raw=storage.getItem(STORAGE_KEY)}catch{throw Error('Browser storage is unavailable. Allow storage access so existing records can be checked before initializing SQLite.');}
  let state:StudyState;
  try{state=raw?migrateState(JSON.parse(raw)):createSeed()}catch{throw Error('Saved browser data could not be loaded. It has been left untouched. Restore the browser data before retrying migration.');}
  if(raw){try{if(!storage.getItem(MIGRATION_BACKUP_KEY))storage.setItem(MIGRATION_BACKUP_KEY,raw)}catch{throw Error('The browser backup could not be saved. Free browser storage before retrying migration.');}}
  workspace=await request(fetcher,'POST',{state});
 }
 if(!workspace)throw Error('The server returned no study workspace.');
 return {state:migrateState(workspace.state),client:new WorkspaceClient(workspace.revision,fetcher)};
}
