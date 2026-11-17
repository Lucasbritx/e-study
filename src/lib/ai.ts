export async function ask(prompt:string):Promise<string>{
 const response=await fetch('/api/guide',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'AI request failed');return data.text;
}
export const offlineReview='Offline reflection prompts (not AI-generated):\n\n1. Without looking at your notes, explain the chapter’s central idea in your own words.\n2. Which example in your notes best demonstrates that idea? Why?\n3. How could you apply one idea from this chapter to a real situation?\n4. What remains unclear, and what would help you resolve it?';
