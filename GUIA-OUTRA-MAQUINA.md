# Guia: trabalhar no projeto em outra máquina, com outro usuário

Este guia mostra como baixar (clonar) o projeto num computador Windows, fazer alterações, mandar de volta para o GitHub e publicar as mudanças no app.

---

## Parte 1 — Liberar o acesso (o dono do repositório faz uma vez)

1. No GitHub, abra o repositório **supervisorpolaris-hue/sistema-frota-polaris**.
2. Vá em **Settings → Collaborators → Add people**.
3. Digite o usuário ou o e-mail do GitHub da outra pessoa e confirme.
4. A outra pessoa recebe um convite por e-mail (ou em github.com/notifications) e clica em **Accept invitation**.

> Sem esse convite a pessoa consegue **baixar** o projeto, porque ele é público, mas **não consegue enviar** alterações.

Para **publicar no app**, a pessoa também precisa de acesso à planilha. O dono abre a planilha → **Compartilhar** → coloca o e-mail Google da pessoa como **Editor**.

---

## Parte 2 — Preparar a outra máquina (uma vez)

Abra o **PowerShell**: menu Iniciar → digite *PowerShell* → Enter.

**1. Instalar o Git**
```powershell
winget install --id Git.Git -e
```
Se o Windows pedir permissão de administrador, clique em **Sim**. Depois **feche e abra o PowerShell de novo**.

**2. Conferir a instalação**
```powershell
git --version
```
Deve aparecer algo como `git version 2.x`.

**3. Dizer ao Git quem você é** (só uma vez por computador)
```powershell
git config --global user.name "Seu Nome"
git config --global user.email "SEU_USUARIO@users.noreply.github.com"
```
> Use o e-mail `...@users.noreply.github.com` (troque `SEU_USUARIO` pelo seu usuário do GitHub). O repositório é público e esse endereço não expõe o seu e-mail real.

**4. (Opcional) Instalar um editor de código**
```powershell
winget install --id Microsoft.VisualStudioCode -e
```

---

## Parte 3 — Baixar (clonar) o projeto (uma vez)

```powershell
cd $HOME\Documents
git clone https://github.com/supervisorpolaris-hue/sistema-frota-polaris.git
cd sistema-frota-polaris
```

O projeto fica em **Documentos\sistema-frota-polaris**:

```
apps-script/        código do sistema (Code.gs, Index.html, App.html, Styles.html, Brand.html)
ferramentas/        montar-colar.ps1 (gera os arquivos para colar no Google)
README.md           o que é o sistema
```

---

## Parte 4 — Rotina para alterar o projeto

Sempre dentro da pasta do projeto (`cd $HOME\Documents\sistema-frota-polaris`):

**1. Antes de começar, pegue a versão mais nova**
```powershell
git pull
```

**2. Altere os arquivos** em `apps-script/`, no editor que preferir.

**3. Veja o que mudou**
```powershell
git status
```

**4. Salve a alteração com uma descrição**
```powershell
git add -A
git commit -m "Descreva aqui o que mudou"
```

**5. Envie para o GitHub**
```powershell
git push
```
Na **primeira vez** abre uma janela do GitHub: clique em **Sign in with your browser**, entre com **a sua conta** e autorize. Nas próximas vezes não pede mais.

---

## Parte 5 — Publicar a alteração no app (Google Apps Script)

O GitHub guarda o código, mas o app só muda depois que o código é colado no Google.

**1. Gere os arquivos para colar**
```powershell
powershell -ExecutionPolicy Bypass -File .\ferramentas\montar-colar.ps1
```
Ele cria a pasta **COLAR NO GOOGLE** com `1 - Codigo.txt` e `2 - Index.txt`. Essa pasta **nunca vai para o GitHub**, porque está no `.gitignore`.

**2. Abra o editor:** abra a planilha do sistema → **Extensões → Apps Script**.

**3. Cole os arquivos** (Ctrl+A e Ctrl+C no Bloco de Notas, Ctrl+A e Ctrl+V no editor):
- `1 - Codigo.txt` → arquivo **Código.gs**
- `2 - Index.txt` → arquivo **Index.html**

Depois aperte **Ctrl+S**.

**4. Rode `configurar`** só se a alteração criou abas ou colunas novas: escolha **configurar** na lista de funções e clique em **Executar**.

**5. Publique a versão nova:** **Implantar → Gerenciar implantações → ✏️ lápis**
- **Versão:** *Nova versão*
- **Executar como:** *Usuário que acessa o app da Web*
- **Quem pode acessar:** *Qualquer pessoa com uma Conta do Google*
- Clique em **Implantar**. O link do app continua o mesmo.

---

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| `git não é reconhecido como nome de cmdlet` | Feche e abra o PowerShell de novo depois de instalar o Git. |
| `rejected ... fetch first` ao dar `git push` | Alguém enviou alterações antes. Rode `git pull` e depois `git push` de novo. |
| `CONFLICT` depois do `git pull` | Os dois mexeram na mesma parte. Abra o arquivo indicado, escolha o trecho certo entre `<<<<<<<`, `=======` e `>>>>>>>`, apague essas marcas, salve e rode `git add -A`, `git commit -m "Resolve conflito"` e `git push`. |
| `Permission denied` / `403` ao enviar | O convite da Parte 1 não foi aceito, ou o Git está com outra conta. Para trocar: Iniciar → **Gerenciador de Credenciais** → **Credenciais do Windows** → remova as que têm `github.com` e rode `git push` de novo. |
| `a execução de scripts foi desabilitada` | Rode o script com `powershell -ExecutionPolicy Bypass -File ...`, como na Parte 5. |
| O app não mudou depois de colar | Faltou a Parte 5, passo 5 (**Nova versão**). |

---

## Alternativa sem comandos: GitHub Desktop

Se preferir botões em vez de comandos:

1. Instale com `winget install --id GitHub.GitHubDesktop -e`, ou baixe em desktop.github.com.
2. Entre com a sua conta do GitHub.
3. **File → Clone repository** → escolha `supervisorpolaris-hue/sistema-frota-polaris`.
4. Para trabalhar no dia a dia:
   - **Fetch/Pull origin** antes de começar;
   - altere os arquivos;
   - escreva um resumo e clique em **Commit to main**;
   - clique em **Push origin**.

A Parte 5 (publicar no app) é igual.

---

## Cuidados

- **Nunca coloque no repositório** links do app, IDs da planilha, senhas ou documentos de entregadores. O repositório é **público**.
- Faça `git pull` **antes** de começar a mexer. Isso evita conflitos.
- Um commit por assunto, com uma descrição clara ("Corrige cálculo de consumo", "Adiciona campo X").
