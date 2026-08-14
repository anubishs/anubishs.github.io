# Página pública de callback OAuth

Envie os três arquivos desta pasta para uma pasta pública HTTPS do seu site:

- `index.html`
- `callback.css`
- `callback.js`

Exemplo de endereço final:

```text
https://seusite.com/oauth/mercadolivre/index.html
```

Cadastre esse endereço **exatamente igual** como Redirect URI no aplicativo do Mercado Livre e também no campo Redirect URI da aba **Marketplaces** do Affiliate Bot.

Fluxo:

```text
Mercado Livre
→ página HTTPS do seu site
→ http://localhost:3000/oauth/mercadolivre/callback
→ troca segura do código pelo backend local
```

A página pública não contém Client ID, Client Secret, access token ou refresh token. Ela encaminha apenas o código de autorização de uso único e o `state` para o bot que está rodando no mesmo computador do navegador. A validação de `state` e a troca por tokens acontecem no backend local.

Se o bot usar outra porta, altere somente a constante `LOCAL_CALLBACK` no início de `callback.js`.

Não use serviços de cache para a URL do callback. Sirva os arquivos exclusivamente por HTTPS e mantenha a política `Referrer-Policy: no-referrer`; a página já inclui a proteção equivalente em HTML.
