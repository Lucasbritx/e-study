import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export class StorageError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export function validateState(value){
 const fail=message=>{throw new StorageError(`Invalid study data: ${message}`)};
 if(!value||typeof value!=='object'||Array.isArray(value))fail('expected an object.');
 const collections=['subjects','resources','sessions','goals','tasks','reviews'];
 for(const key of collections){
  if(!Array.isArray(value[key]))fail(`${key} must be a list.`);
  const ids=new Set();for(const item of value[key]){
   if(!item||typeof item!=='object'||typeof item.id!=='string'||!item.id||ids.has(item.id))fail(`${key} contains a missing or duplicate ID.`);ids.add(item.id);
   const fields=key==='subjects'?['name','goal','color']:key==='resources'?['title','author','subject','url','color']:key==='sessions'?['title','resource','subject','date','time']:key==='reviews'?['resource','questions','answer','date']:['title','description','due','subject','resource'];
   for(const field of fields)if(typeof item[field]!=='string')fail(`${key}.${field} must be text.`);
   if(key==='resources'){
    if(!['book','course'].includes(item.type)||!Number.isInteger(item.total)||item.total<1||!Number.isInteger(item.progress)||item.progress<0||item.progress>item.total||!Array.isArray(item.notes))fail('invalid resource progress or notes.');
    for(const note of item.notes)if(!note||typeof note!=='object'||!Number.isInteger(note.chapter)||note.chapter<1||typeof note.text!=='string')fail('invalid chapter note.');
   }
   if(key==='goals'||key==='tasks'){
    if(!['backlog','progress','done'].includes(item.status)||!['low','normal','high'].includes(item.priority))fail('invalid task status or priority.');
    if(item.due&&!validDate(item.due))fail('invalid due date.');
    if(key==='tasks'&&(typeof item.goal!=='string'||!value.goals.some(g=>g.id===item.goal)))fail('a task must belong to an existing goal.');
   }
   if(key==='sessions'&&(!validDate(item.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)||typeof item.done!=='boolean'||!Number.isFinite(item.duration)||item.duration<=0||(item.task!==undefined&&typeof item.task!=='string')))fail('invalid study session.');
   if(key==='reviews'&&(!Number.isInteger(item.chapter)||item.chapter<1||!['revisit','good','strong'].includes(item.confidence)))fail('invalid reading review.');
  }
 }
 if(!Number.isFinite(value.weeklyGoal)||value.weeklyGoal<0)fail('invalid weekly goal.');
 return value;
}
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
export function openStudyDatabase(filename=process.env.STUDY_DB_PATH||resolve('data/e-study.sqlite')){
 if(filename!==':memory:')mkdirSync(dirname(resolve(filename)),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;');
 const version=db.prepare('PRAGMA user_version').get().user_version;
 if(version>1){db.close();throw Error('This study database was created by a newer app version.');}
 db.exec(`CREATE TABLE IF NOT EXISTS workspace (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL CHECK(revision>0),
  state TEXT NOT NULL CHECK(json_valid(state)),
  updated_at TEXT NOT NULL
 ); PRAGMA user_version=1;`);
 const read=()=>{const row=db.prepare('SELECT state,revision,updated_at FROM workspace WHERE id=1').get();return row?{state:JSON.parse(row.state),revision:row.revision,updatedAt:row.updated_at}:null;};
 return {
  read,
  initialize(state){validateState(state);db.prepare('INSERT OR IGNORE INTO workspace(id,revision,state,updated_at) VALUES(1,1,?,?)').run(JSON.stringify(state),new Date().toISOString());return read();},
  save(state,revision){
   validateState(state);if(!Number.isSafeInteger(revision)||revision<1)throw new StorageError('A valid workspace revision is required.');
   const result=db.prepare('UPDATE workspace SET state=?,revision=revision+1,updated_at=? WHERE id=1 AND revision=? RETURNING state,revision,updated_at').get(JSON.stringify(state),new Date().toISOString(),revision);
   if(!result)throw new StorageError('Study data changed in another tab. Your pending changes are still in this browser. Reload to load the latest saved workspace.',409);
   return {state:JSON.parse(result.state),revision:result.revision,updatedAt:result.updated_at};
  },
  close(){db.close()}
 };
}
