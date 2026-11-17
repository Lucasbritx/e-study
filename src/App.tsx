import {useEffect,useRef,useState} from 'react';
import type {Message,ModalState,View} from './types';
import {useStudy} from './store';
import {ask} from './lib/ai';
import {Overview} from './pages/Overview';
import {Backlog} from './pages/Backlog';
import {Subjects,Resources} from './pages/Library';
import {Calendar} from './pages/Calendar';
import {Coach} from './pages/Coach';
import {Dialogs} from './components/Forms';
const nav:[View,string][]=[['Overview','◫'],['Study backlog','☷'],['My subjects','◈'],['Books & courses','▤'],['Study calendar','▦'],['AI study coach','✧']];
export default function App(){
 const {state,storageError}=useStudy();
 const [view,setView]=useState<View>('Overview'),[modal,setModal]=useState<ModalState|null>(null),[offset,setOffset]=useState(0),[ai,setAI]=useState(false),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false);
 const pending=useRef(false);
 useEffect(()=>{const controller=new AbortController();fetch('/api/status',{signal:controller.signal}).then(r=>r.json()).then(d=>setAI(d.ai===true)).catch(()=>{});return ()=>controller.abort()},[]);
 const navigate=(view:View)=>{setView(view);setOffset(0)};
 async function send(prompt:string){
  if(pending.current)return;pending.current=true;setBusy(true);const next:Message[]=[...messages,{role:'user',text:prompt}];setMessages(next);
  try{const text=ai?await ask(`Study context: ${JSON.stringify({goals:state.goals,tasks:state.tasks,subjects:state.subjects,resources:state.resources.map(({notes,...r})=>r),sessions:state.sessions})}\nConversation: ${JSON.stringify(next.slice(-8))}\nRespond to the latest request.`):`Offline study framework\n\nYour focus: ${prompt}\n\n1. Choose one specific skill or idea to learn this week.\n2. Explain it without notes to check your current understanding.\n3. Spend 20 minutes on a linked resource, then 10 minutes applying it.\n4. Write down what confused you and one example in your own words.\n5. Schedule short recall sessions tomorrow and in three days.\n\nUse Study calendar → Build a balanced week to schedule sessions. Personalized AI coaching becomes available when Codex CLI is installed and signed in.`;setMessages(m=>[...m,{role:'assistant',text}])}catch(error){setMessages(m=>[...m,{role:'assistant',text:`Unable to get an AI response: ${error instanceof Error?error.message:'Please try again.'}`}])}finally{pending.current=false;setBusy(false)}
 }
 return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">e</span>e-study<span style={{color:'#86a28f'}}>.</span></div><div className="nav-label">WORKSPACE</div><nav className="nav" aria-label="Workspace">{nav.map(([name,icon])=><button key={name} className={view===name?'active':''} aria-current={view===name?'page':undefined} onClick={()=>navigate(name)}><span className="icon" aria-hidden="true">{icon}</span>{name}</button>)}</nav><div className="side-note"><span style={{fontSize:22,color:'#7a987c'}}>♧</span><b>A little, every day.</b>Small steps today become big ideas tomorrow.</div><div className="profile"><span className="avatar">LX</span><div>Lucas Xavier<small>Your personal workspace</small></div></div></aside><main className="main"><header className="topbar"><div><strong>My workspace</strong><span style={{margin:'0 12px'}}>/</span>{view}</div><div className="top-actions"><span className="mode">● {ai?'Codex connected':'Offline workspace'}</span><span>{new Date().toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span></div></header><div className="content">{storageError&&<div className="notice" role="alert">{storageError}</div>}{view==='Overview'?<Overview navigate={navigate} open={setModal}/>:view==='Study backlog'?<Backlog open={setModal}/>:view==='My subjects'?<Subjects open={setModal} guide={prompt=>{navigate('AI study coach');void send(prompt)}}/>:view==='Books & courses'?<Resources open={setModal}/>:view==='Study calendar'?<Calendar offset={offset} setOffset={setOffset} open={setModal}/>:<Coach ai={ai} messages={messages} busy={busy} send={send}/>}</div></main>{modal&&<Dialogs key={JSON.stringify(modal)} modal={modal} close={()=>setModal(null)} open={setModal} ai={ai} offset={offset}/>}</div>;
}
