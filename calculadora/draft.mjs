export const PRINTER_PROFILE = 'printer-10000-3000';
export const DEPRECIATION_RATE = Math.round(10000 / 3000 * 100) / 100;
export function createProject() {
  return {id:crypto.randomUUID(),name:'',description:'',filamentPrice:100,filamentUsed:'',printHours:'',printerPower:100,energyRate:.725,depreciationRate:DEPRECIATION_RATE,markup:300,quantity:1,included:true,printingEnabled:true,roundUnit:false,roundTotal:false,extras:[],references:[]};
}
export function createDraft() {
  return {version:1,printerProfile:PRINTER_PROFILE,projects:[createProject()],meta:{client:'',title:'Proposta de impressão 3D',issued:new Date().toLocaleDateString('en-CA'),validity:15,payment:'',notes:'',includeBranding:true,discountPercent:0}};
}
export function applyPrinterProfile(draft) {
  if(draft.printerProfile === PRINTER_PROFILE) return draft;
  return {...draft,printerProfile:PRINTER_PROFILE,projects:draft.projects.map(p=>({...p,depreciationRate:DEPRECIATION_RATE}))};
}
