import type {Goal, LearningItem, Session, StudyState, Task} from '../types';
export const STORAGE_KEY = 'e-study-v1';
export const statuses = {backlog:'Backlog', progress:'In progress', done:'Done'} as const;
export function dateKey(d:Date):string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export function weekDates(offset=0, now=new Date()):Date[] { const start=new Date(now);start.setHours(12,0,0,0);start.setDate(start.getDate()-((start.getDay()+6)%7)+offset*7);return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d}) }
export function completedWeek(state:StudyState, offset=0, now=new Date()) {const days=weekDates(offset,now).map(dateKey);return state.sessions.filter(s=>s.done&&days.includes(s.date))}
export function progress(resource:{progress:number; total:number}) {return resource.total>0?Math.round(resource.progress/resource.total*100):0}
export function migrateState(raw:unknown):StudyState {
 if(!raw||typeof raw!=='object')throw Error('Study data is not an object.');
 const value=raw as Record<string,unknown>;
 for(const name of ['subjects','resources','sessions','reviews'])if(!Array.isArray(value[name]))throw Error('Study data is incomplete.');
 for(const name of ['goals','tasks'])if(value[name]!==undefined&&!Array.isArray(value[name]))throw Error('Study backlog data is invalid.');
 return {...value,goals:value.goals??[],tasks:value.tasks??[],weeklyGoal:typeof value.weeklyGoal==='number'?value.weeklyGoal:5} as unknown as StudyState;
}
export function upsertItem(state:StudyState,kind:'goal'|'task',data:LearningItem,parent=''):StudyState {
 if(!data.title.trim())throw Error('Give this item a title.');
 if(!Object.hasOwn(statuses,data.status))throw Error('Choose a valid status.');
 if(data.due&&(!/^\d{4}-\d{2}-\d{2}$/.test(data.due)||dateKey(new Date(`${data.due}T12:00:00`))!==data.due))throw Error('Choose a valid due date.');
 if(kind==='task'&&!state.goals.some(g=>g.id===parent))throw Error('Choose a learning goal.');
 const item={...data,title:data.title.trim()};
 if(kind==='goal')return {...state,goals:state.goals.some(g=>g.id===item.id)?state.goals.map(g=>g.id===item.id?item:g):[...state.goals,item]};
 const task={...item,goal:parent};return {...state,tasks:state.tasks.some(t=>t.id===item.id)?state.tasks.map(t=>t.id===item.id?task:t):[...state.tasks,task]};
}
export function removeItem(state:StudyState,kind:'goal'|'task',id:string):StudyState {
 const removed=kind==='goal'?state.tasks.filter(t=>t.goal===id).map(t=>t.id):[id];
 return {...state,goals:kind==='goal'?state.goals.filter(g=>g.id!==id):state.goals,tasks:state.tasks.filter(t=>!removed.includes(t.id)),sessions:state.sessions.map(s=>removed.includes(s.task||'')?{...s,task:''}:s)};
}
export function deadlines(state:StudyState,date:string):(Goal|Task)[]{return [...state.goals,...state.tasks].filter(t=>t.due===date&&t.status!=='done')}
export function planWeek(state:StudyState,offset:number,time:string,now=new Date()):Session[]{
 if(!state.subjects.length)return [];
 return weekDates(offset,now).slice(0,5).flatMap((d,i)=>{
  const date=dateKey(d),start=new Date(`${date}T${time}`).getTime();
  if(start<now.getTime()||state.sessions.some(s=>s.date===date&&start<new Date(`${s.date}T${s.time}`).getTime()+s.duration*60000&&start+30*60000>new Date(`${s.date}T${s.time}`).getTime()))return [];
  const sub=state.subjects[i%state.subjects.length],r=state.resources.find(r=>r.subject===sub.id&&r.progress<r.total);
  return [{id:crypto.randomUUID(),title:i===4?`Weekly recall: ${sub.name}`:r?`${r.type==='book'?'Read':'Practice'}: ${r.title}`:`Practice ${sub.name}`,subject:sub.id,resource:r?.id||'',date,time,duration:30,done:false}];
 });
}
export function calendarText(state:StudyState,now=new Date()):string {
 const clean=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
 const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z');
 const events=state.sessions.map(s=>{const start=new Date(`${s.date}T${s.time}:00`),end=new Date(start.getTime()+s.duration*60000);return `BEGIN:VEVENT\r\nUID:${s.id}@e-study\r\nDTSTAMP:${stamp(now)}\r\nDTSTART:${stamp(start)}\r\nDTEND:${stamp(end)}\r\nSUMMARY:${clean(s.title)}\r\nDESCRIPTION:${clean(state.resources.find(r=>r.id===s.resource)?.title||'e-study session')}\r\nEND:VEVENT`});
 return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//e-study//Study Planner//EN\r\n${events.join('\r\n')}\r\nEND:VCALENDAR\r\n`;
}
export function exportCalendar(state:StudyState){const url=URL.createObjectURL(new Blob([calendarText(state)],{type:'text/calendar'}));const a=document.createElement('a');a.href=url;a.download='e-study-calendar.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
