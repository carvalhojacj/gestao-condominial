# Auditoria e plano de modernização do frontend

Data: 9 de novembro de 2026. Estado: proposta para aprovação; nenhum código do sistema foi alterado nesta etapa.

## 1. Diagnóstico

### Arquitetura e inventário

O sistema publicado em `https://carvalhojacj.github.io/gestao-condominial/` é uma página estática em HTML, CSS e JavaScript. Não há React, TypeScript, API, autenticação, banco de dados ou dependências de produção. `index.html` reúne dez telas em seções; `navigation.js` controla rotas por `hash` e o menu contextual; `app.js` cuida das atividades, finanças e backup; `directory.js` cuida dos cadastros; `styles.css` concentra todos os estilos. Os dados ficam em duas chaves de `localStorage`. O JSON de exportação usa a versão 2 e aceita importação da versão 1.

Fluxos examinados: painel; listagem, filtros, cadastro e edição de atividades; moradores, funcionários e empresas; resumo financeiro e comprovantes; exportação e importação. O site publicado foi inspecionado em desktop e na largura de 390 px. Nesta inspeção, o console não apresentou erros e o menu lateral mudou corretamente ao escolher Financeiro. A largura do documento ficou dentro da largura móvel observada. Os testes de sintaxe dos três arquivos JavaScript passaram.

### Pontos preservados

- Estrutura leve, carregamento sem bibliotecas externas e acesso pelo mesmo link no celular.
- Separação básica entre navegação, atividades e cadastros.
- Rótulos de formulário, `aria-current` na navegação, foco visível e mensagens com `role="status"`.
- Aviso claro sobre uso de dados fictícios e persistência local.
- Compatibilidade com o backup antigo, que é essencial para não perder dados de demonstração.

### Revisão das dez telas

| Tela | Estado atual e melhoria proposta |
| --- | --- |
| Painel | Métricas e contagens corretas; falta caminho explícito para começar quando tudo está zerado. |
| Atividades | Busca e filtros funcionais; separar resultados, filtros e ação principal com hierarquia mais clara. |
| Nova/editar atividade | Validação de negócio preservada; corrigir o título divergente ao editar e aproximar erros dos campos. |
| Moradores | Cadastro com unidade e vínculo; reduzir o texto inicial e melhorar a leitura de cada registro no celular. |
| Funcionários | Cadastro funcional e propositalmente sem folha; aplicar o mesmo padrão visual dos demais diretórios. |
| Empresas | Serviço e vencimento disponíveis; destacar contratos próximos do vencimento somente quando houver data. |
| Previsto x realizado | Totais e tabela por natureza; reforçar leitura de valores negativos/positivos por texto, além de cor. |
| Comprovantes | Lista vazia informa ausência; oferecer link para cadastrar ou editar uma atividade. |
| Cópia de segurança | Exportação/importação disponíveis; explicar melhor o que substitui os dados e mostrar resultado da exportação. |
| Sobre | Limites estão corretos; organizar em blocos curtos para consulta rápida. |

### Problemas e prioridades

