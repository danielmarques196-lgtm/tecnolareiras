# Pasta `dados/`

Coloque aqui o CSV exportado da app anterior (por exemplo `caderno-antigo.csv`).
Os ficheiros `.csv` desta pasta **não vão para o Git** (podem ter dados pessoais), exceto o exemplo.

Os dados da app vivem no browser de cada dispositivo, por isso a importação faz-se na própria app:
**Definições → Importar CSV da app anterior → Escolher ficheiro CSV**. A app mostra uma pré-visualização
(quantos registos de cada tipo, setores novos, linhas com problemas) antes de gravar.

- Separador `;` (também aceita `,`), com ou sem BOM; datas `dd/mm/aaaa`; decimais com vírgula ou ponto.
- Colunas: `data;tipo;setor;produto;substancia;apv;alvo;dose;unidade;calda;is;aplicador;equipamento;modo;volume;horas;h2o2;operacao;horasMO;intensidade;descricao;kg;destino;calibre;custo;notas`
- Tipos reconhecidos pelo nome: «Tratamento fitossanitário», «Adubação / fertirrega», «Rega», «Operação cultural»,
  «Observação de pragas/doenças», «Colheita» (maiúsculas e acentos não importam).
- Setores que ainda não existam são criados (cultura romãzeira). Setor vazio ou «Toda a exploração» = toda a exploração.
- Importar o mesmo ficheiro duas vezes não duplica registos.

`exemplo-importacao.csv` tem dados **fictícios** só para ver o formato — não o importe para a app real.
