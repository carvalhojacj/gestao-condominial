'use strict';

// Exemplos públicos para a apresentação. IDs fixos permitem inserir o conjunto sem duplicações.
const DEMO_ACTIVITY_KEY = 'plano-trabalho-sqs110f-v1';
const DEMO_DIRECTORY_KEY = 'gestao-condominial-demo-directory-v1';
let freshAtLoad = false;
try {
  freshAtLoad = localStorage.getItem(DEMO_ACTIVITY_KEY) === null && localStorage.getItem(DEMO_DIRECTORY_KEY) === null;
} catch { /* O sistema continuará funcionando sem exemplos persistidos. */ }

window.demoSeed = {
  freshAtLoad,
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