| Prioridade | Problema e evidência | Impacto | Direção |
| --- | --- | --- | --- |
| P0 | Ao editar uma atividade, o título da seção vira “Editar atividade”, mas o título principal continua “Nova atividade” (`app.js:264-272`, `navigation.js:68-69`). | A pessoa pode achar que está criando outro registro. | Sincronizar título, ação principal e estado do formulário. |
| P0 | O teste funcional exige `playwright`, mas não há `package.json`; `node smoke-test.cjs` falhou por módulo ausente. | Não há rotina reproduzível de regressão para a próxima mudança. | Declarar apenas a dependência de desenvolvimento e documentar a execução. |
| P1 | O painel apresenta seis métricas com o mesmo peso visual e pouca orientação quando todos os valores são zero (`index.html:44-72`, `styles.css:144-157`). | A próxima ação não fica evidente na primeira visita. | Destacar quatro indicadores úteis e ações reais: atividade, cadastro e backup. |
| P1 | No celular, as cinco áreas ocupam duas linhas e a navegação contextual acrescenta outra faixa (`styles.css:194-217`). | O conteúdo principal começa mais abaixo; a orientação fica mais difícil. | Compactar o cabeçalho e tornar a navegação móvel mais clara, mantendo as mesmas áreas e rotas. |
| P1 | `render()` recalcula resumo, comprovantes, filtros e lista a cada tecla digitada na busca (`app.js:206-263,295`). | Com muitos registros, a busca tende a fazer trabalho desnecessário. | Separar atualização do painel financeiro da filtragem da lista. |
| P1 | Exportar JSON não mostra confirmação na página; a importação só informa o resultado ao terminar (`app.js:299-330`). | É difícil saber se a cópia foi concluída ou se o arquivo ainda está sendo processado. | Mostrar estados de processamento, sucesso e erro junto da ação. |
| P1 | A mensagem global fica acima da tela ativa e não aponta o campo inválido (`index.html:40`, `app.js:18,281-291`, `directory.js:188-202`). | Em formulários longos, o erro pode ficar fora da área visível. | Associar o erro ao campo, rolar/focar o campo e manter resumo acessível. |
| P2 | O contorno de foco laranja atual (`#d88a18`) tem contraste calculado de 2,77:1 sobre branco (`styles.css:35`). | O foco pode ficar pouco nítido em superfícies claras. | Definir foco que contraste em superfícies claras e escuras e validar WCAG 2.2 AA. |
| P2 | Falta um link “Ir para o conteúdo” antes dos menus; o primeiro foco passa pela navegação (`index.html:8-36`). | Usuários de teclado repetem o percurso em cada acesso. | Adicionar atalho visível ao receber foco. |
| P2 | CSS único com cores, medidas e estados repetidos; estilos específicos de páginas ficam misturados (`styles.css`). | Mudanças visuais podem divergir entre telas. | Criar tokens e componentes CSS sem introduzir framework. |

Estados atuais: listas sem dados exibem mensagem; salvar e importar exibem sucesso ou erro; não existe carregamento de página porque não há requisição remota. O processamento de arquivo na importação é o único fluxo que precisa de estado de espera. Não há evidência para afirmar conformidade WCAG AA nem pontuação de Core Web Vitals nesta etapa.

## 2. Proposta de redesign

As duas imagens anexadas servem de referência para hierarquia compacta, cartões bem definidos, ações próximas ao contexto e navegação lateral clara. Não serão copiados gráficos, perfis, notificações, indicadores de crescimento, botões de upgrade ou recursos que o sistema não possui.

### Estrutura das telas

**Desktop:** cabeçalho compacto com nome do sistema e indicação de protótipo; menu superior com as cinco áreas existentes; lateral contextual com destaque da função ativa; conteúdo com título, descrição curta e uma ação principal. O painel inicia com indicadores essenciais, seguido por “Próximos prazos”, “Previsto x realizado” e “Ações rápidas”. Informações adicionais ficam abaixo, sem números de tendência inventados.

**Tablet:** lateral mais estreita e cartões em duas colunas. **Celular:** cabeçalho compacto, áreas do menu superior acessíveis sem esconder opções, funções da área em faixa contextual e conteúdo em coluna única. Tabelas largas continuam roláveis, com aviso próximo à tabela.

**Atividades:** a lista ganha hierarquia clara entre descrição, situação, prazo e valores. Os filtros ficam em uma região identificada. Cadastro e edição compartilham o mesmo formulário, com título e botão coerentes. **Pessoas:** cada diretório usa o mesmo padrão de formulário, estado vazio e ações por registro. **Financeiro:** apresenta os totais com rótulos inequívocos e mantém a ressalva de que não substitui a contabilidade. **Backup:** apresenta o local de armazenamento, a ação de exportar, o processo de importação e o risco de substituição dos dados com linguagem direta.

### Sistema visual proposto

