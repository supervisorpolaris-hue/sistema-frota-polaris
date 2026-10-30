# Gera os 2 arquivos prontos para colar no editor do Apps Script:
#   COLAR NO GOOGLE\1 - Codigo.txt  → cole em Código.gs
#   COLAR NO GOOGLE\2 - Index.txt   → cole em Index.html (já com logo, estilos e script embutidos)
$raiz = Split-Path -Parent $PSScriptRoot
$src = Join-Path $raiz 'apps-script'
$dst = Join-Path $raiz 'COLAR NO GOOGLE'
New-Item -ItemType Directory -Force $dst | Out-Null
$utf8 = New-Object Text.UTF8Encoding $false
$ler = { param($nome) [IO.File]::ReadAllText((Join-Path $src $nome)) }

$index = & $ler 'Index.html'
$index = $index.Replace("<?!= include('Brand'); ?>", (& $ler 'Brand.html'))
$index = $index.Replace("<?!= include('Styles'); ?>", (& $ler 'Styles.html'))
$index = $index.Replace("<?!= include('App'); ?>", (& $ler 'App.html'))
if ($index -match "include\(") { throw 'Sobrou algum include() no Index montado.' }

[IO.File]::WriteAllText((Join-Path $dst '1 - Codigo.txt'), (& $ler 'Code.gs'), $utf8)
[IO.File]::WriteAllText((Join-Path $dst '2 - Index.txt'), $index, $utf8)
Get-ChildItem $dst -Filter '*.txt' | ForEach-Object { '{0}  ({1} KB)' -f $_.Name, [Math]::Round($_.Length / 1KB) }
