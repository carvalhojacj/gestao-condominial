'use strict';

const STORAGE_KEY = 'plano-trabalho-sqs110f-v1';
const MAX_RECORDS = 1000;
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const STATUSES = ['Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'];
const PRIORITIES = ['Normal', 'Alta', 'Baixa'];
const PERIODICITIES = ['Pontual', 'Mensal', 'Trimestral', 'Semestral', 'Anual'];
const FIELDS = ['description', 'category', 'owner', 'deadline', 'periodicity', 'priority', 'status', 'executionDate', 'budget', 'actual', 'receipt', 'notes'];
const $ = id => document.getElementById(id);
const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
let activities = [];
let storageAvailable = false;
let storageCorrupt = false;

function show(message, type = 'success') {
  $('message').textContent = message;
  $('message').className = type;
}

function textField(value, label, max, required = false) {
  if (typeof value !== 'string') throw new Error(`${label}: texto inválido.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`Informe ${label.toLowerCase()}.`);
  if (cleaned.length > max) throw new Error(`${label}: máximo de ${max} caracteres.`);
  return cleaned;
}

function validDate(value, label) {
  if (typeof value !== 'string') throw new Error(`${label}: data inválida.`);
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: data inválida.`);
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error(`${label}: data inválida.`);
  return value;
}

function validAmount(value, label) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`${label}: valor inválido.`);
  const cleaned = String(value).trim();
  if (!cleaned) return '';
  if (!/^\d+(?:\.\d{1,2})?$/.test(cleaned) || Number(cleaned) > 999999999.99) {
    throw new Error(`${label}: informe um valor positivo com até duas casas decimais.`);
  }
  return cleaned;
}

function cents(value) {
  if (!value) return 0;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function moneyFromCents(value) { return currency.format(value / 100); }

function validLink(value) {
  const cleaned = textField(value, 'Link do comprovante', 2048);
  if (!cleaned) return '';
  try {
    const url = new URL(cleaned);
    if (url.protocol !== 'https:' || !url.hostname) throw new Error();
    return url.href;
  } catch { throw new Error('O comprovante precisa ter um link HTTPS válido.'); }
}

function normalizeRecord(raw, allowLegacyMissingCompletionDate = false) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Registro inválido.');
  const id = textField(raw.id, 'Identificador', 100, true);
  if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Identificador inválido.');
  const record = {
    id,
    description: textField(raw.description, 'Descrição da atividade', 120, true),
    category: textField(raw.category ?? '', 'Categoria', 60),
    owner: textField(raw.owner ?? '', 'Responsável', 80),
    deadline: validDate(raw.deadline ?? '', 'Prazo'),
    periodicity: raw.periodicity ?? 'Pontual',
    priority: raw.priority ?? 'Normal',
    status: raw.status ?? 'Não iniciada',
    executionDate: validDate(raw.executionDate ?? '', 'Data da execução'),
    budget: validAmount(raw.budget ?? '', 'Valor previsto'),
    actual: validAmount(raw.actual ?? '', 'Valor realizado'),
    receipt: validLink(raw.receipt ?? ''),
    notes: textField(raw.notes ?? '', 'Observações', 500)
  };
  if (!PERIODICITIES.includes(record.periodicity)) throw new Error('Periodicidade inválida.');
  if (!PRIORITIES.includes(record.priority)) throw new Error('Prioridade inválida.');
  if (!STATUSES.includes(record.status)) throw new Error('Situação inválida.');
  if (record.status === 'Concluída' && !record.executionDate && !allowLegacyMissingCompletionDate) {
    throw new Error('Informe a data de conclusão da atividade.');
  }
  return record;
}

function normalizeList(raw, allowLegacyMissingCompletionDate = false) {
  if (!Array.isArray(raw) || raw.length > MAX_RECORDS) throw new Error('A cópia excede o limite de registros ou não é uma lista.');
  const records = raw.map(item => normalizeRecord(item, allowLegacyMissingCompletionDate));
  if (new Set(records.map(item => item.id)).size !== records.length) throw new Error('A cópia contém registros duplicados.');
  return records;
}

function save() {
  if (!storageAvailable || storageCorrupt) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    return true;
  } catch { return false; }
}

function savedMessage(successText) {
  if (save()) show(`${successText} Exporte uma cópia de segurança após a atualização.`);
  else show(`${successText} O navegador não salvou a alteração. Exporte o JSON antes de sair.`, 'notice');
}

