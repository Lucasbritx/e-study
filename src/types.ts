export type Status = 'backlog' | 'progress' | 'done';
export interface Subject { id: string; name: string; goal: string; color: string }
export interface ChapterNote { chapter: number; text: string }
export interface Resource { id: string; type: 'book' | 'course'; title: string; author: string; subject: string; total: number; progress: number; color: string; url: string; notes: ChapterNote[] }
export interface LearningItem { id: string; title: string; description: string; status: Status; due: string; priority: 'low' | 'normal' | 'high'; subject: string; resource: string }
export type Goal = LearningItem;
export interface Task extends LearningItem { goal: string }
export interface Session { id: string; title: string; resource: string; subject: string; task?: string; date: string; time: string; duration: number; done: boolean }
export interface Review { id: string; resource: string; chapter: number; questions: string; answer: string; confidence: 'revisit' | 'good' | 'strong'; date: string }
export interface StudyState { subjects: Subject[]; resources: Resource[]; sessions: Session[]; goals: Goal[]; tasks: Task[]; reviews: Review[]; weeklyGoal: number }
export type View = 'Overview' | 'Study backlog' | 'My subjects' | 'Books & courses' | 'Study calendar' | 'AI study coach';
export type ModalState = {type:'resource'; id?:string; subject?:string} | {type:'subject'} | {type:'session'; date?:string; task?:string} | {type:'session-detail'; id:string} | {type:'item'; kind:'goal'|'task'; id?:string; parent?:string} | {type:'review'; id:string} | {type:'auto-plan'};
export interface Message { role: 'user'|'assistant'; text: string }
