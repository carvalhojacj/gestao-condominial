# Sistema do plano de trabalho condominial

Protótipo estático feito em HTML, CSS e JavaScript, sem pacotes externos nem servidor de dados. Os arquivos necessários para publicar são `index.html` e `app.js`.

Endereço publicado: https://carvalhojacj.github.io/gestao-condominial/

## Como usar

1. Abra o endereço publicado acima em um navegador atualizado no celular que será usado pela administração.
2. Cadastre cada atividade com descrição e, quando disponíveis, categoria, natureza da despesa, prazo, periodicidade e valor previsto. A natureza segue a separação entre despesas ordinárias e eventuais usada no livro contábil da administração.
3. Atualize a situação, a data de execução e o valor realizado. Uma atividade marcada como **Concluída** exige data de conclusão.
4. Use os filtros por situação, categoria e mês do prazo. O painel mostra os totais e a diferença entre realizado e previsto.
5. Exporte o JSON após cada atualização. Para recuperar os registros, escolha **Importar JSON**; a importação substitui todos os registros atuais após confirmação.

## Limites desta versão

- Os registros ficam apenas no armazenamento do navegador e aparelho utilizado. Não existe sincronização entre celulares, login ou banco de dados. A página pode ser pública sem publicar os registros, mas qualquer pessoa com acesso ao mesmo navegador poderá ver os dados locais.
- A periodicidade é apenas uma informação do cadastro. O sistema não cria atividades recorrentes automaticamente; cada ocorrência que precise de valor e prazo próprios deve ser cadastrada separadamente.
- O sistema guarda apenas o link HTTPS do comprovante. O arquivo continua no serviço onde foi armazenado e as permissões de acesso devem ser configuradas nesse serviço.
- O sistema acompanha atividades do plano de trabalho. Ele não importa o extrato bancário nem substitui o livro contábil e a prestação de contas. Registros existentes e cópias de segurança antigas continuam válidos sem o novo campo de natureza da despesa.
- Para evitar perda de dados, não dependa de navegação privada nem de abertura direta do arquivo `index.html` pelo gerenciador de arquivos. Use uma página HTTPS e mantenha cópias JSON em local privado.

## Teste funcional

O arquivo `smoke-test.cjs` testa cadastro, validação, filtros, edição, exportação, exclusão e restauração. Ele usa Playwright e um navegador Chrome disponíveis apenas no ambiente de desenvolvimento; não é necessário para usar o sistema.

