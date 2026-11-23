import {initialState,validateState,selectGuests} from './data.js';
import {BirthdayApi} from './api-client.js';
import {API_URL} from './api-config.js';

const $=id=>document.getElementById(id);
const icons={cake:'M3 11h18v10H3z M2 21h20 M7 11V6m5 5V5m5 6V6 M3 15c3 5 6-4 9 0s6-4 9 0 M7 3V2m5 0V1m5 2V2',plus:'M12 5v14M5 12h14',search:'m21 21-4.4-4.4M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',check:'m5 12 4 4L19 6',minus:'M5 12h14',list:'M9 6h12M9 12h12M9 18h12M3 6h.01M3 12h.01M3 18h.01',close:'m6 6 12 12M6 18 18 6',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',device:'M8 21h8m-4-4v4M3 3h18v14H3z',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 15V3m-5 5 5-5 5 5M4 16v5h16v-5',copy:'M9 9h12v12H9zM15 5V2H2v13h3',print:'M6 9V2h12v7M6 18H3V9h18v9h-3M6 15h12v7H6zM17 12h.01',up:'m6 15 6-6 6 6',down:'m6 9 6 6 6-6',sliders:'M4 3v7m0 4v7M12 3v11m0 4v3M20 3v3m0 4v11M1 10h6m2 8h6m2-12h6'};
icons.refresh='M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13.3 3M17.9 17.9a8 8 0 0 1-13.3-3';
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.list}"/></svg>`}
function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon))}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=initialState(),group='all',view='all',query='',sort='original',pendingRestore=null,undoAction=null,toastTimer;
let ready=false,busy=false,pulling=false;
const ACCESS_KEY_STORAGE='birthday-api-access-v1';
let accessKey='';
try{accessKey=localStorage.getItem(ACCESS_KEY_STORAGE)||''}catch{}
const bootstrapKey=new URLSearchParams(location.hash.slice(1)).get('chave');
if(bootstrapKey){accessKey=bootstrapKey;try{localStorage.setItem(ACCESS_KEY_STORAGE,bootstrapKey)}catch{}try{history.replaceState(null,'',location.pathname+location.search)}catch{location.hash=''}}
const api=new BirthdayApi(API_URL,accessKey);

