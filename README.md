# Gestão condominial

Protótipo acadêmico para apresentar, no celular ou computador, o acompanhamento do plano de trabalho de um condomínio. Foi feito em HTML, CSS e JavaScript, sem pacotes externos nem servidor de dados.

Endereço publicado: https://carvalhojacj.github.io/gestao-condominial/

## O que esta versão faz

- **Painel:** destaca atividades, concluídas, atrasadas, valores, próximos prazos e ações rápidas.
- **Plano de trabalho:** cadastra, edita, filtra e exclui atividades. Cada atividade pode ter natureza da despesa, categoria, responsável, empresa prestadora, prazo, situação, valores e link HTTPS de comprovante.
- **Pessoas:** permite cadastrar unidades e moradores, funcionários e empresas prestadoras para a demonstração. Use apenas nomes e informações fictícias.
- **Financeiro:** resume os valores das atividades por natureza da despesa e reúne os links dos comprovantes.
- **Configurações:** exporta e importa uma cópia JSON dos registros. A versão 2 inclui atividades e cadastros de demonstração. Cópias antigas da versão 1 continuam importáveis.

O menu superior seleciona uma área; o menu lateral mostra as funções dessa área. No celular, as opções laterais aparecem em uma faixa horizontal abaixo do menu superior.

O título e o botão do formulário indicam quando uma atividade está em edição. Mensagens de erro apontam o campo que precisa de correção; a exportação informa que o download foi iniciado.

## Como demonstrar

1. Abra o endereço publicado. A página inicial não carrega dados reais.
2. Na área **Pessoas**, use os botões **Inserir exemplos fictícios** ou crie cadastros de exemplo.
3. Em **Plano de trabalho**, cadastre uma atividade fictícia ou uma atividade autorizada para a visita. Depois consulte a lista e os filtros.
4. Em **Financeiro**, confira a diferença entre previsto e realizado e os comprovantes vinculados.
5. Em **Configurações**, exporte o JSON. A importação substitui os registros atuais após confirmação.

## Limites

- Os dados ficam somente no navegador e aparelho usados. Abrir o mesmo link em outro celular não mostra os mesmos cadastros. Não há login, sincronização ou banco de dados.
- Esta versão pública é apenas para demonstração com dados fictícios. Não cadastre CPF, telefone real, folha de pagamento, inadimplência ou dados financeiros sigilosos.
- O resumo financeiro é calculado a partir das atividades cadastradas. Não é extrato bancário, escrituração contábil ou prestação de contas.
- O sistema guarda apenas o link HTTPS de cada comprovante. Os arquivos continuam no serviço onde foram armazenados, e o acesso deve ser configurado nesse serviço.
- A periodicidade é informativa; o sistema não gera atividades recorrentes. Crie cada ocorrência separadamente quando precisar de prazo e valor próprios.
- Guarde o JSON exportado em local privado. Navegação privada, limpeza de dados do navegador ou troca de aparelho podem apagar os cadastros locais.

## Arquivos para publicação

Publique juntos `index.html`, `styles.css`, `navigation.js`, `ui-feedback.js`, `directory.js` e `app.js`. `package.json` e `smoke-test.cjs` servem apenas ao desenvolvimento. O site publicado continua estático e sem pacotes de produção.

## Teste de desenvolvimento

Com Node.js 22 ou superior, execute `npm install`, `npx playwright install chromium`, `npm run check` e `npm test` dentro desta pasta. O Playwright é usado apenas para testar; o visitante do site não precisa instalá-lo. Se o Chromium já estiver disponível, informe seu caminho em `CHROME_PATH` ao executar o teste.

As fontes consultadas, escolhas de escopo e próximas etapas estão em `PESQUISA_E_ESCOPO.md`.

O diagnóstico, a proposta e a priorização estão em `AUDITORIA_E_PLANO_FRONTEND_2026-11-09.md`. Os resultados observados e os limites dos testes estão em `VALIDACAO_FRONTEND_2026-11-09.md`.
