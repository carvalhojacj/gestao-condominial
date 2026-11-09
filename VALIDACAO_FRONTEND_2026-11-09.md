# Validação da modernização do frontend

Data: 9 de novembro de 2026. Projeto: Gestão condominial, disciplina Transformação Digital.

## O que foi entregue

O endereço `https://carvalhojacj.github.io/gestao-condominial/` mantém as cinco áreas e as rotas anteriores. O cabeçalho e o menu lateral contextual seguem a área escolhida. O painel agora destaca quatro indicadores, prazos, valores e ações que levam a telas existentes. Cores, espaçamentos, formulários, cartões, foco e mensagens seguem padrões reutilizáveis. O layout foi ajustado para celular. O título e a ação do formulário mudam corretamente durante a edição. A busca de atividades atualiza apenas a lista e os filtros, sem recalcular todo o painel a cada tecla.

O sistema continua estático, em HTML, CSS e JavaScript. Não há dependência de produção, API, conta, sincronização ou banco de dados. As chaves de armazenamento local e o formato de exportação JSON versão 2 foram preservados; a importação aceita a versão 1.

## Verificações realizadas

| Verificação | Resultado observado |
| --- | --- |
| Sintaxe | `node --check` passou nos arquivos JavaScript e no roteiro de teste. |
| Publicação | O GitHub Pages publicou a versão modernizada e a página abriu pelo endereço habitual. |
| Desktop | Cabeçalho, painel, menus, cartões e formulários foram inspecionados visualmente na página publicada. |
| Celular | A 390 px, as cinco áreas do menu permaneceram visíveis, o menu contextual foi exibido e não houve rolagem horizontal. O painel se reorganizou em uma coluna, com quatro indicadores em duas colunas. |
| Cadastros | Morador fictício criado, editado e excluído. Os fluxos de funcionários e empresas permanecem no roteiro automatizado, mas não foram repetidos manualmente nesta sessão. |
| Atividades | Cadastro, validação de data, filtro, limpeza do filtro, edição, cancelamento da edição e exclusão conferidos com registros fictícios. O erro do campo recebeu foco e descrição associada. |
| Financeiro | Uma atividade com previsto de R$ 100,00 e realizado de R$ 120,25 exibiu diferença de R$ 20,25 e 20,3%. |
| Backup | Exportação da versão 2 iniciou o download e apresentou confirmação. A reimportação restaurou o registro fictício. A importação de um arquivo versão 1 trouxe uma atividade fictícia legada. |
| Persistência | Recarregar a página preservou os registros no mesmo navegador. |
| Console | Nenhum erro foi observado no console durante os fluxos verificados. |

As capturas de revisão ficam em `preview-qa/`. O registro legado usado para testar a versão 1 ficou somente no armazenamento do navegador temporário de teste; o navegador travou em uma caixa de confirmação ao tentar excluí-lo, então a limpeza final desse registro não foi confirmada. Nenhum dado pessoal real foi usado.

## Limites da validação

O roteiro `smoke-test.cjs` foi atualizado, mas não pôde ser executado aqui: o Playwright não está instalado neste ambiente e a instalação pela rede não concluiu. Portanto, não há resultado de suíte automatizada. Não foram feitas auditoria completa com leitor de tela, medição numérica de Core Web Vitals, teste em navegador móvel físico ou comparação automatizada de imagens. A inspeção visual e os fluxos manuais não comprovam conformidade integral com WCAG 2.2 AA.

Para reproduzir o teste automatizado em um ambiente com rede, execute `npm install`, `npx playwright install chromium`, `npm run check` e `npm test` nesta pasta. O Playwright é apenas uma dependência de desenvolvimento.

## Próximos cuidados

Na apresentação, cadastrar somente dados fictícios. Antes de trocar de celular ou limpar o navegador, exportar o JSON e guardá-lo em local privado. A visita presencial e o relatório acadêmico ainda dependem da atividade real, das fotos com descrição, da contagem de participantes e da lista de presença assinada e carimbada pela instituição.