function notify(message,undo=null){clearTimeout(toastTimer);$('toast-message').textContent=message;$('toast').hidden=false;$('undo').hidden=!undo;undoAction=undo;toastTimer=setTimeout(()=>$('toast').hidden=true,undo?12000:6500)}
function updateControls(){
  const locked=!ready||busy;
  document.querySelectorAll('#add-guest,#manage-groups,#backup,#restore,#add-form button[type=submit],#edit-form button[type=submit],#group-fields button,#new-group-form button,#confirm-restore,#copy-final,#csv-final,#print-final').forEach(b=>b.disabled=locked);
  if(locked)$('guest-list').querySelectorAll('[data-action]').forEach(b=>b.disabled=true);
  $('guest-list').setAttribute('aria-busy',String(busy||pulling));
}
function acceptState(incoming){
  if(!validateState(incoming)||!Number.isSafeInteger(incoming.revision)||incoming.revision<1)throw Error('O servidor retornou uma lista inválida.');
  if(incoming.revision<state.revision)return;
  state=incoming;ready=true;
  if(group!=='all'&&!state.groups.some(g=>g.id===group))group='all';
}
function reportError(error){
  $('storage-warning').hidden=false;$('storage-warning').textContent=error.message||'Não foi possível acessar o servidor.';
  $('save-status').textContent='Não sincronizado';
  if(error.status===401){ready=false;$('connection-panel').hidden=false;$('save-status').textContent='Informe sua chave de acesso'}
  updateControls();
}
async function loadState({silent=false}={}){
  if(busy||pulling)return false;
  if(!api.key){$('connection-panel').hidden=false;$('save-status').textContent='Informe sua chave de acesso';render();return false}
  pulling=true;if(!silent)$('save-status').textContent='Atualizando…';updateControls();
  try{acceptState(await api.getState());$('storage-warning').hidden=true;$('connection-panel').hidden=true;$('save-status').textContent='Sincronizado com o servidor';render();return true}
  catch(error){reportError(error);return false}
  finally{pulling=false;updateControls()}
}
async function commit(path,method,body){
  if(!ready||busy)return null;
  busy=true;$('save-status').textContent='Salvando no servidor…';updateControls();
  try{
    const result=await api.change(path,method,body,state.revision);acceptState(result);$('storage-warning').hidden=true;$('save-status').textContent='Salvo no servidor';return result;
  }catch(error){
    if(error.status===409){try{acceptState(await api.getState())}catch{}notify('A lista mudou em outro dispositivo. Confira os dados e tente novamente.')}
    else if(!error.status){ready=false}
    reportError(error);return null;
  }finally{busy=false;render()}
}
function groupOptions(selected){return state.groups.map(g=>`<option value="${esc(g.id)}" ${g.id===selected?'selected':''}>${esc(g.name)}</option>`).join('')}
function renderNavigation(){
  const chosen=state.guests.filter(p=>p.included).length;
  $('group-nav').innerHTML=`<button class="group-nav-button" data-group="all" aria-current="${group==='all'}"><span data-icon="list"></span><span class="group-name">Todos os convidados</span><span class="group-count">${chosen}</span></button>`+state.groups.map(g=>`<button class="group-nav-button" data-group="${esc(g.id)}" aria-current="${group===g.id}"><span class="group-dot" style="background:${g.color}"></span><span class="group-name">${esc(g.name)}</span><span class="group-count">${state.guests.filter(p=>p.groupId===g.id&&p.included).length}</span></button>`).join('');
  hydrateIcons($('group-nav'));
}
function renderPrint(){
  let number=1;
  $('print-area').innerHTML=`<h1>${esc(state.title)}</h1><p>${state.guests.filter(p=>p.included).length} pessoas na lista final</p>`+state.groups.map(g=>{
    const members=state.guests.filter(p=>p.included&&p.groupId===g.id);if(!members.length)return '';
    const start=number;number+=members.length;return `<section><h2>${esc(g.name)}</h2><ol start="${start}">${members.map(p=>`<li>${esc(p.name)}</li>`).join('')}</ol></section>`;
  }).join('');
}
function render(){
  renderNavigation();
  const isFinal=view==='final';
  const scoped=state.guests.filter(p=>group==='all'||p.groupId===group);
  const included=scoped.filter(p=>p.included).length;
  $('event-title').textContent=state.title;
  $('list-heading').textContent=isFinal?'Sua lista final':group==='all'?'Todos os convidados':state.groups.find(g=>g.id===group).name;
  const totalIncluded=state.guests.filter(p=>p.included).length;
  $('selection-summary').innerHTML=`<strong>${totalIncluded} ${totalIncluded===1?'pessoa na lista final':'pessoas na lista final'}</strong> <span>· ${state.guests.length} no cadastro</span>`;
  $('count-all').textContent=scoped.length;$('count-included').textContent=included;$('count-excluded').textContent=scoped.length-included;
  document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===view;b.setAttribute('aria-selected',selected);b.tabIndex=selected?0:-1});
  $('guest-list').setAttribute('aria-labelledby','tab-'+view);
  $('final-tools').hidden=!isFinal;$('search').parentElement.parentElement.hidden=isFinal;
  $('add-guest').hidden=isFinal;
  $('list-help').textContent=isFinal?'Apenas pessoas incluídas aparecem aqui.':'Tirar da lista não apaga o cadastro.';
  const people=selectGuests(state,{group:isFinal?'all':group,view,query:isFinal?'':query,sort:isFinal?'original':sort});
  let number=0;
  const groups=state.groups.filter(g=>people.some(p=>p.groupId===g.id));
  $('guest-list').innerHTML=groups.map(g=>{
    const members=people.filter(p=>p.groupId===g.id);
    const groupPeople=state.guests.filter(p=>p.groupId===g.id);
    return `<section class="guest-group" aria-label="${esc(g.name)}"><header class="group-header"><span class="group-dot" style="background:${g.color}"></span><h3>${esc(g.name)}</h3><span class="group-meta">${isFinal?members.length+' '+(members.length===1?'pessoa':'pessoas'):groupPeople.filter(p=>p.included).length+' de '+groupPeople.length+' na lista'}</span></header>${members.map(p=>{
      number++;
      const position=groupPeople.findIndex(item=>item.id===p.id);
      return `<div class="guest-row ${p.included?'':'excluded'} ${isFinal?'final-row':''}" data-id="${esc(p.id)}"><span class="row-number">${number}</span><div><div class="person-name">${esc(p.name)}</div>${p.note&&!isFinal?`<div class="person-note">${esc(p.note)}</div>`:''}</div>${isFinal?'':`<button class="status-toggle" data-action="toggle" aria-pressed="${p.included}" aria-label="${p.included?'Tirar':'Incluir'} ${esc(p.name)} ${p.included?'da':'na'} lista final">${icon(p.included?'check':'minus')} ${p.included?'Na lista':'Fora da lista'}</button><div class="row-actions"><button class="icon-button" data-action="up" ${position===0||sort==='alpha'?'disabled':''} aria-label="Subir ${esc(p.name)}" title="Subir na sua ordem">${icon('up')}</button><button class="icon-button" data-action="down" ${position===groupPeople.length-1||sort==='alpha'?'disabled':''} aria-label="Descer ${esc(p.name)}" title="Descer na sua ordem">${icon('down')}</button><button class="edit-button" data-action="edit" aria-label="Editar ${esc(p.name)}">Editar</button></div>`}</div>`;
    }).join('')}</section>`;
  }).join('')||`<div class="empty"><h3>${!ready?'Sua lista fica guardada no servidor':isFinal?'A lista final ainda está vazia':query?'Nenhuma pessoa encontrada':view==='excluded'?'Ninguém ficou de fora':view==='included'?'Nenhuma pessoa incluída neste grupo':'Este grupo ainda está vazio'}</h3><p>${!ready?'Conecte-se para carregar os convidados e organizar a festa.':isFinal?'Volte à aba Todos e inclua quem vem à festa.':query?'Tente outro nome ou procure em todos os grupos.':view==='excluded'?'Quem você tirar da lista aparecerá aqui e poderá voltar a qualquer momento.':'Adicione uma pessoa ou mude sua seleção.'}</p></div>`;
  $('result-count').textContent=`${people.length} ${people.length===1?'pessoa exibida':'pessoas exibidas'}`;
  renderPrint();updateControls();
}
function renderGroupManager(){
  $('group-fields').innerHTML=state.groups.map(g=>`<form class="group-field" data-id="${esc(g.id)}"><span class="group-dot" style="background:${g.color}"></span><input aria-label="Nome do grupo ${esc(g.name)}" name="name" value="${esc(g.name)}" required maxlength="100"><button class="secondary" type="submit">Salvar</button></form>`).join('');
}
async function backup(){if(!await loadState())return;download(`aniversario-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),'application/json');notify('Backup do servidor baixado, incluindo quem está fora da lista.')}
function download(filename,data,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

$('group-nav').addEventListener('click',e=>{const button=e.target.closest('[data-group]');if(!button)return;group=button.dataset.group;if(view==='final')view='all';render()});
document.querySelector('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(!b)return;view=b.dataset.view;if(view==='final'){$('add-panel').hidden=true;group='all'}render();b.focus()});
document.querySelector('.tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=[...document.querySelectorAll('[data-view]')];const current=tabs.indexOf(document.activeElement);const target=e.key==='Home'?0:e.key==='End'?tabs.length-1:(current+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[target].click()});
$('search').addEventListener('input',e=>{query=e.target.value;render()});
$('sort').addEventListener('change',e=>{sort=e.target.value;render()});

$('add-guest').onclick=()=>{if(!ready||busy)return;$('add-group').innerHTML=groupOptions(group==='all'?state.groups[0].id:group);$('add-panel').hidden=false;$('add-form').elements.name.focus()};
$('cancel-add').onclick=()=>{$('add-panel').hidden=true;$('add-guest').focus()};
$('add-form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget;const name=form.elements.name.value.trim();if(!name){form.elements.name.setCustomValidity('Preencha o nome da pessoa.');form.elements.name.reportValidity();return}
  const body={name,groupId:form.elements.groupId.value,note:form.elements.note.value.trim(),included:form.elements.included.checked};
  const result=await commit('/guests','POST',body);if(!result)return;
  group=body.groupId;view='all';query='';$('search').value='';render();form.reset();$('add-panel').hidden=true;notify(`${name} foi adicionado(a).`);$('add-guest').focus();
};
$('add-form').elements.name.addEventListener('input',e=>e.target.setCustomValidity(''));
$('guest-list').addEventListener('click',async e=>{
  const button=e.target.closest('[data-action]');if(!button||!ready||busy)return;const id=button.closest('[data-id]').dataset.id;const person=state.guests.find(p=>p.id===id);const action=button.dataset.action;
  if(action==='toggle'){
    const oldIncluded=person.included;const name=person.name;
    if(!await commit('/guests/'+encodeURIComponent(id),'PATCH',{included:!oldIncluded}))return;
    notify(oldIncluded?`${name} ficou fora da lista final. Cadastro mantido.`:`${name} voltou para a lista final.`,async()=>{if(await commit('/guests/'+encodeURIComponent(id),'PATCH',{included:oldIncluded}))notify('Alteração desfeita.')});
    const replacement=[...$('guest-list').querySelectorAll('[data-id]')].find(el=>el.dataset.id===id);replacement?.querySelector('[data-action=toggle]')?.focus({preventScroll:true});
  }else if(action==='edit'){
    const form=$('edit-form');form.elements.id.value=person.id;form.elements.name.value=person.name;$('edit-group').innerHTML=groupOptions(person.groupId);form.elements.note.value=person.note;form.elements.included.checked=person.included;$('edit-dialog').showModal();form.elements.name.focus();
  }else{
    if(!await commit('/guests/'+encodeURIComponent(id)+'/move','POST',{direction:action}))return;
    const replacement=[...$('guest-list').querySelectorAll('[data-id]')].find(el=>el.dataset.id===id);replacement?.querySelector(`[data-action=${action}]`)?.focus({preventScroll:true});
  }
});
$('edit-form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget;const name=form.elements.name.value.trim();if(!name){form.elements.name.setCustomValidity('Preencha o nome da pessoa.');form.elements.name.reportValidity();return}
  const result=await commit('/guests/'+encodeURIComponent(form.elements.id.value),'PATCH',{name,groupId:form.elements.groupId.value,note:form.elements.note.value.trim(),included:form.elements.included.checked});
  if(result){$('edit-dialog').close();notify('Cadastro atualizado no servidor.')}
};
$('edit-form').elements.name.addEventListener('input',e=>e.target.setCustomValidity(''));
$('cancel-edit').onclick=$('discard-edit').onclick=()=>$('edit-dialog').close();
$('manage-groups').onclick=()=>{if(!ready||busy)return;$('group-manager').hidden=!$('group-manager').hidden;if(!$('group-manager').hidden){renderGroupManager();$('group-manager').scrollIntoView({block:'start',behavior:'instant'});$('group-fields').querySelector('input').focus()}};
$('close-groups').onclick=()=>{$('group-manager').hidden=true;$('manage-groups').focus()};
$('group-fields').onsubmit=async e=>{e.preventDefault();const form=e.target;const name=form.elements.name.value.trim();if(!name){notify('Digite um nome para o grupo.');return}if(await commit('/groups/'+encodeURIComponent(form.dataset.id),'PATCH',{name})){renderGroupManager();notify('Nome do grupo atualizado no servidor.')}};
$('new-group-form').onsubmit=async e=>{e.preventDefault();const input=e.currentTarget.elements.groupName;const name=input.value.trim();if(!name)return;const result=await commit('/groups','POST',{name});if(result){group=result.changedId;view='all';input.value='';render();renderGroupManager();notify('Grupo criado. Você já pode adicionar pessoas.')}};
$('backup').onclick=$('backup-before-restore').onclick=backup;
$('restore').onclick=()=>{if(ready&&!busy)$('restore-file').click()};
$('restore-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2000000)throw Error('Arquivo muito grande');const imported=JSON.parse(await file.text());if(!validateState(imported))throw Error('Backup inválido');pendingRestore=imported;$('restore-description').textContent=`O arquivo contém ${imported.guests.length} pessoas e ${imported.groups.length} grupos.`;$('restore-dialog').showModal()}catch{notify('Arquivo inválido. Selecione um backup JSON baixado nesta página.')}finally{e.target.value=''}};
$('cancel-restore').onclick=()=>{pendingRestore=null;$('restore-dialog').close()};
$('confirm-restore').onclick=async()=>{if(!pendingRestore)return;if(await commit('/restore','POST',{state:pendingRestore})){pendingRestore=null;group='all';view='all';query='';$('search').value='';render();if(!$('group-manager').hidden)renderGroupManager();$('restore-dialog').close();notify('Backup aplicado. Todos os cadastros foram preservados.')}};
$('copy-final').onclick=async()=>{try{const text=await api.export('text');try{await navigator.clipboard.writeText(text);notify('Lista final copiada. É só colar e compartilhar.')}catch{download('lista-final.txt',text,'text/plain;charset=utf-8');notify('O navegador bloqueou a cópia. A lista foi baixada como texto.')}}catch(error){reportError(error)}};
$('csv-final').onclick=async()=>{try{download('lista-final.csv',await api.export('csv'),'text/csv;charset=utf-8');notify('Lista final do servidor baixada. O CSV abre em uma planilha.')}catch(error){reportError(error)}};
$('print-final').onclick=async()=>{if(await loadState()){renderPrint();window.print()}};
window.addEventListener('beforeprint',renderPrint);
$('undo').onclick=()=>{const action=undoAction;undoAction=null;if(action)action()};
$('dismiss-toast').onclick=()=>$('toast').hidden=true;
$('sync-now').onclick=()=>loadState();
$('connection-form').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget;api.key=form.elements.accessKey.value.trim();$('save-status').textContent='Conectando…';if(await loadState()){try{if(form.elements.remember.checked)localStorage.setItem(ACCESS_KEY_STORAGE,api.key);else localStorage.removeItem(ACCESS_KEY_STORAGE)}catch{}form.reset();notify('Conectado. Sua lista agora é salva no servidor.')}};
window.addEventListener('focus',()=>{if(api.key&&!busy&&$('edit-dialog').open===false&&$('add-panel').hidden)loadState({silent:true})});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&api.key&&!busy&&!$('edit-dialog').open&&$('add-panel').hidden)loadState({silent:true})});
setInterval(()=>{if(!document.hidden&&api.key&&!busy&&!$('edit-dialog').open&&$('add-panel').hidden&&!$('restore-dialog').open&&$('group-manager').hidden)loadState({silent:true})},60000);
hydrateIcons();render();loadState();