function localToday() {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function effectiveStatus(activity) {
  if (activity.status !== 'Concluída' && activity.status !== 'Cancelada' && activity.deadline && activity.deadline < localToday()) return 'Atrasada';
  return activity.status;
}

function formattedDate(value) { return value ? value.split('-').reverse().join('/') : ''; }

function resetForm() {
  $('activity-form').reset();
  $('edit-id').value = '';
  $('form-title').textContent = 'Nova atividade';
  $('cancel-edit').hidden = true;
}

function updateCategoryFilter() {
  const select = $('category-filter');
  const selected = select.value;
  const categories = [...new Set(activities.map(item => item.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.replaceChildren();
  const all = document.createElement('option'); all.value = ''; all.textContent = 'Todas'; select.append(all);
  for (const category of categories) {
    const option = document.createElement('option'); option.value = category; option.textContent = category; select.append(option);
  }
  select.value = categories.includes(selected) ? selected : '';
}

function render() {
  updateCategoryFilter();
  const planned = activities.reduce((sum, item) => sum + cents(item.budget), 0);
  const spent = activities.reduce((sum, item) => sum + cents(item.actual), 0);
  $('total').textContent = activities.length;
  $('done').textContent = activities.filter(item => item.status === 'Concluída').length;
  $('late').textContent = activities.filter(item => effectiveStatus(item) === 'Atrasada').length;
  $('planned').textContent = moneyFromCents(planned);
  $('spent').textContent = moneyFromCents(spent);
  $('difference').textContent = moneyFromCents(spent - planned);

  const query = $('search').value.trim().toLocaleLowerCase('pt-BR');
  const status = $('status-filter').value;
  const category = $('category-filter').value;
  const month = $('month-filter').value;
  const visible = activities.filter(item =>
    (!status || effectiveStatus(item) === status) &&
    (!category || item.category === category) &&
    (!month || item.deadline.startsWith(month + '-')) &&
    (!query || `${item.description} ${item.category} ${item.owner}`.toLocaleLowerCase('pt-BR').includes(query))
  ).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.description.localeCompare(b.description, 'pt-BR'));

  const container = $('items');
  container.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.textContent = activities.length ? 'Nenhuma atividade encontrada.' : 'Nenhuma atividade cadastrada.';
    container.append(empty);
    return;
  }
  for (const item of visible) {
    const article = document.createElement('article'); article.className = 'item';
    const title = document.createElement('h3'); title.textContent = item.description; article.append(title);
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = [item.category, item.periodicity, effectiveStatus(item), item.deadline && `Prazo: ${formattedDate(item.deadline)}`, item.executionDate && `Execução: ${formattedDate(item.executionDate)}`, `Previsto: ${moneyFromCents(cents(item.budget))}`, `Realizado: ${moneyFromCents(cents(item.actual))}`, `Diferença: ${moneyFromCents(cents(item.actual) - cents(item.budget))}`, item.owner && `Responsável: ${item.owner}`].filter(Boolean).join(' · ');
    article.append(meta);
    if (item.notes) { const note = document.createElement('p'); note.className = 'small'; note.textContent = item.notes; article.append(note); }
    const actions = document.createElement('div'); actions.className = 'actions';
    if (item.receipt) { const link = document.createElement('a'); link.href = item.receipt; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Abrir comprovante'; actions.append(link); }
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editActivity(item.id)); actions.append(edit);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => {
      if (!confirm('Excluir esta atividade?')) return;
      activities = activities.filter(record => record.id !== item.id);
      render(); savedMessage('Atividade excluída.');
    }); actions.append(remove);
    article.append(actions); container.append(article);
  }
}

function editActivity(id) {
  const item = activities.find(record => record.id === id);
  if (!item) return;
  for (const field of FIELDS) $(field).value = item[field];
  $('edit-id').value = id;
  $('form-title').textContent = 'Editar atividade';
  $('cancel-edit').hidden = false;
  $('activity-form').scrollIntoView({behavior: 'smooth'});
  $('description').focus();
}

function newId() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

$('activity-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const raw = {id: $('edit-id').value || newId()};
    for (const field of FIELDS) raw[field] = $(field).value;
    const record = normalizeRecord(raw);
    const index = activities.findIndex(item => item.id === record.id);
    if (index < 0 && activities.length >= MAX_RECORDS) throw new Error('Limite de atividades atingido.');
    if (index >= 0) activities[index] = record; else activities.push(record);
    resetForm(); render(); savedMessage('Atividade salva.');
  } catch (error) { show(error.message, 'notice'); }
});

$('cancel-edit').addEventListener('click', resetForm);
$('search').addEventListener('input', render);
for (const id of ['status-filter', 'category-filter', 'month-filter']) $(id).addEventListener('change', render);
$('import-trigger').addEventListener('click', () => $('import-file').click());

$('export').addEventListener('click', () => {
  const backup = {version: 1, exportedAt: new Date().toISOString(), activities};
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `plano-trabalho-${localToday()}.json`;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('O arquivo de cópia de segurança é grande demais.');
    const backup = JSON.parse(await file.text());
    if (!backup || backup.version !== 1) throw new Error('Versão de cópia de segurança não reconhecida.');
    const restored = normalizeList(backup.activities, true);
    if (!confirm(`Substituir as ${activities.length} atividades atuais pelas ${restored.length} da cópia?`)) return;
    activities = restored;
    storageCorrupt = false;
    resetForm(); render(); savedMessage('Cópia importada.');
  } catch (error) { show(`Importação cancelada: ${error.message}`, 'notice'); }
  finally { event.target.value = ''; }
});

try {
  localStorage.setItem(`${STORAGE_KEY}-test`, '1');
  localStorage.removeItem(`${STORAGE_KEY}-test`);
  storageAvailable = true;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) activities = normalizeList(JSON.parse(raw), true);
} catch (error) {
  if (storageAvailable) {
    storageCorrupt = true;
    show('Os dados salvos não puderam ser lidos. Importe uma cópia de segurança antes de continuar.', 'notice');
  } else show('Armazenamento indisponível. Exporte um JSON antes de fechar esta página.', 'notice');
}
render();

