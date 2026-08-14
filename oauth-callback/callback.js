(() => {
  'use strict';
  const LOCAL_CALLBACK = 'http://localhost:3000/oauth/mercadolivre/callback';
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const title = document.getElementById('title');
  const message = document.getElementById('message');
  const spinner = document.getElementById('spinner');
  const icon = document.getElementById('icon');
  const button = document.getElementById('continueButton');
  const help = document.getElementById('help');
  const callbackUrl = document.getElementById('callbackUrl');

  const fail = text => {
    spinner.hidden = true;
    icon.hidden = false;
    icon.className = 'icon error';
    icon.textContent = '!';
    title.textContent = 'Não foi possível conectar';
    message.textContent = text;
  };

  if ((!code && !error) || !state || state.length > 500 || (code && code.length > 2000)) {
    fail('A resposta de autorização está incompleta ou é inválida. Volte ao painel e inicie a conexão novamente.');
    return;
  }

  const target = new URL(LOCAL_CALLBACK);
  if (code) target.searchParams.set('code', code);
  if (state) target.searchParams.set('state', state);
  if (error) target.searchParams.set('error', error.slice(0, 200));
  if (errorDescription) target.searchParams.set('error_description', errorDescription.slice(0, 500));

  button.href = target.href;
  button.hidden = false;
  help.hidden = false;
  callbackUrl.textContent = target.href;

  setTimeout(() => window.location.replace(target.href), 700);
})();
