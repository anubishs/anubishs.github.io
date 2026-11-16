import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,proposalTotals} from '../calculadora/calc.mjs';
import {createDraft} from '../calculadora/draft.mjs';
import {normalizeDraft,validDraft} from '../calculadora/storage.mjs';
import {quoteData,quoteMarkup,textQuote,createPdf} from '../calculadora/quote.mjs';

function sample(meta={}){
  const draft=createDraft();draft.projects[0]={...draft.projects[0],name:'Suporte',filamentUsed:200,printHours:4,extras:[{id:'model',name:'Modelagem',amount:150.25}]};
  draft.meta={...draft.meta,client:'Cliente de teste',...meta};return draft;
}
test('discount is applied once after project quantity, services and rounding',()=>{
  const draft=sample({discountPercent:10});draft.projects[0].quantity=3;draft.projects[0].roundTotal=true;
  const projectPrice=calculate(draft.projects[0]).total;
  const data=quoteData(draft.projects,draft.meta,draft.projects);
  assert.equal(projectPrice,431);assert.equal(data.subtotal,431);assert.equal(data.discountAmount,43.1);assert.equal(data.total,387.9);
  assert.equal(calculate(draft.projects[0]).total,431,'discount never mutates project pricing');
  assert.match(quoteMarkup(data),/Desconto \(10%\)/);assert.match(textQuote(data),/387,90/);
});
test('discount cents reconcile, including zero and full discounts, and invalid percentages are rejected',()=>{
  assert.deepEqual(proposalTotals(93.61,10),{subtotal:93.61,discountPercent:10,discountAmount:9.36,total:84.25});
  assert.equal(proposalTotals(93.61,0).total,93.61);assert.equal(proposalTotals(93.61,100).total,0);
  assert.equal(proposalTotals(.05,10).discountAmount,.01);assert.equal(proposalTotals(.05,10).total,.04);
  for(const percentage of ['',-1,100.01,Infinity,'no'])assert.equal(proposalTotals(100,percentage),null);
});
test('branding is optional across previews and text without altering prices or customer content',()=>{
  const branded=sample(),plain=sample({includeBranding:false,discountPercent:15});
  const normal=quoteData(branded.projects,branded.meta,branded.projects),neutral=quoteData(plain.projects,plain.meta,plain.projects);
  assert.match(quoteMarkup(normal),/Anubis Alves/);assert.match(textQuote(normal),/anubishs@gmail.com/);
  const html=quoteMarkup(neutral),text=textQuote(neutral);
  for(const token of ['Anubis Alves','anubisalves.com.br','anubishs@gmail.com','Logo de Anubis']){assert.ok(!html.includes(token));assert.ok(!text.includes(token));}
  assert.match(html,/Cliente de teste/);assert.match(html,/Modelagem/);assert.equal(normal.subtotal,neutral.subtotal);
});
test('branding and discount preferences survive draft normalization and older drafts keep branded defaults',()=>{
  const draft=sample({includeBranding:false,discountPercent:12.5});assert.ok(validDraft(draft));
  const restored=normalizeDraft(JSON.parse(JSON.stringify(draft)));assert.equal(restored.meta.includeBranding,false);assert.equal(restored.meta.discountPercent,12.5);
  delete draft.meta.includeBranding;delete draft.meta.discountPercent;
  const legacy=normalizeDraft(draft);assert.equal(legacy.meta.includeBranding,true);assert.equal(legacy.meta.discountPercent,0);
  assert.equal(validDraft({...draft,meta:{...draft.meta,includeBranding:'false'}}),false);
});
test('unbranded multipage PDFs omit logos and brand text, retain page numbers and the final discounted total',async()=>{
  const texts=[],images=[],saved=[];let pages=1;
  class Pdf{
    setFont(){}setFontSize(){}setTextColor(){}setDrawColor(){}line(){}setPage(){}
    splitTextToSize(text){return [text];}text(text){texts.push(String(text));}addImage(...args){images.push(args);}
    addPage(){pages++;}getNumberOfPages(){return pages;}save(name){saved.push(name);}
  }
  const oldWindow=globalThis.window;globalThis.window={jspdf:{jsPDF:Pdf}};
  try{
    const draft=sample({includeBranding:false,discountPercent:10});
    draft.projects=Array.from({length:15},(_,i)=>({...draft.projects[0],id:'project-'+i,name:'Projeto '+(i+1)}));
    const data=quoteData(draft.projects,draft.meta,draft.projects);await createPdf(data,'proposta-sem-marca.pdf');
    assert.ok(pages>1);assert.equal(images.length,0);assert.equal(saved[0],'proposta-sem-marca.pdf');
    const all=texts.join('\n');for(const token of ['Anubis','anubisalves','anubishs'])assert.ok(!all.includes(token));
    assert.ok(texts.includes(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(data.total)));
    for(let n=1;n<=pages;n++)assert.ok(texts.includes(`${n} / ${pages}`));
  }finally{globalThis.window=oldWindow;}
});
