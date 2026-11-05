import {calculate} from './calc.mjs';
import {loadDraft,saveDraft,normalizeDraft,validDraft} from './storage.mjs';
import {prepareReference} from './images.mjs';
import {createProject,createDraft,applyPrinterProfile,PRINTER_PROFILE} from './draft.mjs';
import {esc,money,projectName,quoteData,quoteMarkup,textQuote,fileName,imageData,createPdf} from './quote.mjs';

const $=id=>document.getElementById(id);
const fresh=createProject,initial=createDraft;
let state=initial(),toastTimer,removed,saveTimer,saveQueue=Promise.resolve(),changeVersion=0,uploads=0,exporting=false;
const saved=await loadDraft();
const needsPrinterUpdate=validDraft(saved)&&saved.printerProfile!==PRINTER_PROFILE;
if(validDraft(saved))state=applyPrinterProfile(normalizeDraft(saved));

function persist(){
  clearTimeout(saveTimer);
  const version=++changeVersion;
  $('save-state').textContent='Salvando rascunho…';
  saveTimer=setTimeout(()=>{
    const snapshot=structuredClone(state);
    saveQueue=saveQueue.catch(()=>{}).then(()=>saveDraft(snapshot)).then(()=>{
      if(version===changeVersion)$('save-state').textContent='Rascunho salvo neste navegador';
    }).catch(()=>{$('save-state').textContent='Não foi possível salvar. Baixe o rascunho.';});
  },150);
}
function toast(message,undo=false){
  clearTimeout(toastTimer);$('toast').hidden=false;
  $('toast').innerHTML=esc(message)+(undo?' <button id="undo">Desfazer</button>':'');
  if(undo)$('undo').onclick=()=>{if(typeof undo==='function')undo();else if(removed){state.projects.splice(removed.index,0,removed.p);removed=null;render();persist();}$('toast').hidden=true;};
  toastTimer=setTimeout(()=>$('toast').hidden=true,6000);
}
function numeric(p,key,label,unit,placeholder='',step='any',min='0'){
  return `<div><label for="${esc(p.id)}-${key}">${label}</label><div class="input-unit"><input id="${esc(p.id)}-${key}" data-field="${key}" type="number" min="${min}" step="${step}" value="${esc(p[key])}" placeholder="${placeholder}" inputmode="decimal" required><span>${unit}</span></div></div>`;
}
function extraMarkup(p){
  return p.extras.map((item,i)=>`<div class="extra-row" data-extra-id="${esc(item.id)}"><div><label for="${p.id}-extra-${i}">Serviço</label><input id="${p.id}-extra-${i}" data-extra-field="name" value="${esc(item.name)}" maxlength="150" placeholder="Ex.: Modelagem 3D"></div><div><label for="${p.id}-amount-${i}">Valor (R$)</label><input id="${p.id}-amount-${i}" data-extra-field="amount" type="number" min="0" step="0.01" value="${esc(item.amount)}" required inputmode="decimal" placeholder="150,00"></div><button class="icon-button" data-action="remove-extra" aria-label="Remover serviço ${i+1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>`).join('');
}
function referenceMarkup(p){
  return p.references.map((ref,i)=>`<figure class="reference" data-ref-id="${esc(ref.id)}"><img src="${ref.data}" alt="${esc(ref.caption||ref.name)}"><button class="reference-remove icon-button" data-action="remove-reference" aria-label="Remover imagem ${i+1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><figcaption><label for="${p.id}-caption-${i}">Legenda da imagem ${i+1}</label><input id="${p.id}-caption-${i}" data-ref-caption value="${esc(ref.caption)}" maxlength="150" placeholder="Ex.: Vista frontal"></figcaption></figure>`).join('');
}
function projectMarkup(p,i){
  return `<article class="project" data-id="${esc(p.id)}">
    <div class="project-top"><div class="project-title"><span class="project-number">${String(i+1).padStart(2,'0')}</span><h3>Projeto ${i+1}</h3></div><button class="icon-button" data-action="remove" aria-label="Remover projeto ${i+1}" title="Remover projeto" ${state.projects.length===1?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg></button></div>
    <label for="${p.id}-name">Nome do projeto</label><input id="${p.id}-name" data-field="name" value="${esc(p.name)}" maxlength="150" placeholder="Ex.: Suporte para controle">
    <label class="check-label print-toggle"><input type="checkbox" data-field="printingEnabled" ${p.printingEnabled?'checked':''}> Incluir impressão 3D</label>
    <div data-print-fields ${p.printingEnabled?'':'hidden'}>
      <div class="field-pair">${numeric(p,'filamentUsed','Filamento usado','g','200')}${numeric(p,'printHours','Tempo de impressão','h','4')}</div>
      <div class="field-pair">${numeric(p,'filamentPrice','Preço do filamento','R$/kg','100')}${numeric(p,'markup','Acréscimo no filamento','%','300')}</div>
      <div class="field-pair">${numeric(p,'quantity','Quantidade','un.','1','1','1')}<div><label>Preço por objeto (impressão)</label><div class="unit-price" data-result="unit">—</div></div></div>
      <label class="check-label"><input type="checkbox" data-field="roundUnit" ${p.roundUnit?'checked':''}> Arredondar preço por objeto para R$ inteiro</label>
      <details><summary>Energia e depreciação da máquina</summary><div class="field-pair">${numeric(p,'printerPower','Potência da impressora','W','100')}${numeric(p,'energyRate','Tarifa de energia','R$/kWh','0,725')}</div>${numeric(p,'depreciationRate','Depreciação da máquina por hora','R$/h','3,33')}<p class="field-hint">Sua máquina: R$ 10.000 ÷ 3.000 horas de impressão ≈ R$ 3,33/h. Valor arredondado para centavos e editável. Energia e manutenção são separadas.</p><div class="internal-costs"><span>Filamento <b data-result="material">—</b></span><span>Energia <b data-result="energy">—</b></span><span>Depreciação <b data-result="depreciation">—</b></span></div><p class="field-hint">Custos por objeto. O acréscimo se aplica somente ao filamento. Energia e depreciação entram sem acréscimo e ficam privadas.</p></details>
    </div>
    <section class="project-section"><div class="inline-heading"><h4>Serviços e valores adicionais</h4></div><p class="field-hint">Modelagem, pintura, acabamento ou outros serviços. Cobrança única por projeto, sem multiplicar pela quantidade.</p><div data-extra-list>${extraMarkup(p)}</div><button class="small-action" data-action="add-extra">Adicionar serviço</button></section>
    <section class="project-section"><h4>Referências</h4><p class="field-hint">Até 4 imagens por projeto, JPG, PNG ou WebP (10 MB cada). Incluídas no PDF e HTML.</p><div class="references" data-reference-list>${referenceMarkup(p)}</div><label class="upload-label" for="${p.id}-photos">Adicionar imagens</label><input class="upload-input" id="${p.id}-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple data-photos><p class="field-hint" data-upload-status role="status"></p></section>
    <details><summary>Descrição para o cliente</summary><label for="${p.id}-description">Material, cor, acabamento e detalhes</label><textarea id="${p.id}-description" data-field="description" rows="2" maxlength="2000" placeholder="Descreva o que está incluído…">${esc(p.description)}</textarea></details>
    <div class="project-totals"><div><span>Impressão (${esc(p.quantity)} un.)</span><strong data-result="print">—</strong></div><div><span>Serviços adicionais</span><strong data-result="services">—</strong></div><div data-rounding-line hidden><span>Ajuste de arredondamento</span><strong data-result="rounding">—</strong></div></div>
    <div class="project-price"><div><small>Total do projeto</small></div><strong class="price" data-result="price">—</strong></div>
    <label class="check-label"><input type="checkbox" data-field="roundTotal" ${p.roundTotal?'checked':''}> Arredondar total do projeto para R$ inteiro</label><p class="field-hint">Arredonda para o real mais próximo: R$ 81,16 → R$ 81; R$ 81,50 → R$ 82.</p>
    <p class="error" data-result="error" hidden></p><div class="project-bottom"><label><input type="checkbox" data-field="included" ${p.included?'checked':''}> Incluir na proposta</label><button class="text-button" data-action="export">PDF deste projeto</button></div></article>`;
}
function render(){
  $('projects').innerHTML=state.projects.map(projectMarkup).join('');$('project-count').textContent=state.projects.length;
  for(const el of document.querySelectorAll('[data-meta]'))el.value=state.meta[el.dataset.meta];
  update();
}
const selected=()=>state.projects.filter(p=>p.included);
const data=(projects=selected())=>quoteData(projects,state.meta,state.projects);
function validMeta(){return /^\d{4}-\d{2}-\d{2}$/.test(state.meta.issued)&&!isNaN(new Date(state.meta.issued+'T12:00:00').valueOf())&&Number.isInteger(Number(state.meta.validity))&&Number(state.meta.validity)>=1&&Number(state.meta.validity)<=365;}
function update(){
  $('reset-proposal').disabled=!!uploads||exporting;
  let total=0,cost=0,profit=0,services=0,rounding=0;
  for(const p of state.projects){
    const result=calculate(p),card=document.querySelector(`[data-id="${CSS.escape(p.id)}"]`);if(!card)continue;
    const output=(key,value)=>card.querySelector(`[data-result="${key}"]`).textContent=value;
    output('unit',result?money(result.unitPrice):'—');output('print',result?money(result.printTotal):'—');output('services',result?money(result.servicesTotal):'—');output('price',result?money(result.total):'—');output('rounding',result?money(result.roundingAdjustment):'—');
    output('material',result?money(result.material):'—');output('energy',result?money(result.energy):'—');output('depreciation',result?money(result.depreciation):'—');
    card.querySelector('[data-print-fields]').hidden=!p.printingEnabled;
    for(const input of card.querySelectorAll('[data-print-fields] input'))input.disabled=!p.printingEnabled;
    card.querySelector('[data-print-fields] .unit-price').textContent=result?money(result.unitPrice):'—';
    card.querySelector('.project-totals>div:first-child>span').textContent=`Impressão (${p.quantity} un.)`;
    card.querySelector('.project-totals>div:first-child').hidden=!p.printingEnabled;
    card.querySelector('[data-rounding-line]').hidden=!result?.roundingAdjustment;
    const error=card.querySelector('[data-result="error"]');error.hidden=!!result||!card.dataset.touched;
    error.textContent=p.printingEnabled?'Confira os valores da impressão e dos serviços. Quantidade: inteiro a partir de 1.':'Adicione pelo menos um serviço com nome e valor.';
    card.querySelector('[data-action="export"]').disabled=!result||!!uploads||exporting;
    for(const input of card.querySelectorAll('input[type=number]'))input.setAttribute('aria-invalid',String(!!card.dataset.touched&&!input.disabled&&!input.checkValidity()));
    if(p.included&&result){total+=result.total;cost+=result.totalCost;profit+=result.profit;services+=result.servicesTotal;rounding+=result.roundingAdjustment;}
  }
  $('summary-list').innerHTML=state.projects.map(p=>{const r=calculate(p);return `<label class="summary-item"><input type="checkbox" data-select="${esc(p.id)}" ${p.included?'checked':''}><span class="item-title">${esc(projectName(p,state.projects))}<small>${r?(p.printingEnabled?`${p.quantity} un. × ${money(r.unitPrice)}${p.extras.length?' + serviços':''}`:'Somente serviços'):'Preencha os dados do projeto'}</small></span><strong>${r?money(r.total):'—'}</strong></label>`;}).join('');
  $('total-price').textContent=money(total);$('total-cost').textContent=money(cost);$('total-profit').textContent=money(profit);$('total-services').textContent=money(services);$('total-rounding').textContent=money(rounding);$('summary-rounding').hidden=!rounding;
  const invalid=selected().some(p=>!calculate(p));$('prepare-quote').disabled=!selected().length;
  const error=!selected().length?'Selecione pelo menos um projeto na calculadora.':invalid?'Complete os valores de todos os projetos selecionados antes de exportar.':!validMeta()?'Informe uma data válida e uma validade inteira entre 1 e 365 dias.':uploads?'Aguarde o processamento das imagens.':'';
  $('quote-error').textContent=error;
  for(const id of ['export-pdf','copy-quote','download-html','print-quote'])$(id).disabled=!!error||exporting;
  $('quote-paper').innerHTML=quoteMarkup(data());
}
function switchView(quote){$('calculator-view').hidden=quote;$('quote-view').hidden=!quote;$('calculator-tab').setAttribute('aria-pressed',String(!quote));$('quote-tab').setAttribute('aria-pressed',String(quote));}
function add(){if(state.projects.length>=100)return toast('Limite de 100 projetos por rascunho.');state.projects.push(fresh());render();persist();const card=$('projects').lastElementChild;card.querySelector('[data-field=name]').focus();card.scrollIntoView({block:'nearest'});}
function projectFrom(element){const card=element.closest('[data-id]');return {card,project:state.projects.find(p=>p.id===card?.dataset.id)};}
$('add-project').onclick=()=>{switchView(false);add();};$('add-another').onclick=add;
$('reset-proposal').onclick=()=>{
  if(uploads||exporting)return;
  $('reset-dialog').showModal();
};
$('cancel-reset').onclick=()=>$('reset-dialog').close();
$('confirm-reset').onclick=()=>{
  if(uploads||exporting)return;
  $('reset-dialog').close();
  const previous=state;state=initial();removed=null;render();switchView(false);persist();
  toast('Proposta reiniciada.',()=>{state=previous;render();persist();});
  $('add-project').focus();
};
$('calculator-tab').onclick=()=>switchView(false);$('quote-tab').onclick=()=>switchView(true);$('prepare-quote').onclick=()=>switchView(true);
$('projects').addEventListener('input',event=>{
  const element=event.target,{card,project}=projectFrom(element);if(!project)return;
  if(element.dataset.field){project[element.dataset.field]=element.type==='checkbox'?element.checked:element.value;}
  else if(element.dataset.extraField){const item=project.extras.find(e=>e.id===element.closest('[data-extra-id]').dataset.extraId);item[element.dataset.extraField]=element.value;}
  else if(element.hasAttribute('data-ref-caption')){const ref=project.references.find(r=>r.id===element.closest('[data-ref-id]').dataset.refId);ref.caption=element.value;}
  else return;
  card.dataset.touched='true';update();persist();
});
$('projects').addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button)return;
  const {card,project}=projectFrom(button);if(!project)return;
  switch(button.dataset.action){
    case 'remove':if(state.projects.length>1){const index=state.projects.indexOf(project);removed={p:project,index};state.projects.splice(index,1);render();persist();toast('Projeto removido.',true);}break;
    case 'add-extra':
      if(project.extras.length>=30)return toast('Limite de 30 serviços por projeto.');
      project.extras.push({id:crypto.randomUUID(),name:project.extras.length?'':'Modelagem 3D',amount:''});
      card.querySelector('[data-extra-list]').innerHTML=extraMarkup(project);update();persist();card.querySelector('[data-extra-list]').lastElementChild.querySelector('input').focus();break;
    case 'remove-extra':project.extras=project.extras.filter(e=>e.id!==button.closest('[data-extra-id]').dataset.extraId);card.querySelector('[data-extra-list]').innerHTML=extraMarkup(project);update();persist();break;
    case 'remove-reference':project.references=project.references.filter(r=>r.id!==button.closest('[data-ref-id]').dataset.refId);card.querySelector('[data-reference-list]').innerHTML=referenceMarkup(project);update();persist();break;
    case 'export':exportPdf([project]);break;
  }
});
$('projects').addEventListener('change',async event=>{
  if(!event.target.hasAttribute('data-photos'))return;
  const input=event.target,{card,project}=projectFrom(input),status=card.querySelector('[data-upload-status]');
  const files=Array.from(input.files);if(!files.length)return;
  if(uploads){input.value='';return toast('Aguarde as imagens que já estão sendo processadas.');}
  uploads++;input.disabled=true;status.textContent='Preparando imagens…';update();
  const errors=[];let added=0;
  try{
    for(const file of files){
      if(!state.projects.includes(project))break;
      if(project.references.length>=4){errors.push('Cada projeto aceita até 4 imagens.');break;}
      if(state.projects.reduce((sum,p)=>sum+p.references.length,0)>=40){errors.push('Limite de 40 imagens por rascunho.');break;}
      try{const ref=await prepareReference(file);if(state.projects.includes(project)){project.references.push(ref);added++;}}catch(error){errors.push(`${file.name}: ${error.message}`);}
    }
  }finally{
    uploads--;input.disabled=false;input.value='';
    // The user can add or remove projects while images are being decoded.
    const current=document.querySelector(`[data-id="${CSS.escape(project.id)}"]`);
    if(current){current.querySelector('[data-reference-list]').innerHTML=referenceMarkup(project);current.querySelector('[data-upload-status]').textContent=errors.join(' ')||`${added} imagem(ns) adicionada(s).`;}
    update();persist();if(errors.length)toast(errors.join(' '));
  }
});
$('summary-list').addEventListener('change',event=>{
  const project=state.projects.find(p=>p.id===event.target.dataset.select);if(!project)return;
  project.included=event.target.checked;document.querySelector(`[data-id="${CSS.escape(project.id)}"] [data-field=included]`).checked=project.included;update();persist();
});
document.querySelectorAll('[data-meta]').forEach(element=>element.addEventListener('input',()=>{state.meta[element.dataset.meta]=element.value;update();persist();}));
function download(content,name,type){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([content],{type}));link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),10000);}
$('copy-quote').onclick=async()=>{try{await navigator.clipboard.writeText(textQuote(data()));toast('Proposta copiada. As imagens acompanham os arquivos PDF e HTML.');}catch{toast('Não foi possível copiar. Baixe o PDF ou HTML.');}};
$('download-html').onclick=async()=>{
  exporting=true;update();const snapshot=data();
  try{const logo=await imageData(),css=await(await fetch('styles.css')).text();download(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(snapshot.title)}</title><style>${css}\nbody{background:#edf1f4;padding:24px;color-scheme:light}.paper{max-width:850px;margin:auto}@media(max-width:600px){body{padding:10px}.paper{padding:20px}}@media print{body{padding:0}body>.paper{display:block!important}.paper{box-shadow:none}}</style><body><article class="paper">${quoteMarkup(snapshot,logo)}</article></body></html>`,`proposta-${fileName(snapshot.client)}.html`,'text/html;charset=utf-8');toast('Proposta HTML baixada com as imagens. Abre sem internet.');}catch{toast('Erro ao exportar. Tente baixar o PDF.');}finally{exporting=false;update();}
};
$('print-quote').onclick=()=>window.print();
async function exportPdf(projects=selected()){
  if(uploads)return toast('Aguarde o processamento das imagens.');
  if(!projects.length||projects.some(p=>!calculate(p)))return toast('Complete os valores dos projetos antes de exportar.');
  if(!validMeta()){switchView(true);return toast('Confira a data e a validade da proposta.');}
  exporting=true;$('export-pdf').textContent='Gerando PDF…';update();
  const snapshot=data(projects),name=projects.length===1?projectName(projects[0],state.projects):snapshot.client;
  try{await createPdf(snapshot,`proposta-${fileName(name)}.pdf`);toast('PDF com serviços e referências pronto para enviar.');}
  catch(error){console.error(error);toast('Não foi possível gerar o PDF. Use Imprimir / salvar PDF.');}
  finally{exporting=false;$('export-pdf').textContent='Baixar PDF';update();}
}
$('export-pdf').onclick=()=>exportPdf();
$('backup').onclick=()=>download(JSON.stringify(state,null,2),'rascunho-anubis-3d.json','application/json');
$('restore').onclick=()=>$('import-file').click();
$('import-file').onchange=async event=>{
  try{
    const file=event.target.files[0];if(!file)return;
    if(uploads)return toast('Aguarde o processamento das imagens antes de importar.');
    if(file.size>30*1024*1024)throw new Error();
    const parsed=JSON.parse(await file.text());if(!validDraft(parsed))throw new Error();
    if(!confirm('Substituir o rascunho atual pelo arquivo importado? Salve o atual antes se quiser mantê-lo.'))return;
    state=applyPrinterProfile(normalizeDraft(parsed));render();persist();toast('Rascunho importado com serviços e imagens.');
  }catch{toast('Arquivo inválido. Escolha um rascunho exportado por esta calculadora (até 30 MB).');}
  finally{event.target.value='';}
};
render();
if(needsPrinterUpdate)persist();
