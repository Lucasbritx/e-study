import {createContext, useContext, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import type {StudyState} from './types';
import {migrateState,STORAGE_KEY} from './lib/study';
import {createSeed} from './lib/seed';
type Update=(change:(state:StudyState)=>StudyState)=>void;
const Context=createContext<{state:StudyState;update:Update;storageError:string}|null>(null);
export function StudyProvider({children}:{children:ReactNode}){
 const [initial]=useState(()=>{try{const raw=localStorage.getItem(STORAGE_KEY);return {state:raw?migrateState(JSON.parse(raw)):createSeed(),error:''}}catch{return {state:createSeed(),error:'Saved data could not be loaded. It has been left untouched. Reload after restoring your browser data.'}}});
 const [state,setState]=useState(initial.state),[storageError,setStorageError]=useState(initial.error);
 useEffect(()=>{if(initial.error)return;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setStorageError('')}catch{setStorageError('Your browser could not save these changes. Keep this page open and free browser storage.')}},[state,initial.error]);
 return <Context.Provider value={{state,update:setState,storageError}}>{children}</Context.Provider>;
}
export function useStudy(){const value=useContext(Context);if(!value)throw Error('StudyProvider is required');return value}
