import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {StudyState} from './types';
import {STORAGE_KEY} from './lib/study';
import {loadWorkspace,WorkspaceClient} from './lib/persistence';
type Update=(change:(state:StudyState)=>StudyState)=>void;
const Context=createContext<{state:StudyState;update:Update;storageError:string}|null>(null);
export function StudyProvider({children}:{children:ReactNode}){
 const [state,setState]=useState<StudyState|null>(null),[loadError,setLoadError]=useState(''),[storageError,setStorageError]=useState(''),[attempt,setAttempt]=useState(0),[saving,setSaving]=useState(false);
 const client=useRef<WorkspaceClient|null>(null),lastQueued=useRef<StudyState|null>(null),latest=useRef<StudyState|null>(null),pending=useRef(0),mounted=useRef(false);
 const describe=(error:unknown)=>error instanceof Error?error.message:'The study server is unavailable.';
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{let canceled=false;setLoadError('');loadWorkspace(localStorage).then(result=>{
  if(canceled)return;client.current=result.client;lastQueued.current=result.state;latest.current=result.state;setState(result.state);
 }).catch(error=>{if(!canceled)setLoadError(describe(error))});return()=>{canceled=true}},[attempt]);
 const persist=useCallback((next:StudyState,retry=false)=>{
  const engine=client.current;if(!engine)return;
  pending.current++;setSaving(true);
  let cacheError='';try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next))}catch{cacheError='The browser backup could not be updated.';}
  (retry?engine.retry(next):engine.save(next)).then(()=>{if(mounted.current)setStorageError(cacheError)}).catch(error=>{if(mounted.current)setStorageError(`${describe(error)} Keep this page open. ${cacheError||'A browser copy of your changes is retained.'}`)}).finally(()=>{pending.current--;if(mounted.current&&pending.current===0)setSaving(false)});
 },[]);
 useEffect(()=>{if(!state||state===lastQueued.current)return;lastQueued.current=state;persist(state)},[state,persist]);
 useEffect(()=>{const beforeUnload=(event:BeforeUnloadEvent)=>{if(pending.current||storageError){event.preventDefault();event.returnValue=''}};window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload)},[storageError]);
 const update:Update=change=>setState(current=>{if(!current)return current;const next=change(current);latest.current=next;return next});
 if(!state)return <main className="content"><h1>e-study</h1>{loadError?<div className="notice" role="alert">{loadError}<div className="actions"><button className="btn" onClick={()=>setAttempt(n=>n+1)}>Retry loading</button></div></div>:<p role="status">Loading your study workspace…</p>}</main>;
 return <Context.Provider value={{state,update,storageError}}><div className="persistence-status" role="status">{saving?'Saving to SQLite…':storageError?'Changes need attention':'Saved to SQLite'}{storageError&&<button className="text-btn" onClick={()=>{if(latest.current)persist(latest.current,true)}}>Retry save</button>}</div>{children}</Context.Provider>;
}
export function useStudy(){const value=useContext(Context);if(!value)throw Error('StudyProvider is required');return value}
