# Gestão condominial

Protótipo acadêmico para apresentar, no celular ou computador, o acompanhamento do plano de trabalho de um condomínio. Foi feito em HTML, CSS e JavaScript, sem pacotes externos nem servidor de dados.

O sistema inclui automaticamente, uma única vez, um conjunto de dados **inteiramente fictícios**: cinco atividades, quatro moradores, três funcionários, quatro empresas, seis lançamentos financeiros e sete documentos financeiros de exemplo, além do documento demonstrativo de uma atividade. Isso também ocorre em navegadores já usados, sem substituir registros existentes. Em **Configurações**, o botão **Adicionar dados fictícios** pode repor exemplos excluídos.

Endereço publicado: https://carvalhojacj.github.io/gestao-condominial/

## O que esta versão faz

- **Painel:** destaca atividades, concluídas, atrasadas, valores, próximos prazos e ações rápidas.
- **Plano de trabalho:** cadastra, edita, filtra e exclui atividades. Cada atividade pode ter natureza da despesa, categoria, responsável, empresa prestadora, prazo, situação, valores e link HTTPS de comprovante. A página **Previsto x realizado** resume os valores do plano.
- **Pessoas:** permite cadastrar unidades e moradores, funcionários e empresas prestadoras para a demonstração. Use apenas nomes e informações fictícias.
- **Financeiro:** registra entradas e saídas em um extrato demonstrativo com data, descrição, categoria, subcategoria, valor e saldo após cada lançamento. Cada movimentação pode ter vários documentos fictícios, e um documento pode estar ligado a mais de uma movimentação. A aba **Documentos** mantém também uma lista dos documentos que aguardam movimentação. A conferência manual com o extrato e a suficiência da documentação aparecem separadamente. **Categorias** permite criar, renomear e excluir categorias e subcategorias. **Comprovantes** continua reunindo os links das atividades do plano.
- **Configurações:** exporta e importa uma cópia JSON dos registros. A versão 5 inclui atividades, cadastros, lançamentos, categorias, documentos e vínculos. Cópias das versões 1 a 4 continuam importáveis; a versão 4 não contém documentos, a versão 3 substitui lançamentos e mantém os documentos atuais sem vínculos com lançamentos removidos, e as versões 1 e 2 mantêm todo o financeiro.

Nas três telas de **Pessoas**, a relação completa aparece primeiro, em linhas compactas. Moradores são ordenados por unidade; funcionários e empresas, por nome. O botão de novo cadastro abre o formulário abaixo da lista; ao salvar ou cancelar, a relação volta a ser o foco. No celular, as linhas se reorganizam sem rolagem lateral.

O comparativo de valores do plano mostra uma tabela no computador e cartões com os mesmos valores no celular. O extrato também tem tabela no computador e cartões no celular, agora com quantidade e situação dos documentos. A lista de comprovantes das atividades mantém o link ao lado da atividade quando há espaço.

A relação de atividades também usa linhas compactas com responsável, situação, prazo, valores e ações. A busca fica visível; situação, categoria, natureza e mês ficam em **Filtros adicionais**. **Ver detalhes** abre categoria, empresa prestadora, diferença de valores, observações e o link do comprovante quando essas informações existirem.

O menu superior seleciona uma área; o menu lateral mostra as funções dessa área. No celular, as opções laterais aparecem em uma faixa horizontal abaixo do menu superior.

O título e o botão do formulário indicam quando uma atividade está em edição. Mensagens de erro apontam o campo que precisa de correção; a exportação informa que o download foi iniciado.

## Como demonstrar

1. Abra o endereço publicado. A página inicial mostra apenas exemplos fictícios.
2. Em **Plano de trabalho**, consulte prazos, situações e filtros; depois experimente criar ou editar uma atividade fictícia.
3. Em **Pessoas**, examine os cadastros de exemplo ou crie outros fictícios.
4. Em **Plano de trabalho > Previsto x realizado**, compare os valores das atividades. Em **Financeiro > Extrato**, filtre as pendências e abra **Documentos** no lançamento de água para ver fatura, pagamento e conferência fictícios. O lançamento de energia mostra documentação parcial; a lista de documentos inclui uma fatura aguardando movimentação. Em **Categorias**, veja os totais. Abra o documento da atividade em **Comprovantes**.
5. Em **Configurações**, use **Adicionar dados fictícios** se quiser repor exemplos excluídos. Exporte o JSON depois da demonstração. A importação substitui os registros atuais após confirmação.

## Limites

- Cada navegador recebe uma cópia independente dos exemplos. Registros adicionados ou alterados em um aparelho não aparecem em outro. Não há login, sincronização ou banco de dados.
- Esta versão pública é apenas para demonstração com dados fictícios. Não cadastre CPF, telefone real, folha de pagamento, inadimplência ou dados financeiros sigilosos.
- O extrato é um controle manual de demonstração, separado do plano. O saldo inicial do controle é zero e o saldo exibido resulta apenas dos lançamentos salvos neste navegador. O botão de conferência registra apenas a revisão manual de um extrato fictício; não consulta banco nem constitui escrituração contábil ou prestação de contas oficial.
- As categorias e subcategorias começam com uma lista de demonstração, inspirada na organização do livro contábil fornecido. Podem ser criadas, renomeadas e excluídas no próprio navegador. Uma classificação em uso só pode ser excluída após a reclassificação ou remoção dos lançamentos vinculados. Não importamos valores ou nomes reais do livro.
- Os documentos demonstrativos são públicos e estão marcados como fictícios. Esta versão não recebe nem armazena PDFs ou fotos; guarda somente descrições e links HTTPS opcionais. Não use links de documentos reais na página pública.
- A periodicidade é informativa; o sistema não gera atividades recorrentes. Crie cada ocorrência separadamente quando precisar de prazo e valor próprios.
- Guarde o JSON exportado em local privado. Navegação privada, limpeza de dados do navegador ou troca de aparelho podem apagar os cadastros locais.

## Arquivos para publicação

Publique juntos `index.html`, `styles.css`, `navigation.js`, `ui-feedback.js`, `demo-seed.js`, `directory.js`, `finance.js`, `app.js` e `comprovante-demonstrativo.html`. `package.json` e `smoke-test.cjs` servem apenas ao desenvolvimento. O site publicado continua estático e sem pacotes de produção.

## Teste de desenvolvimento

Com Node.js 22 ou superior, execute `npm install`, `npx playwright install chromium`, `npm run check` e `npm test` dentro desta pasta. O Playwright é usado apenas para testar; o visitante do site não precisa instalá-lo. Se o Chromium já estiver disponível, informe seu caminho em `CHROME_PATH` ao executar o teste.

As fontes consultadas, escolhas de escopo e próximas etapas estão em `PESQUISA_E_ESCOPO.md`.

O diagnóstico, a proposta e a priorização estão em `AUDITORIA_E_PLANO_FRONTEND_2026-11-09.md`. Os resultados observados e os limites dos testes estão em `VALIDACAO_FRONTEND_2026-11-09.md`.

A separação entre planejamento e extrato, com decisões de escopo e fontes, está em `REVISAO_FINANCEIRO_2026-11-09.md`.
Os testes observados e as verificações ainda pendentes estão em `VALIDACAO_FINANCEIRO_2026-11-09.md`.

