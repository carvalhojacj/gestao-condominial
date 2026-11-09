'use strict';

const DIRECTORY_KEY = 'gestao-condominial-demo-directory-v1';
const DIRECTORY_LIMIT = 200;
const DIRECTORY_FIELDS = {
  residents: ['unit', 'name', 'relationship'],
  employees: ['name', 'job', 'shift', 'status'],
  vendors: ['company', 'service', 'contractEnd', 'status']
};
const DIRECTORY_EXAMPLES = {
  residents: [
    {unit: '101', name: 'Morador Exemplo A', relationship: 'Proprietário'},
    {unit: '202', name: 'Moradora Exemplo B', relationship: 'Inquilino'}
  ],
  employees: [
    {name: 'Funcionário Exemplo A', job: 'Portaria', shift: 'Manhã', status: 'Ativo'},
    {name: 'Funcionária Exemplo B', job: 'Limpeza', shift: 'Tarde', status: 'Ativo'}
  ],
  vendors: [
    {company: 'Empresa Exemplo Elevadores', service: 'Manutenção de elevadores', contractEnd: '2027-06-30', status: 'Ativa'},
    {company: 'Empresa Exemplo Limpeza', service: 'Limpeza das áreas comuns', contractEnd: '2027-03-31', status: 'Ativa'}
  ]
};
let directory = {residents: [], employees: [], vendors: []};
let directoryCorrupt = false;

function directoryMessage(text, type = 'success') {
  const target = document.getElementById('message');
  target.textContent = text;
  target.className = type;
}

function directoryText(value, label, max, required = false) {
  if (typeof value !== 'string') throw new Error(`${label}: texto inválido.`);
  const result = value.trim();
  if (required && !result) throw new Error(`Informe ${label.toLowerCase()}.`);
  if (result.length > max) throw new Error(`${label}: máximo de ${max} caracteres.`);
  return result;
}

function directoryDate(value) {
  if (typeof value !== 'string') throw new Error('Data inválida.');
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Data inválida.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Data inválida.');
  return value;
}

function normalizeDirectoryRecord(type, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Cadastro inválido.');
  const id = directoryText(raw.id, 'Identificador', 100, true);
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Identificador inválido.');
  if (type === 'residents') {
    const record = {
      id,
      unit: directoryText(raw.unit, 'Unidade', 12, true),
      name: directoryText(raw.name, 'Nome fictício', 80, true),
      relationship: raw.relationship
    };
    if (!['Proprietário', 'Inquilino', 'Outro'].includes(record.relationship)) throw new Error('Vínculo inválido.');
    return record;
  }
  if (type === 'employees') {
    const record = {
      id,
      name: directoryText(raw.name, 'Nome fictício', 80, true),
      job: directoryText(raw.job, 'Função', 60, true),
      shift: directoryText(raw.shift ?? '', 'Turno', 40),
      status: raw.status
    };
    if (!['Ativo', 'Inativo'].includes(record.status)) throw new Error('Situação inválida.');
    return record;
  }
  const record = {
    id,
    company: directoryText(raw.company, 'Empresa fictícia', 100, true),
    service: directoryText(raw.service, 'Serviço', 80, true),
    contractEnd: directoryDate(raw.contractEnd ?? ''),
    status: raw.status
  };
  if (!['Ativa', 'Encerrada'].includes(record.status)) throw new Error('Situação inválida.');
  return record;
}

function normalizeDirectory(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Diretório inválido.');
  const result = {};
  for (const type of Object.keys(DIRECTORY_FIELDS)) {
    if (!Array.isArray(raw[type]) || raw[type].length > DIRECTORY_LIMIT) throw new Error('Limite de cadastros excedido.');
    result[type] = raw[type].map(item => normalizeDirectoryRecord(type, item));
    if (new Set(result[type].map(item => item.id)).size !== result[type].length) throw new Error('Cadastros duplicados.');
  }
  return result;
}

function saveDirectory() {
  if (directoryCorrupt) return false;
  try {
    localStorage.setItem(DIRECTORY_KEY, JSON.stringify(directory));
    return true;
  } catch { return false; }
}

function formatDirectoryDate(value) { return value ? value.split('-').reverse().join('/') : ''; }

function directoryTitle(type, item) {
  if (type === 'residents') return item.name;
  if (type === 'employees') return item.name;
  return item.company;
}

function directoryDetails(type, item) {
  if (type === 'residents') return [`Unidade ${item.unit}`, item.relationship];
  if (type === 'employees') return [item.job, item.shift && `Turno: ${item.shift}`, item.status].filter(Boolean);
  return [item.service, item.contractEnd && `Contrato até: ${formatDirectoryDate(item.contractEnd)}`, item.status].filter(Boolean);
}

