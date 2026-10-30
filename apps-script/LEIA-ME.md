# Frota Polaris — App web (v2)

App no navegador (celular ou PC) com a identidade da Polaris Entregas.
Ele grava na planilha **Controle_Frota_Polaris** e guarda fotos e documentos no Google Drive.

## Telas

| Menu | O que tem |
|---|---|
| **Início** | Resumo do dia (motos na rua, corridas e receita de hoje), atalhos (Saída, Retorno, Abastecer, Receita), **alertas**, escala do dia e **painel**. |
| **Turnos** | Saída (KM automático, foto do painel, checklist de pneus/freios/luzes/óleo), Retorno (KM final com foto, corridas, meta) e Turno completo. |
| **Abastecer** | Valor, litros, KM com foto, tanque cheio, posto e foto do cupom. Calcula o **consumo real** (km/l) de um tanque cheio ao outro. |
| **Equipe** | Cadastro dos entregadores (dados, CNH, salário, PIX, camisa, situação) e **documentos**: CNH, RG/CPF, comprovante de residência, contrato/termo da moto e outros. |
| **Mais** | Receita do dia, Manutenção (revisão, óleo, pneu… — uma revisão atualiza a aba Frota sozinha), Motos, links da planilha e da pasta de arquivos. |

**O painel** mostra, para hoje, 7 ou 30 dias, este mês ou o mês passado, sempre comparando com o período anterior:
- **Números principais:** receita, custos (combustível + manutenção + salários rateados por dia), **resultado (lucro)** e margem, corridas, custo por corrida, consumo médio, KM e % de turnos na meta.
- **"O que os números dizem":** frases automáticas. Exemplos: moto mais cara por km, destaque e atenção entre os entregadores, faltas na escala, previsão da revisão, projeção do mês.
- **Gráficos:** receita × custos por dia e corridas/KM por dia.
- **Frota:** KM, revisão (por KM, por data e previsão pelo ritmo de uso), custo por km e consumo de cada moto.
- **Ranking de entregadores** e **para onde vai o dinheiro**.
- **Alertas:** revisão vencida ou próxima, CNH vencida ou vencendo, documentos faltando, turnos sem retorno, dias sem receita, consumo que piorou, salários não informados.

## Abas da planilha

- **Lidas:** REGISTRO DIÁRIO, Frota, Configurações, ESCALA, CAMISAS.
- **Criadas pelo app:** ABASTECIMENTOS, RECEITAS, MANUTENÇÕES, ENTREGADORES e DOCUMENTOS.
  - Na primeira vez, a aba ENTREGADORES é preenchida sozinha com os nomes que já existem na planilha, incluindo o tamanho de camisa da aba CAMISAS.
- **REGISTRO DIÁRIO:** ganha as colunas Hora saída, Hora retorno, Checklist, Foto KM Início, Foto KM Fim e Lançado por.
  - O combustível não é mais lançado no turno. Os lançamentos antigos continuam contando nos custos.
- **Pasta no Drive:** "Frota Polaris — Arquivos" (ao lado da planilha), com as subpastas **Fotos** (uma por mês) e **Documentos dos entregadores** (uma por pessoa).

## Instalação / atualização

Os arquivos prontos para colar estão na pasta **COLAR NO GOOGLE**:
- `1 - Codigo.txt` → cole no arquivo **Código.gs**
- `2 - Index.txt` → cole no arquivo **Index.html** (já inclui a logo, o visual e as telas)

1. Na planilha: **Extensões → Apps Script**. Cole os 2 arquivos (Ctrl+A e Ctrl+V em cada um) e salve.
2. Escolha a função **`configurar`** e clique em **Executar**. Autorize se o Google pedir. Ela:
   - cria as abas novas;
   - importa os entregadores;
   - cria as pastas;
   - dá acesso à pasta de arquivos para quem já edita a planilha.
3. Rode **`testeSistema`** e confira no registro: motos, entregadores, números de 30 dias e alertas.
4. **Implantar → Gerenciar implantações → lápis:**
   - **Versão:** Nova versão
   - **Executar como:** *Usuário que acessa o app da Web*
   - **Quem pode acessar:** *Qualquer pessoa com uma Conta do Google*
   - Clique em **Implantar**. O link continua o mesmo.

## Quem pode usar (segurança)

Com "Executar como: usuário que acessa", **só entra quem tem acesso à planilha**. Os documentos (CPF, CNH) ficam protegidos.

Para liberar uma pessoa do escritório:
1. Compartilhe a planilha com o e-mail dela como **Editor**.
2. Rode **`compartilharPasta`** no editor. Ela ganha acesso à pasta de fotos e documentos.
3. Mande o link do app. No primeiro acesso, o Google pede que ela autorize o app.

Quem não tiver acesso vê a mensagem "Sem acesso". Cada lançamento registra o e-mail de quem fez (coluna "Lançado por").

## Ajustes

- **Meta de corridas e intervalo de revisão:** aba Configurações da planilha.
- **Salário de cada entregador:** tela Equipe. É o salário que entra no lucro.
- **Limites de alerta** (300 km, 15 dias, CNH 30 dias): no começo do `Código.gs`.

## Próximas ideias

Ocorrências (multas/acidentes com responsável), relatório mensal em PDF, acesso dos motoristas só à tela de turno, lembrete por e-mail de CNH e revisão.
