# Sistema Frota Polaris

App web para o controle diário da frota de motos da **Polaris Entregas**: turnos, abastecimentos, manutenções, receita, entregadores com documentos e um painel para apoiar as decisões.

Funciona no celular e no computador. É feito com **Google Apps Script** e grava direto numa planilha do Google Sheets, então não há servidor nem banco de dados para manter.

## O que o app faz

- **Início:** resumo do dia (motos na rua, corridas e receita de hoje), atalhos, alertas e a escala do dia.
- **Painel:**
  - receita, custos (combustível + manutenção + salários rateados), lucro e margem;
  - custo por corrida, consumo (km/l) e % de turnos que bateram a meta;
  - tudo comparado com o período anterior;
  - frases automáticas que explicam os números;
  - gráficos diários, custo por km de cada moto, previsão de revisão e ranking de entregadores.
- **Turnos:** saída (KM automático, foto do painel, checklist), retorno (KM final com foto, corridas e meta) e lançamento de turno completo.
- **Abastecer:** valor, litros, KM com foto e cupom. Calcula o consumo real pelo método do tanque cheio.
- **Equipe:** cadastro dos entregadores e envio de documentos (CNH, RG/CPF, comprovante de residência, contrato). Avisa quando a CNH está vencida ou perto de vencer.
- **Mais:** receita do dia, manutenções (uma revisão atualiza a próxima automaticamente) e situação das motos.
- **Alertas:** revisão vencida ou próxima, CNH, documentos faltando, turnos sem retorno, dias sem receita, consumo que piorou.

## Estrutura

```
apps-script/
  Code.gs       servidor: leitura e gravação na planilha, cálculos do painel, alertas, arquivos no Drive
  Index.html    estrutura das telas
  App.html      lógica das telas (navegação, formulários, fotos, gráficos)
  Styles.html   visual (identidade Polaris: laranja #FD4502 → #FCA102, Montserrat)
  Brand.html    logo embutida (PNG em base64)
  LEIA-ME.md    guia de instalação e uso
ferramentas/
  montar-colar.ps1   gera os 2 arquivos prontos para colar no editor do Apps Script
```

## Planilha esperada

- **Abas lidas:** `REGISTRO DIÁRIO`, `Frota`, `Configurações`, `ESCALA`, `CAMISAS`.
- **Abas criadas pelo app** (pela função `configurar`): `ABASTECIMENTOS`, `RECEITAS`, `MANUTENÇÕES`, `ENTREGADORES`, `DOCUMENTOS`.
- **Fotos e documentos:** ficam na pasta `Frota Polaris — Arquivos` do Google Drive, ao lado da planilha.

## Instalação

1. Rode `ferramentas/montar-colar.ps1` no PowerShell. Ele cria a pasta `COLAR NO GOOGLE/` com:
   - `1 - Codigo.txt`
   - `2 - Index.txt` (Index com a logo, os estilos e o script já embutidos)
2. Na planilha, abra **Extensões → Apps Script** e cole:
   - `1 - Codigo.txt` em `Código.gs`
   - `2 - Index.txt` em um arquivo HTML chamado `Index`
3. Rode a função **`configurar`**.
4. **Implantar → App da Web**, com:
   - **Executar como:** *Usuário que acessa o app da Web*
   - **Quem pode acessar:** *Qualquer pessoa com uma Conta do Google*
5. Compartilhe a planilha (como Editor) com quem vai usar o app e rode **`compartilharPasta`**.

Os detalhes estão em [`apps-script/LEIA-ME.md`](apps-script/LEIA-ME.md).

Para trabalhar no projeto em outro computador (clonar, alterar, enviar e publicar), veja [`GUIA-OUTRA-MAQUINA.md`](GUIA-OUTRA-MAQUINA.md).

## Segurança

O app roda com a conta de quem o abre. Por isso, **só quem tem acesso à planilha consegue usar o app**, e os documentos dos entregadores ficam protegidos pelo compartilhamento do Google Drive. O código não guarda senhas, chaves nem IDs de planilha: o ID é salvo nas propriedades do script quando `configurar` roda.
