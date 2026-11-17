import {useEffect,useId,useRef} from 'react';
import type {ReactNode} from 'react';
import type {LearningItem,Resource} from '../types';
import {dateKey} from '../lib/study';
export function Heading({title,subtitle,action,label}:{title:string;subtitle:string;action?:()=>void;label?:string}){return <div className="heading"><div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>{title}</h1><p>{subtitle}</p></div>{action&&<button className="btn" onClick={action}>＋ {label}</button>}</div>}
export function Panel({title,action,children,className=''}:{title?:string;action?:ReactNode;children:ReactNode;className?:string}){return <section className={`panel ${className}`}>{title&&<div className="section-head"><h2>{title}</h2>{action}</div>}{children}</section>}
export function Progress({value}:{value:number}){return <div className="progress" role="progressbar" aria-label="Progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></div>}
export function Cover({resource:r}:{resource:Resource}){return <div className={`cover ${r.color}`}><span>{r.type==='course'?'↗ COURSE':r.author.split(' ').pop()}</span><span>{r.title}</span><span>e-study / {r.type==='book'?'READ':'LEARN'}</span></div>}
export function ItemMeta({item}:{item:LearningItem}){const overdue=!!item.due&&item.due<dateKey(new Date())&&item.status!=='done';return <>{item.due?<span className={overdue?'overdue':''}>{overdue?'Overdue · ':''}Due {item.due}</span>:'No due date'} · {item.priority||'normal'} priority</>}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function Options({items}:{items:{id:string;name?:string;title?:string}[]}){return <>{items.map(i=><option key={i.id} value={i.id}>{i.name||i.title}</option>)}</>}
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();useEffect(()=>{const el=ref.current;el?.showModal();return ()=>el?.close()},[]);
 return <dialog ref={ref} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose()}}><div className="modal-head"><h2 id={id}>{title}</h2><button type="button" className="close" onClick={onClose} aria-label="Close dialog">×</button></div>{children}</dialog>;
}
