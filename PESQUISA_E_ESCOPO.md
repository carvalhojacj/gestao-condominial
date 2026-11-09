# Pesquisa e escopo do protótipo

## O que orientou a ampliação

- O Código Civil atribui ao síndico a conservação das partes comuns, a elaboração do orçamento e a prestação de contas. Por isso, o sistema prioriza plano de atividades, prazos, valores previstos e realizados e acesso aos comprovantes. Fonte: [Código Civil, arts. 1.348 e 1.350](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm).
- A LGPD orienta tratar somente os dados necessários e protegê-los. Como a página é pública e este é um trabalho acadêmico, os exemplos de moradores, funcionários e empresas são fictícios. Fonte: [princípios da LGPD](https://www.gov.br/mdr/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-e-respostas-frequentes-sobre-lgpd/quais-principios-devem-nortear-o).
- Empregados de condomínios podem gerar obrigações trabalhistas específicas. O cadastro de funcionários é apenas um diretório de demonstração; folha e eSocial precisam de processo próprio. Fonte: [cartilha do eSocial](https://www.gov.br/esocial/pt-br/documentacao-tecnica/manuais/cartilha-trabalhadores-domesticos-direitos-e-deveres).

## Funções implementadas

1. Menu superior por área e menu lateral que mostra as funções da área escolhida.
2. Cadastro e consulta de atividades, com responsável, prestadora, prazo, situação, previsão, gasto e link de comprovante.
3. Diretórios de unidades e moradores, funcionários e empresas prestadoras, com dados fictícios.
4. Painel de prazos e resumo financeiro por natureza da despesa.
5. Exportação e importação JSON para levar os dados de demonstração entre aparelhos, manualmente.

## Próxima evolução, se houver uso real

1. Definir, com a instituição, quem pode ver e alterar cada tipo de dado.
2. Usar autenticação e banco de dados com regras de acesso, para sincronizar aparelhos. O armazenamento atual é local ao navegador.
3. Acrescentar contratos e vencimentos, ocorrências de manutenção e documentos de assembleia, conforme a necessidade observada na visita.
4. Validar relatórios de prestação de contas com um profissional contábil. O resumo atual não substitui a contabilidade.

Nenhuma dessas etapas futuras foi implantada nesta versão. A execução presencial e seus participantes serão descritos somente depois da atividade.

