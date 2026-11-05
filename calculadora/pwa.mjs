const button = document.getElementById('install-app');
const standalone = window.matchMedia('(display-mode: standalone)');
const isInstalled = () => standalone.matches || window.navigator.standalone === true;
let installPrompt = null;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  if (isInstalled()) return;
  installPrompt = event;
  button.hidden = false;
});

button.addEventListener('click', async () => {
  if (!installPrompt || isInstalled()) return;
  const prompt = installPrompt;
  installPrompt = null;
  button.hidden = true;
  button.disabled = true;
  try {
    await prompt.prompt();
    await prompt.userChoice;
  } catch (error) {
    console.warn('O navegador não concluiu a solicitação de instalação.', error);
  } finally {
    button.disabled = false;
    // Only a fresh browser event can provide another usable install prompt.
    button.hidden = isInstalled() || !installPrompt;
  }
});

function hideInstall() {
  installPrompt = null;
  button.hidden = true;
}
window.addEventListener('appinstalled', hideInstall);
standalone.addEventListener?.('change', () => { if (isInstalled()) hideInstall(); });

async function registerOfflineSupport() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    await navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), {updateViaCache:'none'});
  } catch (error) {
    console.warn('Não foi possível preparar o modo offline.', error);
  }
}
if (document.readyState === 'complete') registerOfflineSupport();
else window.addEventListener('load', registerOfflineSupport, {once:true});
