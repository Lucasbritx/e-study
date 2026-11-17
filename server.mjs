import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {codexStatus,guide} from './codex.mjs';
import {openStudyDatabase,StorageError} from './database.mjs';
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function readJSON(req,limit){
 let size=0;const chunks=[];for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>limit)throw new StorageError('Input too large.',413);chunks.push(Buffer.from(chunk));}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new StorageError('Request body must be valid JSON.');}
}
export function createHandler({database,status=codexStatus,coach=guide,middleware=null}){
 const root=resolve('dist');let aiBusy=false;
 return async(req,res)=>{
  try{
   if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||''))return json(res,403,{error:'Invalid host.'});
   if(['POST','PUT','DELETE','PATCH'].includes(req.method)&&((req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)||req.headers['sec-fetch-site']==='cross-site'))return json(res,403,{error:'Cross-origin writes are not allowed.'});
   const url=(req.url||'/').split('?')[0];
   if(url==='/api/study'){
    if(req.method==='GET')return json(res,200,{workspace:database.read()});
    if(req.method==='POST'||req.method==='PUT'){
     const input=await readJSON(req,10*1024*1024);
     if(!input||typeof input!=='object')throw new StorageError('Expected a request object.');
     return json(res,200,{workspace:req.method==='POST'?database.initialize(input.state):database.save(input.state,input.revision)});
    }
    return json(res,405,{error:'Method not allowed.'});
   }
   if(url==='/api/status'&&req.method==='GET')return json(res,200,await status());
   if(url==='/api/guide'&&req.method==='POST'){
    const input=await readJSON(req,60000);
    if(typeof input?.prompt!=='string'||!input.prompt.trim()||input.prompt.length>45000)throw new StorageError('Provide a prompt between 1 and 45,000 characters.');
    if(aiBusy)return json(res,429,{error:'A study request is already running. Please wait.'});
    aiBusy=true;try{return json(res,200,{text:await coach(input.prompt)})}finally{aiBusy=false;}
   }
   if(url.startsWith('/api/'))return json(res,404,{error:'Unknown endpoint.'});
   if(middleware)return middleware(req,res);
   const path=resolve(root,'.'+decodeURIComponent(url==='/'?'/index.html':url));
   if(!path.startsWith(root+'/'))return json(res,403,{error:'Invalid path.'});
   const file=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(file);
  }catch(error){json(res,error instanceof StorageError?error.status:req.url?.startsWith('/api/')?500:404,{error:error instanceof StorageError?error.message:req.url?.startsWith('/api/')?'The server could not complete the request. Check the terminal and try again.':'Not found'});}
 };
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const database=openStudyDatabase(),dev=process.argv.includes('--dev');let vite=null;
 const server=http.createServer((req,res)=>handler(req,res));
 if(dev)vite=await (await import('vite')).createServer({server:{middlewareMode:true,hmr:{server}},appType:'spa'});
 const handler=createHandler({database,middleware:vite?.middlewares});
 const shutdown=async()=>{await vite?.close();server.close(()=>{database.close()});};
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void shutdown());
 server.on('error',async error=>{console.error(`Unable to start e-study: ${error.code}. Try another PORT or run the server in your local terminal.`);await vite?.close();database.close();process.exitCode=1;});
 server.listen(process.env.PORT||3000,'127.0.0.1',()=>console.log(`e-study ready at http://localhost:${process.env.PORT||3000}`));
}
