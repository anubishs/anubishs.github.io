export function initialState(){
  return {version:1,title:'Lista de aniversário',groups:[],guests:[],savedAt:null,revision:0};
}
export function validateState(v){
  if(!v||v.version!==1||typeof v.title!=='string'||v.title.length>200||!Array.isArray(v.groups)||!v.groups.length||!Array.isArray(v.guests)||v.guests.length>10000) return false;
  const ids=new Set();
  for(const g of v.groups){if(!g||typeof g.id!=='string'||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>100||!/^#[0-9a-f]{6}$/i.test(g.color))return false;ids.add(g.id)}
  const people=new Set();
  for(const p of v.guests){if(!p||typeof p.id!=='string'||people.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>160||!ids.has(p.groupId)||typeof p.included!=='boolean'||typeof p.note!=='string'||p.note.length>1000)return false;people.add(p.id)}
  return true;
}
export const normalize = s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function selectGuests(state,{group='all',view='all',query='',sort='original'}={}){
  let result=state.guests.filter(p=>(group==='all'||p.groupId===group)&&(view==='all'||(view==='excluded'?!p.included:p.included))&&normalize(p.name+' '+p.note).includes(normalize(query.trim())));
  return sort==='alpha'?[...result].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')):result;
}
