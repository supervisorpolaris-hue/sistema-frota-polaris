# Atualização automática (GitHub → Google Apps Script)

Depois desta configuração (feita **uma vez**), não é mais preciso copiar e colar código:

1. Uma alteração chega ao GitHub como **pedido de alteração** (pull request).
2. O GitHub roda os **testes** sozinho (simulador da planilha, com dados fictícios). Se algum falhar, a alteração fica bloqueada.
3. Você aprova clicando em **Merge**.
4. Em 1–2 minutos o GitHub publica no Apps Script uma **nova versão na mesma implantação**: **o link do app não muda**.

A automação está em `.github/workflows/publicar-apps-script.yml` e usa o **clasp**, a ferramenta oficial do Google para Apps Script.

---

## Configuração única (≈ 30 min, no computador, com a conta dona da planilha)

### Parte A — Google
1. Entre com a conta dona da planilha e abra **https://script.google.com/home/usersettings** → **API do Google Apps Script** → **Ativado**.
2. Copie o **ID do script**: planilha → **Extensões → Apps Script** → engrenagem **⚙️ Configurações do projeto** (menu da esquerda) → **IDs** → **ID do script** → **Copiar**. Guarde num Bloco de Notas.
3. Separe o **ID da implantação**: é o código do link do app entre `/s/` e `/exec`
   (`https://script.google.com/macros/s/`**ESTE-CÓDIGO**`/exec`).

### Parte B — Windows (PowerShell), para gerar o login
4. Instale o Node.js: `winget install OpenJS.NodeJS.LTS` (ou baixe a versão **LTS** em nodejs.org). **Feche e abra o PowerShell.**
5. Instale o clasp: `npm install -g @google/clasp@2.4.2`
6. Faça o login: `clasp login` → abre o navegador → escolha a **conta dona da planilha** → **Permitir** → aparece *Logged in*.
   - Se aparecer "a execução de scripts foi desabilitada", use `clasp.cmd login`.
7. Abra o arquivo do login: `notepad $HOME\.clasprc.json` → **Ctrl+A** → **Ctrl+C**.

### Parte C — GitHub (repositório → **Settings → Secrets and variables → Actions → New repository secret**)
8. **Name:** `CLASPRC_JSON` → **Secret:** cole o conteúdo do passo 7 → **Add secret**.
9. **Name:** `SCRIPT_ID` → **Secret:** o ID do script (passo 2).
10. **Name:** `DEPLOYMENT_ID` → **Secret:** o ID da implantação (passo 3).
11. Depois de salvar os 3 segredos, apague a cópia do login do computador: `Remove-Item $HOME\.clasprc.json`.
12. **Recomendado:** deixe o repositório **privado** (**Settings → General → Danger Zone → Change repository visibility → Make private**).

### Parte D — Primeira publicação
13. Aprove (Merge) o pedido de alteração aberto na `main`.
14. Em **Actions**, acompanhe "Testar e publicar no Apps Script". Verde = publicado.
15. Na planilha, aperte **F5** e use **Frota Polaris → Padronizar abas da planilha…** e **Frota Polaris → Montar escala deste mês** (ações de planilha continuam sendo 1 clique seu).

---

## Segurança
- O segredo `CLASPRC_JSON` é um **login da conta Google** com permissão para alterar os projetos do Apps Script dessa conta. Ele fica guardado de forma protegida no GitHub (ninguém consegue ler o valor depois de salvo), mas **quem tiver permissão de escrita no repositório** poderia usá-lo numa automação. Dê acesso de escrita só a quem você confia.
- Para cancelar esse login a qualquer momento: **myaccount.google.com/permissions** → aplicativo do **clasp / Apps Script CLI** → **Remover acesso**. A automação para de publicar (o app continua funcionando).
- Se a senha do Google for trocada, o login pode expirar: refaça os passos 6–8.

## Se algo der errado
| Mensagem em Actions | O que fazer |
|---|---|
| "Publicação automática ainda não configurada" | Faltam os segredos da Parte C. |
| "User has not enabled the Apps Script API" | Passo 1. |
| "invalid_grant" / "unauthorized" | Login expirou ou foi removido: refaça os passos 6–8. |
| Teste com ✗ | A alteração tem erro e **não foi publicada**. O app continua na versão anterior. |

Para voltar a uma versão anterior do app: Apps Script → **Implantar → Gerenciar implantações → ✏️ → Versão** anterior → **Implantar**.

O método manual (pasta `COLAR NO GOOGLE`, `ferramentas/montar-colar.ps1`) continua funcionando como alternativa.
