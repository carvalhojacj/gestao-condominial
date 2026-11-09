# Revisão do módulo financeiro

## Problema encontrado

A antiga aba **Financeiro > Previsto x realizado** repetia os valores das atividades. Isso misturava orçamento do plano de trabalho com movimentação de caixa. O livro contábil de 2024 fornecido pela instituição já separa **Previsão Mensal** e **Extrato Geral**; este registra data, descrição, valor, tipo de movimentação, saldo e classificação. Nenhum lançamento real do livro foi copiado para o site público.

## Mudança aplicada

- **Plano de trabalho > Previsto x realizado** mantém o comparativo antigo e os dados existentes, sem alterar o cadastro das atividades.
- **Financeiro > Extrato** é um registro separado de entradas e saídas, com data, descrição, categoria, subcategoria, valor positivo e saldo calculado após a movimentação. A tabela fica em ordem decrescente de data; o saldo é calculado em ordem crescente, considerando todos os lançamentos.
- A busca e os filtros por tipo, mês e categoria alteram a lista, enquanto os indicadores de entrada, saída e saldo continuam abrangendo todos os lançamentos. Isso é informado na tela.
- **Financeiro > Categorias** soma os lançamentos por tipo, categoria e subcategoria. **Comprovantes** continua reunindo os links associados às atividades.
- Os seis lançamentos iniciais são fictícios e têm identificadores estáveis. O cadastro automático é feito uma vez por navegador, inclusive para quem já usava a versão anterior, preservando registros existentes. O botão de exemplos pode repor itens apagados.
- A cópia JSON usa versão 4 e inclui lançamentos e categorias. As versões 1, 2 e 3 continuam aceitas. As versões 1 e 2 mantêm todo o financeiro; a versão 3 substitui os lançamentos e mantém as categorias atuais.

## Limites e próximos passos

O protótipo usa saldo inicial zero. Não acessa bancos, não faz conciliação, não controla contas a pagar/receber nem gera prestação de contas oficial. As categorias começam com uma lista genérica e podem ser alteradas na aba **Categorias**. Renomear atualiza os lançamentos vinculados; excluir uma classificação em uso exige primeiro reclassificar ou remover esses lançamentos. A validação com a administração, na visita presencial, deve verificar se os nomes e agrupamentos correspondem à rotina local antes de eventual uso além da demonstração. Cadastros e extratos permanecem apenas no navegador; usar somente dados fictícios na página pública.

## Referências de desenho

- Livro local `LIVRO CONTÁBIL 2024.xlsx`, especialmente as abas Previsão Mensal e Extrato Geral. O arquivo não faz parte do site.
- [Sebrae: Gestão financeira](https://sebrae.com.br/Sebrae/Portal%20Sebrae/Arquivos/ebook_gestao-financeira.pdf), orientação para registrar entradas, saídas, categorias e conferir saldo inicial + entradas − saídas.
- [Caderno do Condomínio, CDHU](https://www.cdhu.sp.gov.br/documents/20143/37075/CADERNO%2BDO%2BCONDOMINIO%2B-%2BGestao%2Bcondominial_DIGITAL.pdf), referência para apresentar receitas, despesas e saldo em uma gestão condominial.

