import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {codexStatus,guide} from './codex.mjs';
const dev=process.argv.includes('--dev');
const root=resolve('dist');
let vite=null;
let aiBusy=false;
const server=http.createServer(async(req,res)=>{
 try{
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403);return res.end();}
  if(req.method==='POST'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end();}
  if(req.url==='/api/status'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await codexStatus()));}
  if(req.url==='/api/guide'&&req.method==='POST'){
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>60000){res.writeHead(413,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Input too large'}));}}
   const input=JSON.parse(body);
   if(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>45000){res.writeHead(400,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'Provide a prompt between 1 and 45,000 characters.'}));}
   if(aiBusy){res.writeHead(429,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'A study request is already running. Please wait.'}));}
   aiBusy=true;
   try{const text=await guide(input.prompt);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({text}));}finally{aiBusy=false;}
  }
  if(vite&&!req.url?.startsWith('/api/'))return vite.middlewares(req,res);
  const path=resolve(root,'.'+decodeURIComponent((req.url||'/').split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));
  if(!path.startsWith(root+'/')){res.writeHead(403);return res.end();}
  const file=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript'})[extname(path)]||'application/octet-stream');res.end(file);
 }catch(error){res.writeHead(req.url?.startsWith('/api/')?502:404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:req.url?.startsWith('/api/')?error.message:'Not found'}));}
});
if(dev)vite=await (await import('vite')).createServer({server:{middlewareMode:true,hmr:{server}},appType:'spa'});
server.on('error',async error=>{console.error(`Unable to start e-study: ${error.code}. Try another PORT or run the server in your local terminal.`);await vite?.close();process.exitCode=1;});
server.listen(process.env.PORT||3000,'127.0.0.1',()=>console.log(`e-study ready at http://localhost:${process.env.PORT||3000}`));
