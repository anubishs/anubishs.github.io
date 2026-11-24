export class ApiRequestError extends Error {
  constructor(message,status=0,code='network_error'){super(message);this.status=status;this.code=code}
}

export class BirthdayApi {
  constructor(url,key='',fetcher=globalThis.fetch.bind(globalThis)){
    this.url=url.replace(/\/$/,'');this.key=key;this.fetcher=fetcher;
  }
  async request(path,{method='GET',body,format='json'}={}){
    if(!this.url||!this.key)throw new ApiRequestError('Informe a chave de acesso para abrir sua lista.',401,'unauthorized');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await this.fetcher(this.url+path,{method,headers:{Authorization:'Bearer '+this.key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store',credentials:'omit'});
      if(!response.ok){let error={};try{error=await response.json()}catch{}throw new ApiRequestError(error.message||'Não foi possível acessar a lista.',response.status,error.code)}
      return format==='json'?await response.json():await response.text();
    }catch(error){if(error instanceof ApiRequestError)throw error;throw new ApiRequestError(error.name==='AbortError'?'O servidor demorou para responder. Atualize a lista para confirmar a alteração.':'Não foi possível conectar ao servidor. Confira sua internet e tente novamente.')}
    finally{clearTimeout(timer)}
  }
  getState(){return this.request('/state')}
  change(path,method,body,revision){return this.request(path,{method,body:{...body,revision}})}
  export(format,scope='final'){
    if(!['final','confirmed'].includes(scope))throw new ApiRequestError('Lista de exportação inválida.',422,'invalid_scope');
    return this.request('/'+scope+'?format='+encodeURIComponent(format),{format:'text'});
  }
}
