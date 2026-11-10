'use strict';

// Exemplos públicos para a apresentação. IDs fixos permitem inserir o conjunto sem duplicações.
const DEMO_SEED_MARKER = 'gestao-condominial-demo-seed-v1';
let autoAddAtLoad = false;
try {
  autoAddAtLoad = localStorage.getItem(DEMO_SEED_MARKER) === null;
} catch { /* O sistema continuará funcionando sem exemplos persistidos. */ }

window.demoSeed = {
  autoAddAtLoad,
  markAutoAdded: () => {
    try { localStorage.setItem(DEMO_SEED_MARKER, '1'); return true; }
    catch { return false; }
  },
  activities: [
    {
      id: 'demo-bombas', description: 'Revisão das bombas de água (exemplo)', category: 'Manutenção preventiva',
      expenseNature: 'Ordinária', owner: 'Síndica Exemplo', supplier: 'Hidro Exemplo Serviços',
      deadline: '2026-10-28', periodicity: 'Semestral', priority: 'Normal', status: 'Concluída',
      executionDate: '2026-10-28', budget: '450.00', actual: '420.00',
      receipt: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html',
      notes: 'Atividade e documento fictícios, criados apenas para demonstrar o sistema.'
    },
    {
      id: 'demo-caixa-agua', description: 'Limpeza da caixa d’água (exemplo)', category: 'Limpeza',
      expenseNature: 'Ordinária', owner: 'Síndica Exemplo', supplier: 'Hidro Exemplo Serviços',
      deadline: '2026-11-13', periodicity: 'Semestral', priority: 'Alta', status: 'Em andamento',
      executionDate: '', budget: '780.00', actual: '', receipt: '', notes: 'Prazo fictício para testar próximos vencimentos.'
    },
    {
      id: 'demo-extintores', description: 'Inspeção dos extintores (exemplo)', category: 'Segurança',
      expenseNature: 'Ordinária', owner: 'Zelador Exemplo', supplier: 'Segurança Exemplo Ltda.',
      deadline: '2026-11-20', periodicity: 'Anual', priority: 'Alta', status: 'Não iniciada',
      executionDate: '', budget: '620.00', actual: '', receipt: '', notes: ''
    },
    {
      id: 'demo-iluminacao', description: 'Reparo da iluminação da garagem (exemplo)', category: 'Manutenção corretiva',
      expenseNature: 'Eventual', owner: 'Zelador Exemplo', supplier: 'Elétrica Exemplo Ltda.',
      deadline: '2026-11-05', periodicity: 'Pontual', priority: 'Alta', status: 'Não iniciada',
      executionDate: '', budget: '260.00', actual: '', receipt: '', notes: 'Prazo fictício vencido para demonstrar o alerta.'
    },
    {
      id: 'demo-pintura', description: 'Pintura da área comum (exemplo)', category: 'Melhoria',
      expenseNature: 'Eventual', owner: 'Síndica Exemplo', supplier: 'Pintura Exemplo Ltda.',
      deadline: '2026-12-04', periodicity: 'Pontual', priority: 'Normal', status: 'Não iniciada',
      executionDate: '', budget: '1200.00', actual: '', receipt: '', notes: ''
    }
  ],
  finance: [
    {id: 'demo-finance-cotas-out', date: '2026-10-25', type: 'Entrada', description: 'Cotas condominiais de outubro (exemplo)', category: 'Cotas condominiais', subcategory: 'Ordinária', amount: '2500.00', notes: 'Recebimento inteiramente fictício.', bankReference: 'EXEMPLO-001'},
    {id: 'demo-finance-garagem', date: '2026-10-26', type: 'Entrada', description: 'Garagem extra (exemplo)', category: 'Receitas acessórias', subcategory: 'Garagem extra', amount: '120.00', notes: ''},
    {id: 'demo-finance-bombas', date: '2026-10-28', type: 'Saída', description: 'Revisão das bombas (exemplo)', category: 'Manutenção', subcategory: 'Preventiva', amount: '420.00', notes: 'Lançamento fictício relacionado à atividade de exemplo.'},
    {id: 'demo-finance-cotas-nov', date: '2026-11-05', type: 'Entrada', description: 'Cotas condominiais de novembro (exemplo)', category: 'Cotas condominiais', subcategory: 'Ordinária', amount: '2500.00', notes: ''},
    {id: 'demo-finance-agua', date: '2026-11-06', type: 'Saída', description: 'Conta de água (exemplo)', category: 'Consumo', subcategory: 'Água', amount: '460.00', notes: '', bankReference: 'EXEMPLO-005', bankCheckedAt: '2026-11-07'},
    {id: 'demo-finance-energia', date: '2026-11-07', type: 'Saída', description: 'Energia das áreas comuns (exemplo)', category: 'Consumo', subcategory: 'Energia', amount: '280.00', notes: ''}
  ],
  financeDocuments: [
    {id: 'demo-doc-agua-fatura', kind: 'Fatura', title: 'Fatura de água fictícia', date: '2026-11-03', amount: '460.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-agua-fatura', notes: 'Documento somente para demonstração.'},
    {id: 'demo-doc-agua-pagamento', kind: 'Comprovante de pagamento', title: 'Pagamento fictício da água', date: '2026-11-06', amount: '460.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-agua-pagamento', notes: 'Documento somente para demonstração.'},
    {id: 'demo-doc-energia-fatura', kind: 'Fatura', title: 'Fatura de energia fictícia', date: '2026-11-04', amount: '280.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-energia-fatura', notes: 'Falta o comprovante de pagamento neste exemplo.'},
    {id: 'demo-doc-cotas-recibo', kind: 'Comprovante de receita', title: 'Recebimento fictício de cotas de novembro', date: '2026-11-05', amount: '2500.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-cotas-recibo', notes: 'Documento somente para demonstração.'},
    {id: 'demo-doc-bombas-nota', kind: 'Nota fiscal', title: 'Nota fictícia da revisão das bombas', date: '2026-10-28', amount: '420.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-bombas-nota', notes: 'Documento somente para demonstração.'},
    {id: 'demo-doc-bombas-pagamento', kind: 'Comprovante de pagamento', title: 'Pagamento fictício das bombas', date: '2026-10-28', amount: '420.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-bombas-pagamento', notes: 'Documento somente para demonstração.'},
    {id: 'demo-doc-inbox-servico', kind: 'Fatura', title: 'Fatura fictícia aguardando pagamento', date: '2026-11-09', amount: '150.00', url: 'https://carvalhojacj.github.io/gestao-condominial/comprovante-demonstrativo.html?documento=demo-doc-inbox-servico', notes: 'Exemplo de documento recebido antes de aparecer no extrato.'}
  ],
  financeLinks: [
    {transactionId: 'demo-finance-agua', documentId: 'demo-doc-agua-fatura', role: 'origem'},
    {transactionId: 'demo-finance-agua', documentId: 'demo-doc-agua-pagamento', role: 'quitacao'},
    {transactionId: 'demo-finance-energia', documentId: 'demo-doc-energia-fatura', role: 'origem'},
    {transactionId: 'demo-finance-cotas-nov', documentId: 'demo-doc-cotas-recibo', role: 'origem'},
    {transactionId: 'demo-finance-bombas', documentId: 'demo-doc-bombas-nota', role: 'origem'},
    {transactionId: 'demo-finance-bombas', documentId: 'demo-doc-bombas-pagamento', role: 'quitacao'}
  ],
  directory: {
    residents: [
      {id: 'demo-resident-101', unit: '101', name: 'Síndica Exemplo', relationship: 'Proprietário'},
      {id: 'demo-resident-102', unit: '102', name: 'Morador Exemplo A', relationship: 'Inquilino'},
      {id: 'demo-resident-201', unit: '201', name: 'Moradora Exemplo B', relationship: 'Proprietário'},
      {id: 'demo-resident-202', unit: '202', name: 'Morador Exemplo C', relationship: 'Outro'}
    ],
    employees: [
      {id: 'demo-employee-zelador', name: 'Zelador Exemplo', job: 'Zeladoria', shift: 'Manhã', status: 'Ativo'},
      {id: 'demo-employee-portaria', name: 'Porteira Exemplo', job: 'Portaria', shift: 'Tarde', status: 'Ativo'},
      {id: 'demo-employee-limpeza', name: 'Auxiliar Exemplo', job: 'Limpeza', shift: 'Manhã', status: 'Ativo'}
    ],
    vendors: [
      {id: 'demo-vendor-hidro', company: 'Hidro Exemplo Serviços', service: 'Bombas e reservatórios', contractEnd: '2027-04-30', status: 'Ativa'},
      {id: 'demo-vendor-seguranca', company: 'Segurança Exemplo Ltda.', service: 'Inspeção de extintores', contractEnd: '2027-03-31', status: 'Ativa'},
      {id: 'demo-vendor-eletrica', company: 'Elétrica Exemplo Ltda.', service: 'Instalações elétricas', contractEnd: '2027-05-31', status: 'Ativa'},
      {id: 'demo-vendor-pintura', company: 'Pintura Exemplo Ltda.', service: 'Pintura predial', contractEnd: '2027-06-30', status: 'Ativa'}
    ]
  }
};

