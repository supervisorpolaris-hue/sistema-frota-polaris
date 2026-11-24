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
| **Mais** | Receita do dia, Manutenção (revisão, óleo, pneu… — uma revisão atualiza a aba Frota sozinha), **Motos** (cadastrar, editar e excluir moto; KM, revisão e custos de cada uma), **Folga** (lançar e excluir a folga de um entregador), links da planilha e da pasta de arquivos. |

**Turnos fixos e entregador da lista:** o turno é escolhido em botões (padrão: **08h-14h**, **12h-18h**, **18h-00h**) e o entregador numa lista com os **cadastrados e ativos** da tela Equipe. Não dá para digitar outro nome, então a planilha fica sempre com o mesmo turno e o nome completo do entregador (bom para exportar e comparar com outros relatórios). Quem não estiver na lista precisa ser cadastrado antes em Equipe → Novo.

**Saída rápida:** ao tocar na moto, o app já preenche o **KM**, o **entregador** (o vinculado à moto no cadastro; se não houver, o último que usou a moto, só entre ativos e que não estejam na rua com outra moto) e o **turno** pelo horário (o que começa mais perto da hora atual, a partir de 2 h antes do início). Cada sugestão aparece com "Sugerido: …" embaixo do campo; o que a pessoa escolher nunca é trocado pela sugestão. No **Abastecer**, o entregador sugerido é quem está com a moto na rua.

**Cadastro de moto:** a identificação (ex.: MOTO 01) não muda depois de salva, porque os lançamentos usam esse nome. O KM informado no cadastro vale como primeira leitura da moto (o app já sugere esse KM na primeira saída e calcula a revisão). Placa no formato ABC1D23 ou ABC1234; o app recusa identificação ou placa repetida e KM da última revisão maior que o KM atual. Só dá para excluir moto que ainda não tem lançamentos; se ela saiu da frota, apague a linha na aba Frota.

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
  - Na primeira vez, a aba ENTREGADORES é preenchida sozinha com os nomes que já existem na planilha, incluindo o tamanho de camisa da aba CAMISAS. Depois de usar **Zerar o sistema**, isso fica desligado.
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

**Dados guardados no aparelho:** para abrir rápido, o app guarda no navegador do aparelho os últimos dados do Início e do painel (sem CPF nem documentos). Eles só são usados no mesmo dia e são substituídos assim que os dados atuais chegam (um círculo girando no topo indica que está atualizando). Se a pessoa perder o acesso à planilha, esses dados são apagados na próxima vez que ela abrir o app. Em celular compartilhado, saia da conta Google ou limpe os dados do navegador.

## Desempenho

- A abertura busca telas e painel numa chamada só ao servidor (`getHome`).
- Os links das fotos são lidos só das linhas que aparecem na tela, não da aba inteira.
- Depois de salvar, o botão é liberado na hora e a tela se atualiza por trás.
- As pastas de fotos do mês ficam guardadas nas propriedades do script (`FOTOS_<planilha>_<aaaa-mm>`). Se mudar a pasta de arquivos de lugar, apague essas propriedades em **Configurações do projeto → Propriedades do script**.
- Para medir: no editor do Apps Script, menu **Execuções** mostra quanto tempo cada chamada levou (`getHome`, `openShift`, `saveFuel`…).

## Escala (aba ESCALA)

Na planilha: menu **Frota Polaris → Montar escala deste mês** ou **Montar escala do próximo mês**. O app monta a grade do mês:
- linha do título (`ESCALA MÊS DE DEZEMBRO 2026`), os **dias do mês** e o **dia da semana** (sábado e domingo destacados);
- **uma linha por entregador ativo** da tela Equipe (o nome também tem lista, só com cadastrados);
- em cada dia, uma **lista**: os turnos fixos (`08h-14h`, `12h-18h`, `18h-00h`) ou **F** (folga). Vazio = não escalado. Cada turno ganha uma cor e a folga fica cinza.

Rodar o menu de novo **não apaga nada**: só acrescenta no fim do mês quem foi cadastrado depois. Os meses ficam um embaixo do outro.

O app usa a escala para:
- **Início → Escala de hoje:** quem trabalha hoje, em qual turno, quem **já saiu** e quem está **atrasado** (15 min depois do início do turno sem saída registrada);
- **Saída rápida:** ao tocar na moto, sugere quem está escalado para o turno daquele horário e ainda não saiu (preferindo o vinculado à moto) e já marca o turno da escala; ao escolher outro entregador, o turno passa a ser o da escala dele;
- **Painel:** faltas (escalado em dia passado sem turno lançado) e dias escalados no ranking.

O formato antigo (`TR` nos dias) continua sendo lido, sem horário.

## Folga (Mais → Folga)

Para registrar o dia de folga de um entregador sem abrir a planilha: **Mais → Folga**, escolher o entregador (só cadastrados), o dia (vem com hoje) e, se quiser, uma observação (ex.: "troca com Felipe").

O que acontece:
- **REGISTRO DIÁRIO** ganha uma linha com a data, o nome completo do entregador, `FOLGA` na coluna Turno, a observação e quem lançou. Filtrando a coluna Turno por `FOLGA`, saem todas as folgas do período junto com os turnos.
- **ESCALA:** o dia do entregador vira **F**. Se antes havia um turno (ex.: `12h-18h`), ele fica guardado numa **nota na célula** ("Folga lançada pelo app. Antes: 12h-18h").
- **App:** quem está de folga hoje sai da "Escala de hoje" e não é sugerido na saída rápida. O dia de folga **não conta como falta** no ranking, mesmo que a escala diga que ele trabalharia.

