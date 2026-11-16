import {calculate,proposalTotals} from './calc.mjs';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = n => new Intl.NumberFormat('pt-BR', {style:'currency',currency:'BRL'}).format(n);
export function projectName(project, allProjects) { return project.name.trim() || `Projeto ${allProjects.indexOf(project) + 1}`; }
export function quoteData(projects, meta, allProjects) {
  const d = {
    title: meta.title.trim() || 'Proposta de impressão 3D', client:meta.client.trim() || 'Cliente não informado',
    date: /^\d{4}-\d{2}-\d{2}$/.test(meta.issued) ? new Date(meta.issued+'T12:00:00').toLocaleDateString('pt-BR') : '—',
    validity:meta.validity, payment:meta.payment, notes:meta.notes,includeBranding:meta.includeBranding!==false,
    items:projects.map(p => {
      const result = calculate(p);
      return {name:projectName(p,allProjects), description:p.description || '', printing:p.printingEnabled !== false,
        quantity:Number(p.quantity), unit:result?.unitPrice ?? null, printTotal:result?.printTotal ?? null,
        total:result?.total ?? null, roundingAdjustment:result?.roundingAdjustment ?? 0,
        extras:p.extras.map(e=>({name:e.name,amount:Number.isFinite(Number(e.amount)) ? Math.round((Number(e.amount)+Number.EPSILON)*100)/100 : null})),
        references:p.references.map(r=>({...r}))};
    })
  };
  const subtotal=d.items.some(item=>item.total===null)?null:d.items.reduce((sum,item)=>sum+item.total,0);
  const totals=proposalTotals(subtotal,meta.discountPercent??0);
  return {...d,subtotal:totals?.subtotal??null,discountPercent:totals?.discountPercent??0,discountAmount:totals?.discountAmount??null,total:totals?.total??null};
}
function itemRows(it) {
  const row=(name,qty,unit,total,description='')=>`<tr><td>${esc(name)}${description?`<small>${esc(description)}</small>`:''}</td><td>${esc(qty)}</td><td>${unit===null?'Pendente':money(unit)}</td><td>${total===null?'Pendente':money(total)}</td></tr>`;
  let rows = `<tr class="quote-project-heading"><th colspan="4">${esc(it.name)}${it.description?`<small>${esc(it.description)}</small>`:''}</th></tr>`;
  if(it.printing) rows += row('Impressão 3D',it.quantity,it.unit,it.printTotal);
  for(const extra of it.extras) rows += row(extra.name,1,extra.amount,extra.amount);
  if(it.roundingAdjustment) rows += row('Ajuste de arredondamento',1,it.roundingAdjustment,it.roundingAdjustment);
  return rows;
}
export function quoteMarkup(d,logo='assets/logo.png') {
  const branded=d.includeBranding!==false;
  const brand=branded?`<div class="paper-brand"><img src="${logo}" alt="Logo de Anubis Alves"><div>Anubis Alves<small>Impressão 3D</small></div></div>`:'';
  const discount=d.discountPercent>0?`<div class="paper-discount"><span>Subtotal</span><span>${money(d.subtotal)}</span></div><div class="paper-discount"><span>Desconto (${esc(d.discountPercent)}%)</span><span>− ${money(d.discountAmount)}</span></div>`:'';
  return `<div class="paper-head${branded?'':' unbranded'}">${brand}<div class="paper-date">Emissão: ${esc(d.date)}<br>Validade: ${esc(d.validity)} dias</div></div><h2>${esc(d.title)}</h2><p class="paper-client"><span>Preparado para</span>${esc(d.client)}</p><table><thead><tr><th>Item</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${d.items.map(itemRows).join('')}</tbody></table>${!d.items.length?'<p class="empty">Selecione os projetos na calculadora.</p>':''}<div class="paper-total">${discount}<span>Total da proposta</span><strong>${d.total===null?'Cálculo pendente':money(d.total)}</strong></div>${d.items.filter(it=>it.references.length).map(it=>`<section class="paper-section"><h3>Referências · ${esc(it.name)}</h3><div class="paper-references">${it.references.map((ref,i)=>`<figure><img src="${ref.data}" alt="${esc(ref.caption||ref.name)}"><figcaption>${esc(ref.caption||`Referência ${i+1}`)}</figcaption></figure>`).join('')}</div></section>`).join('')}${d.payment?`<section class="paper-section"><h3>Condições de pagamento</h3><p>${esc(d.payment)}</p></section>`:''}${d.notes?`<section class="paper-section"><h3>Observações e prazo</h3><p>${esc(d.notes)}</p></section>`:''}${branded?'<div class="paper-footer">Anubis Alves · Impressão 3D<br>anubisalves.com.br · anubishs@gmail.com</div>':''}`;
}
export function textQuote(d) {
  const items=d.items.map(it=>[
    it.name,it.description,
    it.printing?`Impressão 3D: ${it.quantity} un. × ${money(it.unit)} = ${money(it.printTotal)}`:'',
    ...it.extras.map(e=>`${e.name}: ${money(e.amount)}`),
    it.roundingAdjustment?`Ajuste de arredondamento: ${money(it.roundingAdjustment)}`:'',
    `Total do projeto: ${money(it.total)}`,
    it.references.length?`${it.references.length} imagem(ns) de referência incluída(s) no PDF e HTML.`:''
  ].filter(Boolean).join('\n')).join('\n\n');
  const branded=d.includeBranding!==false;
  return `${d.title}${branded?'\nAnubis Alves · Impressão 3D':''}\nCliente: ${d.client}\nEmissão: ${d.date} · Validade: ${d.validity} dias\n\n${items}${d.discountPercent>0?'\n\nSubtotal: '+money(d.subtotal)+'\nDesconto ('+d.discountPercent+'%): - '+money(d.discountAmount):''}\n\nTOTAL: ${money(d.total)}${d.payment?'\n\nCondições de pagamento:\n'+d.payment:''}${d.notes?'\n\nObservações e prazo:\n'+d.notes:''}${branded?'\n\nanubisalves.com.br · anubishs@gmail.com':''}`;
}
export function fileName(s) { return (s||'orcamento').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-').slice(0,70); }
export async function imageData() {
  const blob = await(await fetch('assets/logo.png')).blob();
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
}
export async function createPdf(d, filename) {
  if(!window.jspdf) throw new Error('Biblioteca PDF indisponível.');
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
  let y=22;const left=18,right=192,bottom=276;
  const ensure=height=>{if(y+height>bottom){pdf.addPage();y=22;}};
  const write=(text,size=10,bold=false,width=174)=>{
    pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);
    const lines=pdf.splitTextToSize(String(text),width);
    for(const line of lines){ensure(size*.45);pdf.text(line,left,y);y+=size*.45;}y+=2;
  };
  pdf.setTextColor(33,52,66);
  const branded=d.includeBranding!==false;
  if(branded){
    const logo=await imageData(), img=new Image();img.src=logo;await img.decode();
    pdf.addImage(logo,'PNG',left,y-6,16,16*img.naturalHeight/img.naturalWidth,undefined,'FAST');
    pdf.setFontSize(15);pdf.setFont('helvetica','bold');pdf.text('Anubis Alves',40,y);
    pdf.setFontSize(9);pdf.setFont('helvetica','normal');pdf.text('Impressão 3D',40,y+6);
    y+=20;
  }
  write(d.title,20,true);write(`Cliente: ${d.client}`,11);write(`Emissão: ${d.date} | Validade: ${d.validity} dias`,9);y+=6;
  for(const it of d.items){
    ensure(30);pdf.setDrawColor(210,220,226);pdf.line(left,y,right,y);y+=8;
    write(it.name,12,true);if(it.description)write(it.description,10);
    if(it.printing)write(`Impressão 3D: ${it.quantity} un. x ${money(it.unit)} = ${money(it.printTotal)}`,11);
    for(const extra of it.extras)write(`${extra.name}: ${money(extra.amount)}`,11);
    if(it.roundingAdjustment)write(`Ajuste de arredondamento: ${money(it.roundingAdjustment)}`,10);
    if(it.extras.length||it.roundingAdjustment)write(`Total do projeto: ${money(it.total)}`,11,true);
    y+=5;
  }
  ensure(d.discountPercent>0?45:30);y+=4;
  if(d.discountPercent>0){write(`Subtotal: ${money(d.subtotal)}`,11);write(`Desconto (${d.discountPercent}%): - ${money(d.discountAmount)}`,11);}
  write('Total da proposta',11);write(money(d.total),22,true);y+=7;
  for(const it of d.items.filter(it=>it.references.length)){
    ensure(25);write(`Referências - ${it.name}`,12,true);
    for(let start=0;start<it.references.length;start+=2){
      const row=it.references.slice(start,start+2);
      pdf.setFont('helvetica','normal');pdf.setFontSize(9);
      const captions=row.map((ref,i)=>pdf.splitTextToSize(ref.caption||`Referência ${start+i+1}`,81));
      const captionHeight=Math.max(...captions.map(lines=>lines.length))*4+6;
      ensure(56+captionHeight);
      for(let col=0;col<row.length;col++){
        const ref=row[col],x=left+col*89,ratio=Math.min(81/ref.width,52/ref.height),w=ref.width*ratio,h=ref.height*ratio;
        pdf.addImage(ref.data,'JPEG',x+(81-w)/2,y,w,h,undefined,'FAST');
        pdf.text(captions[col],x,y+57);
      }
      y+=58+captionHeight;
    }
    y+=5;
  }
  if(d.payment){ensure(15);write('Condições de pagamento',11,true);write(d.payment,10);y+=5;}
  if(d.notes){ensure(15);write('Observações e prazo',11,true);write(d.notes,10);}
  const pages=pdf.getNumberOfPages();
  for(let n=1;n<=pages;n++){pdf.setPage(n);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(80,102,119);if(branded)pdf.text('Anubis Alves | anubisalves.com.br | anubishs@gmail.com',18,287);pdf.text(`${n} / ${pages}`,192,287,{align:'right'});}
  pdf.save(filename);
}