function resetDirectoryForm(type) {
  const form = document.querySelector(`form[data-directory="${type}"]`);
  form.reset();
  form.elements.namedItem('id').value = '';
}

function renderDirectory(type) {
  const list = document.getElementById(`${type}-list`);
  list.replaceChildren();
  if (!directory[type].length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Nenhum cadastro de demonstração.';
    list.append(empty);
  }
  for (const item of directory[type]) {
    const article = document.createElement('article');
    article.className = 'record';
    const title = document.createElement('h4');
    title.textContent = directoryTitle(type, item);
    article.append(title);
    const details = document.createElement('div');
    details.className = 'record-meta';
    details.textContent = directoryDetails(type, item).join(' · ');
    article.append(details);
    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'secondary';
    edit.textContent = 'Editar';
    edit.addEventListener('click', () => {
      const form = document.querySelector(`form[data-directory="${type}"]`);
      form.elements.namedItem('id').value = item.id;
      for (const field of DIRECTORY_FIELDS[type]) form.elements.namedItem(field).value = item[field];
      form.scrollIntoView({behavior: 'smooth'});
      form.querySelector('input:not([type="hidden"])').focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Excluir';
    remove.addEventListener('click', () => {
      if (!confirm('Excluir este cadastro de demonstração?')) return;
      directory[type] = directory[type].filter(record => record.id !== item.id);
      renderAllDirectory();
      const saved = saveDirectory();
      directoryMessage(saved ? 'Cadastro excluído.' : 'Cadastro excluído, mas não foi salvo neste navegador.', saved ? 'success' : 'notice');
    });
    actions.append(edit, remove);
    article.append(actions);
    list.append(article);
  }
}

function renderAllDirectory() {
  for (const type of Object.keys(DIRECTORY_FIELDS)) {
    renderDirectory(type);
    document.getElementById(`${type}-count`).textContent = directory[type].length;
  }
}

function directoryId() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

for (const form of document.querySelectorAll('form[data-directory]')) {
  const type = form.dataset.directory;
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const raw = {id: form.elements.namedItem('id').value || directoryId()};
      for (const field of DIRECTORY_FIELDS[type]) raw[field] = form.elements.namedItem(field).value;
      const record = normalizeDirectoryRecord(type, raw);
      const index = directory[type].findIndex(item => item.id === record.id);
      if (index < 0 && directory[type].length >= DIRECTORY_LIMIT) throw new Error('Limite de cadastros atingido.');
      if (index < 0) directory[type].push(record);
      else directory[type][index] = record;
      resetDirectoryForm(type);
      renderAllDirectory();
      const saved = saveDirectory();
      directoryMessage(saved ? 'Cadastro salvo. Exporte uma cópia de segurança depois da atualização.' : 'Cadastro salvo apenas nesta sessão. Exporte um JSON antes de sair.', saved ? 'success' : 'notice');
    } catch (error) { directoryMessage(error.message, 'notice'); }
  });
  form.querySelector('[data-cancel]').addEventListener('click', () => resetDirectoryForm(type));
}

for (const button of document.querySelectorAll('[data-examples]')) {
  button.addEventListener('click', () => {
    const type = button.dataset.examples;
    if (directory[type].length) {
      directoryMessage('Esta lista já contém cadastros. Os exemplos não foram inseridos novamente.', 'notice');
      return;
    }
    directory[type] = DIRECTORY_EXAMPLES[type].map(item => normalizeDirectoryRecord(type, {id: directoryId(), ...item}));
    renderAllDirectory();
    const saved = saveDirectory();
    directoryMessage(saved ? 'Exemplos fictícios inseridos.' : 'Exemplos inseridos apenas nesta sessão. Exporte um JSON antes de sair.', saved ? 'success' : 'notice');
  });
}

try {
  const stored = localStorage.getItem(DIRECTORY_KEY);
  if (stored) directory = normalizeDirectory(JSON.parse(stored));
} catch {
  directoryCorrupt = true;
  directoryMessage('Os cadastros de demonstração salvos não puderam ser lidos. Importe uma cópia de segurança antes de continuar.', 'notice');
}
renderAllDirectory();

window.demoDirectory = {
  exportData: () => Object.fromEntries(Object.entries(directory).map(([type, items]) => [type, items.map(item => ({...item}))])),
  validateData: normalizeDirectory,
  importData: raw => {
    directory = normalizeDirectory(raw);
    directoryCorrupt = false;
    renderAllDirectory();
    return saveDirectory();
  }
};

