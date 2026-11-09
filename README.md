# Gestão condominial

Protótipo acadêmico para apresentar, no celular ou computador, o acompanhamento do plano de trabalho de um condomínio. Foi feito em HTML, CSS e JavaScript, sem pacotes externos nem servidor de dados.

Uma primeira visita recebe automaticamente um conjunto de dados **inteiramente fictícios**: cinco atividades, quatro moradores, três funcionários, quatro empresas e um documento demonstrativo sem validade fiscal ou contábil. Em **Configurações**, o botão **Adicionar dados fictícios** inclui os exemplos que faltarem em um navegador já usado, sem substituir seus registros.

Endereço publicado: https://carvalhojacj.github.io/gestao-condominial/

## O que esta versão faz

- **Painel:** destaca atividades, concluídas, atrasadas, valores, próximos prazos e ações rápidas.
- **Plano de trabalho:** cadastra, edita, filtra e exclui atividades. Cada atividade pode ter natureza da despesa, categoria, responsável, empresa prestadora, prazo, situação, valores e link HTTPS de comprovante.
- **Pessoas:** permite cadastrar unidades e moradores, funcionários e empresas prestadoras para a demonstração. Use apenas nomes e informações fictícias.
- **Financeiro:** resume os valores das atividades por natureza da despesa e reúne os links dos comprovantes.
- **Configurações:** exporta e importa uma cópia JSON dos registros. A versão 2 inclui atividades e cadastros de demonstração. Cópias antigas da versão 1 continuam importáveis.

Nas três telas de **Pessoas**, a relação completa aparece primeiro, em linhas compactas. Moradores são ordenados por unidade; funcionários e empresas, por nome. O botão de novo cadastro abre o formulário abaixo da lista; ao salvar ou cancelar, a relação volta a ser o foco. No celular, as linhas se reorganizam sem rolagem lateral.

O resumo financeiro mostra uma tabela no computador e cartões com os mesmos valores no celular. A lista de comprovantes mantém o link ao lado da atividade quando há espaço.

A relação de atividades também usa linhas compactas com responsável, situação, prazo, valores e ações. A busca fica visível; situação, categoria, natureza e mês ficam em **Filtros adicionais**. **Ver detalhes** abre categoria, empresa prestadora, diferença de valores, observações e o link do comprovante quando essas informações existirem.

O menu superior seleciona uma área; o menu lateral mostra as funções dessa área. No celular, as opções laterais aparecem em uma faixa horizontal abaixo do menu superior.

O título e o botão do formulário indicam quando uma atividade está em edição. Mensagens de erro apontam o campo que precisa de correção; a exportação informa que o download foi iniciado.

## Como demonstrar

1. Abra o endereço publicado. A página inicial mostra apenas exemplos fictícios.
2. Em **Plano de trabalho**, consulte prazos, situações e filtros; depois experimente criar ou editar uma atividade fictícia.
3. Em **Pessoas**, examine os cadastros de exemplo ou crie outros fictícios.
4. Em **Financeiro**, confira os valores e abra o documento demonstrativo vinculado à atividade concluída.
5. Em **Configurações**, use **Adicionar dados fictícios** se este navegador já tinha registros antes desta versão. Exporte o JSON depois da demonstração. A importação substitui os registros atuais após confirmação.

## Limites

- Cada navegador recebe uma cópia independente dos exemplos. Registros adicionados ou alterados em um aparelho não aparecem em outro. Não há login, sincronização ou banco de dados.
- Esta versão pública é apenas para demonstração com dados fictícios. Não cadastre CPF, telefone real, folha de pagamento, inadimplência ou dados financeiros sigilosos.
- O resumo financeiro é calculado a partir das atividades cadastradas. Não é extrato bancário, escrituração contábil ou prestação de contas.
- O documento demonstrativo é público e está marcado como fictício. Para comprovantes verdadeiros, o sistema guarda apenas o link HTTPS; configure o acesso no serviço em que o arquivo for armazenado.
- A periodicidade é informativa; o sistema não gera atividades recorrentes. Crie cada ocorrência separadamente quando precisar de prazo e valor próprios.
- Guarde o JSON exportado em local privado. Navegação privada, limpeza de dados do navegador ou troca de aparelho podem apagar os cadastros locais.

## Arquivos para publicação

Publique juntos `index.html`, `styles.css`, `navigation.js`, `ui-feedback.js`, `demo-seed.js`, `directory.js`, `app.js` e `comprovante-demonstrativo.html`. `package.json` e `smoke-test.cjs` servem apenas ao desenvolvimento. O site publicado continua estático e sem pacotes de produção.

## Teste de desenvolvimento

Com Node.js 22 ou superior, execute `npm install`, `npx playwright install chromium`, `npm run check` e `npm test` dentro desta pasta. O Playwright é usado apenas para testar; o visitante do site não precisa instalá-lo. Se o Chromium já estiver disponível, informe seu caminho em `CHROME_PATH` ao executar o teste.

As fontes consultadas, escolhas de escopo e próximas etapas estão em `PESQUISA_E_ESCOPO.md`.

O diagnóstico, a proposta e a priorização estão em `AUDITORIA_E_PLANO_FRONTEND_2026-11-09.md`. Os resultados observados e os limites dos testes estão em `VALIDACAO_FRONTEND_2026-11-09.md`.
