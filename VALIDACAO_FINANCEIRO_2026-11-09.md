# Validação da revisão financeira

Data: 9 de novembro de 2026. Site: `https://carvalhojacj.github.io/gestao-condominial/`.

## Verificações concluídas

- `npm run check` passou para os scripts JavaScript, inclusive `finance.js` e o teste funcional.
- A implantação do GitHub Pages concluiu com sucesso no [run 42716583335](https://github.com/carvalhojacj/gestao-condominial/actions/runs/42716583335).
- No site publicado, a primeira carga do extrato apresentou seis lançamentos fictícios, R$ 5.120,00 de entradas, R$ 1.160,00 de saídas e saldo calculado de R$ 3.960,00. A soma confere: 5.120 − 1.160 = 3.960.
- O filtro **Saídas** exibiu três linhas e manteve o saldo geral no indicador, conforme aviso na interface.
- Criação e edição de um lançamento fictício atualizaram o valor e o saldo. Em navegador de teste com sete lançamentos, a saída adicional de R$ 40,00 levou o saldo a R$ 3.920,00.
- A página **Categorias** totalizou entradas e saídas por categoria e subcategoria, incluindo o lançamento recém-editado.
- A exportação gerou JSON versão 3 com atividades, diretório e sete lançamentos. O conteúdo foi lido e os conjuntos estavam presentes.
- Em largura de 390 px, a tabela foi substituída por cartões e a largura do documento permaneceu dentro da viewport. O menu contextual e as páginas de extrato/categorias foram verificados no celular.
- O teste pelo endereço local `file://` foi bloqueado pela política do navegador; a validação visual ocorreu pelo endereço público HTTPS.

## Pendências

- `npm test` não pôde executar porque o módulo de desenvolvimento `playwright` não está instalado neste ambiente. O script foi atualizado para a nova navegação, o extrato e o backup v3, mas continua sem execução automatizada aqui.
- A exclusão com confirmação nativa não foi concluída na automação do navegador; a janela de confirmação bloqueou a ferramenta. A criação e a edição foram verificadas. O registro adicional foi renomeado como exemplo fictício no navegador de teste.
- A importação de backups v1, v2 e v3 foi revisada no código, mas não testada de ponta a ponta no navegador nesta rodada.
- Não houve auditoria completa com leitor de tela, medição de Core Web Vitals nem conciliação com extrato bancário real. O protótipo é para demonstração com dados fictícios.

