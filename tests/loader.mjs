import ts from 'typescript';
import {readFile} from 'node:fs/promises';
export async function resolve(specifier,context,next){
 if(specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier)){
  for(const ext of ['.ts','.tsx'])try{return await next(specifier+ext,context)}catch{}
 }
 return next(specifier,context);
}
export async function load(url,context,next){
 if(/\.tsx?$/.test(url))return {format:'module',shortCircuit:true,source:ts.transpileModule(await readFile(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,verbatimModuleSyntax:true}}).outputText};
 return next(url,context);
}