- Manter o azul escuro da identidade atual (`#153d60`), usar azul de ação mais consistente, fundo neutro claro e branco nos painéis. Verde e âmbar ficam reservados para estados reais, nunca como decoração.
- Tipografia do sistema, sem fonte externa. Escala sugerida: 14 px para apoio, 16 px para corpo, 20–24 px para títulos de seção e 28–32 px para título principal em desktop; ajuste fluido no celular.
- Espaçamentos em escala de 4, 8, 12, 16, 24 e 32 px; raio e bordas discretos; sombras mínimas. Tokens de cor, espaço, tipografia, foco e estados definidos em CSS.
- Botões primário, secundário e de exclusão com estados de foco, hover, pressionado e desabilitado. Cartões e mensagens usam padrões únicos. Ícones SVG pequenos apenas quando ajudam a reconhecer uma ação; não acrescentar biblioteca de ícones.
- Microinterações curtas para hover, foco e expansão, respeitando `prefers-reduced-motion`. Não animar valores financeiros nem introduzir gráficos sem dados suficientes.

### Acessibilidade e desempenho

Aplicar critérios pertinentes da [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/): navegação por teclado, foco visível, contraste, nomes acessíveis, mensagens de estado e alvos de toque. Usar o padrão de [menus da WAI](https://www.w3.org/WAI/tutorials/menus/structure/) para marcar a função ativa e manter ordem consistente. Medir LCP, INP e CLS conforme [Core Web Vitals](https://web.dev/articles/vitals/), sem alegar resultados antes da medição. Preservar o carregamento estático, sem React, TypeScript ou dependências de produção nesta fase. Uma migração de framework aumentaria custo de manutenção e risco sem resolver os problemas observados.

## 3. Plano de implementação e riscos

| Etapa | Mudanças e arquivos | Impacto | Esforço | Risco e proteção |
| --- | --- | --- | --- | --- |
| 1. Base visual e navegação | `styles.css`, `index.html`, `navigation.js`: tokens, cabeçalho compacto, menus responsivos, atalho ao conteúdo, foco e estados comuns. | Alto | Médio | Risco de quebrar rotas e foco; manter os `hashes` atuais e testar teclado/390, 768 e 1280 px. |
| 2. Painel e fluxos | `index.html`, `app.js`, `directory.js`, `styles.css`: painel orientado a ações, cartões de registros, formulário de edição coerente, erros junto aos campos, feedback de backup. | Alto | Médio | Risco de alterar persistência; manter chaves de `localStorage`, IDs e formato JSON v1/v2 e testar importação/exportação. |
| 3. Manutenção e validação | `styles.css`, arquivos JS, `smoke-test.cjs`, novo `package.json` de desenvolvimento, `README.md`: dividir renderizações custosas, padronizar componentes e tornar o teste repetível. | Médio | Médio | Dependência só de desenvolvimento; verificar que o site publicado continua estático e sem pacote de produção. |

Dependência entre etapas: concluir a navegação e os padrões visuais antes de adaptar as telas; validar backup e os fluxos de cadastro antes de publicar. Implantar em pequenos conjuntos de arquivos e verificar a versão publicada após cada etapa. Preservar o endereço atual.

### Contratos que devem permanecer

Rotas por `hash`; cinco áreas e suas funções; criação, edição, exclusão e filtros de atividades; cadastros de demonstração; cálculos financeiros; links HTTPS; persistência local; exportação JSON versão 2; importação de versões 1 e 2. Não haverá backend, banco de dados, login ou cadastro de dados reais neste redesign.

## 4. Validação

**Feito nesta auditoria:** leitura dos arquivos e fluxos; comparação visual com as duas referências; inspeção do site publicado em desktop e 390 px; navegação até Financeiro e verificação do menu contextual; console sem erros observados; `node --check` aprovado para os três arquivos JavaScript. O teste automatizado existente foi tentado e não iniciou porque `playwright` não está instalado/declarado.

**Após a aprovação e implementação:** executar teste funcional reproduzível para cadastros, filtros, edição, cálculos, backup v1/v2 e navegação; testar teclado e leitor de tela em fluxos principais; conferir contraste e foco; testar larguras de 390, 768 e 1280 px; comparar capturas de antes e depois; medir desempenho com ferramenta apropriada e registrar os números. A revisão visual não substitui teste automatizado nem auditoria completa de acessibilidade.

## 5. Decisão pendente

Solicitar aprovação para as três etapas acima, pois elas incluem mudanças estruturais no layout, na organização da renderização e na infraestrutura de testes. Até a aprovação, o site publicado e o código funcional permanecem como estão.

