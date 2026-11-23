import {defaultList} from './default-list.js';
export const STORAGE_KEY = 'lista-aniversario-bia-anubis-v2';
export function initialState(){
  return {...structuredClone(defaultList),savedAt:null};
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
export function finalText(state){
  let number=0;
  return `${state.title}\n${state.guests.filter(p=>p.included).length} pessoas na lista final\n\n`+state.groups.map(g=>{
    const people=state.guests.filter(p=>p.groupId===g.id&&p.included);
    return people.length?`${g.name}\n${people.map(p=>`${++number}. ${p.name}`).join('\n')}`:'';
  }).filter(Boolean).join('\n\n');
}
export function finalCSV(state){
  const cell=s=>'"'+String(s).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  return '\uFEFF'+[['Nome','Grupo'],...state.groups.flatMap(g=>state.guests.filter(p=>p.included&&p.groupId===g.id).map(p=>[p.name,g.name]))].map(row=>row.map(cell).join(';')).join('\r\n');
}