O app **não deixa**: lançar duas folgas no mesmo dia para a mesma pessoa, lançar folga em dia que já tem turno dela, nem lançar saída/turno para quem está de folga naquele dia (avisa para excluir a folga primeiro).

**Lançou errado?** Em "Últimas folgas", toque em **Excluir**. A linha sai do REGISTRO DIÁRIO e a escala volta ao que era antes (pela nota). Se o F já estava na escala antes do lançamento (folga planejada), ele continua lá.

Linhas `FOLGA` antigas, digitadas direto na planilha (coluna Moto ou Turno = `FOLGA`), também são reconhecidas.

## Pasta de fotos e documentos (quem pode ver)

- A pasta **"Frota Polaris — Arquivos"** fica no Drive do **dono da planilha**. Só a conta dona cria ou troca essa pasta.
- Cada pessoa que lança pelo app precisa ter acesso a ela. Isso é feito **sozinho**: quando o dono abre o app, todos os editores da planilha ganham acesso (no máximo a cada 30 min). Na hora: menu **Frota Polaris → Liberar pasta de fotos para a equipe** (só o dono).
- Se alguém lançar antes de ter acesso, a saída é gravada normalmente, a foto vai para a pasta **"Frota Polaris — arquivos aguardando liberação"** no Drive da própria pessoa, **já compartilhada com o dono**, e aparece um aviso na tela.
- Menus de manutenção (Padronizar abas, Liberar pasta, Zerar, configurar) só funcionam na conta dona.

## Padronizar abas

Na planilha: menu **Frota Polaris → Padronizar abas da planilha…**. Mostra o que vai fazer e pede confirmação:
- apaga as abas da planilha manual antiga que o sistema não usa (hoje: **Painel**) e, na aba Configurações, a linha "Receita líquida média por corrida" (só alimentava esse painel);
- deixa o cabeçalho de todas as abas do sistema no padrão laranja (texto branco, 1ª linha fixa) e a aba em laranja;
- **não mexe** em abas que não são do sistema (só avisa quais são).

A função `configurar` também aplica o padrão de cores, sem apagar nada.

## Zerar o sistema (começar do zero)

Na planilha: menu **Frota Polaris → Zerar o sistema…** (o menu aparece ao abrir a planilha). Pede duas confirmações e:
- cria antes uma **cópia de segurança** da planilha no Drive ("BACKUP … — data hora");
- apaga os dados de REGISTRO DIÁRIO, Frota, CAMISAS, ABASTECIMENTOS, RECEITAS, MANUTENÇÕES, ENTREGADORES e DOCUMENTOS (ficam cabeçalhos, fórmulas e formatação);
- deixa a aba ESCALA só com o cabeçalho do mês atual (depois de cadastrar a equipe, use **Montar escala deste mês**);
- **não mexe** na aba Configurações nem em abas que o app não usa (e avisa quais são);
- se você escolher, manda a pasta "Frota Polaris — Arquivos" para a lixeira do Drive (recuperável por 30 dias);
- desliga a importação automática de entregadores: daí em diante o cadastro é só pela tela Equipe.

Não funciona pelo app, só pela planilha.

**Depois de zerar, nesta ordem:**
1. **App → Mais → Motos → Nova moto:** identificação (ex.: MOTO 01), placa, modelo e **KM atual do painel**; última revisão (KM e data) se souber. O app mostra na hora quando será a próxima revisão. (Grava na aba Frota.)
2. **Aba Configurações:** confira a meta de corridas por turno e o intervalo de revisão (km e meses).
3. **App → Equipe → Novo:** cadastre cada entregador com salário (entra no lucro) e validade da CNH; envie os documentos.
4. **Escala:** na planilha, menu **Frota Polaris → Montar escala deste mês** (depois de cadastrar os entregadores) e preencha os turnos (veja "Escala" abaixo).
5. Na primeira saída de cada moto, digite o KM (depois o app sugere sozinho).

## Ajustes

- **Meta de corridas e intervalo de revisão:** aba Configurações da planilha.
- **Turnos fixos:** aba Configurações, uma linha por turno com `Turno` na coluna A e o horário na coluna B (ex.: `08h-14h`, `18h-00h`). As linhas são criadas sozinhas pelo **Zerar o sistema** ou pela função `configurar`. Se apagar todas, voltam a valer os 3 turnos padrão.
- **Foto do KM obrigatória:** por padrão, a saída e o retorno só são gravados com a foto do painel (no "Turno completo", só a do KM final). Para deixar opcional, crie na aba Configurações a linha `Foto do KM obrigatória` com o valor `Não` (com `Sim`, volta a exigir).
- **Salário de cada entregador:** tela Equipe. É o salário que entra no lucro.
- **Limites de alerta** (300 km, 15 dias, CNH 30 dias): no começo do `Código.gs`.

## Próximas ideias

Ocorrências (multas/acidentes com responsável), relatório mensal em PDF, acesso dos motoristas só à tela de turno, lembrete por e-mail de CNH e revisão.
