'use strict';

const STORAGE_KEY = 'plano-trabalho-sqs110f-v1';
const MAX_RECORDS = 1000;
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const STATUSES = ['Não iniciada', 'Em andamento', 'Concluída', 'Cancelada'];
const PRIORITIES = ['Normal', 'Alta', 'Baixa'];
const PERIODICITIES = ['Pontual', 'Mensal', 'Trimestral', 'Semestral', 'Anual'];
const EXPENSE_NATURES = ['', 'Ordinária', 'Eventual'];
const FIELDS = ['description', 'category', 'expenseNature', 'owner', 'supplier', 'deadline', 'periodicity', 'priority', 'status', 'executionDate', 'budget', 'actual', 'receipt', 'notes'];
const $ = id => document.getElementById(id);
const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
const percent = new Intl.NumberFormat('pt-BR', {style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1});
let activities = [];
let storageAvailable = false;
let storageCorrupt = false;

function show(message, type = 'success') {
  window.uiFeedback.showPageMessage(message, type);
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
    expenseNature: raw.expenseNature ?? '',
    owner: textField(raw.owner ?? '', 'Responsável', 80),
    supplier: textField(raw.supplier ?? '', 'Empresa prestadora', 100),
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
  if (!EXPENSE_NATURES.includes(record.expenseNature)) throw new Error('Natureza da despesa inválida.');
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

function dateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function renderFinance(planned, spent) {
  $('finance-planned').textContent = moneyFromCents(planned);
  $('finance-actual').textContent = moneyFromCents(spent);
  $('finance-difference').textContent = moneyFromCents(spent - planned);
  $('finance-percent').textContent = planned ? percent.format((spent - planned) / planned) : '—';
  $('finance-interpretation').textContent = !activities.length
    ? 'Cadastre atividades para comparar os valores.'
    : spent > planned ? 'O realizado está acima do previsto nas atividades cadastradas.'
    : spent < planned ? 'O realizado está abaixo do previsto nas atividades cadastradas.'
    : 'O realizado está igual ao previsto nas atividades cadastradas.';
  const body = $('finance-by-nature');
  body.replaceChildren();
  const mobile = $('finance-by-nature-mobile');
  mobile.replaceChildren();
  for (const [value, label] of [['Ordinária', 'Ordinária'], ['Eventual', 'Eventual'], ['', 'Não informada']]) {
    const group = activities.filter(item => item.expenseNature === value);
    const groupPlanned = group.reduce((sum, item) => sum + cents(item.budget), 0);
    const groupSpent = group.reduce((sum, item) => sum + cents(item.actual), 0);
    const values = [label, String(group.length), moneyFromCents(groupPlanned), moneyFromCents(groupSpent), moneyFromCents(groupSpent - groupPlanned)];
    const row = document.createElement('tr');
    for (const cellValue of values) {
      const cell = document.createElement('td');
      cell.textContent = cellValue;
      row.append(cell);
    }
    body.append(row);
    const card = document.createElement('article');
    card.className = 'finance-mobile-card';
    const title = document.createElement('h5');
    title.textContent = label;
    card.append(title);
    const details = document.createElement('dl');
    for (const [caption, amount] of [['Atividades', values[1]], ['Previsto', values[2]], ['Realizado', values[3]], ['Diferença', values[4]]]) {
      const fact = document.createElement('div');
      const term = document.createElement('dt');
      term.textContent = caption;
      const definition = document.createElement('dd');
      definition.textContent = amount;
      fact.append(term, definition);
      details.append(fact);
    }
    card.append(details);
    mobile.append(card);
  }
}

function renderReceipts() {
  const container = $('receipt-items');
  container.replaceChildren();
  const linked = activities.filter(item => item.receipt).sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'));
  if (!linked.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const message = document.createElement('p');
    message.textContent = 'Nenhum comprovante vinculado às atividades.';
    const link = document.createElement('a');
    link.href = '#plano/atividades';
    link.textContent = 'Ver atividades';
    empty.append(message, link);
    container.append(empty);
    return;
  }
  for (const item of linked) {
    const article = document.createElement('article');
    article.className = 'record receipt-row';
    const summary = document.createElement('div');
    const title = document.createElement('h4');
    title.textContent = item.description;
    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.textContent = [item.category, item.supplier, item.executionDate && `Execução: ${formattedDate(item.executionDate)}`].filter(Boolean).join(' · ');
    const link = document.createElement('a');
    link.href = item.receipt;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.id.startsWith('demo-') ? 'Abrir documento fictício' : 'Abrir comprovante';
    summary.append(title, meta);
    article.append(summary, link);
    container.append(article);
  }
}

function resetForm() {
  $('activity-form').reset();
  window.uiFeedback.clearFormErrors($('activity-form'));
  $('edit-id').value = '';
  $('form-title').textContent = 'Nova atividade';
  if (location.hash === '#plano/nova') $('page-title').textContent = 'Nova atividade';
  $('activity-form').querySelector('button[type="submit"]').textContent = 'Salvar atividade';
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

function renderUpcoming(items) {
  const container = $('upcoming-items');
  container.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'upcoming-empty';
    empty.textContent = 'Nenhuma atividade vence nos próximos 30 dias.';
    container.append(empty);
    return;
  }
  for (const item of items.slice(0, 3)) {
    const row = document.createElement('div');
    row.className = 'upcoming-item';
    const title = document.createElement('strong');
    title.textContent = item.description;
    const date = document.createElement('span');
    date.textContent = formattedDate(item.deadline);
    row.append(title, date);
    container.append(row);
  }
}

function render() {
  updateCategoryFilter();
  const planned = activities.reduce((sum, item) => sum + cents(item.budget), 0);
  const spent = activities.reduce((sum, item) => sum + cents(item.actual), 0);
  $('total').textContent = activities.length;
  $('done').textContent = activities.filter(item => item.status === 'Concluída').length;
  $('progress').textContent = activities.filter(item => item.status === 'Em andamento').length;
  $('late').textContent = activities.filter(item => effectiveStatus(item) === 'Atrasada').length;
  const today = localToday();
  const inThirtyDays = dateAfterDays(30);
  const dueSoon = activities.filter(item => item.deadline && item.deadline >= today && item.deadline <= inThirtyDays && !['Concluída', 'Cancelada'].includes(item.status))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  $('upcoming').textContent = dueSoon.length;
  renderUpcoming(dueSoon);
  $('planned').textContent = moneyFromCents(planned);
  $('spent').textContent = moneyFromCents(spent);
  $('difference').textContent = moneyFromCents(spent - planned);
  renderFinance(planned, spent);
  renderReceipts();
  renderActivityList();
}

function clearActivityFilters() {
  for (const id of ['search', 'status-filter', 'category-filter', 'nature-filter', 'month-filter']) $(id).value = '';
  $('activity-filter-panel').open = false;
  renderActivityList();
}

function addRecordFact(container, label, value) {
  const fact = document.createElement('div');
  fact.className = 'record-fact';
  const caption = document.createElement('span');
  caption.textContent = label;
  const content = document.createElement('strong');
  content.textContent = value;
  fact.append(caption, content);
  container.append(fact);
}

function renderActivityList() {
  const query = $('search').value.trim().toLocaleLowerCase('pt-BR');
  const status = $('status-filter').value;
  const category = $('category-filter').value;
  const nature = $('nature-filter').value;
  const month = $('month-filter').value;
  const activeFilters = [status, category, nature, month].filter(Boolean).length;
  $('active-filter-count').textContent = activeFilters ? `(${activeFilters} ${activeFilters === 1 ? 'ativo' : 'ativos'})` : '';
  const visible = activities.filter(item =>
    (!status || effectiveStatus(item) === status) &&
    (!category || item.category === category) &&
    (!nature || (nature === 'none' ? !item.expenseNature : item.expenseNature === nature)) &&
    (!month || item.deadline.startsWith(month + '-')) &&
    (!query || `${item.description} ${item.category} ${item.owner} ${item.supplier}`.toLocaleLowerCase('pt-BR').includes(query))
  ).sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999') || a.description.localeCompare(b.description, 'pt-BR'));

  const container = $('items');
  container.replaceChildren();
  $('activity-list-count').textContent = visible.length;
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const message = document.createElement('p');
    message.textContent = activities.length ? 'Nenhuma atividade encontrada com estes filtros.' : 'Nenhuma atividade cadastrada.';
    empty.append(message);
    if (activities.length) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.className = 'subtle';
      clear.textContent = 'Limpar filtros';
      clear.addEventListener('click', clearActivityFilters);
      empty.append(clear);
    } else {
      const link = document.createElement('a');
      link.href = '#plano/nova';
      link.textContent = 'Cadastrar primeira atividade';
      empty.append(link);
    }
    container.append(empty);
    return;
  }
  const listHeader = document.createElement('div');
  listHeader.className = 'activity-grid activity-list-header';
  listHeader.setAttribute('aria-hidden', 'true');
  for (const [area, label] of [['name', 'Atividade'], ['status', 'Situação'], ['deadline', 'Prazo'], ['values', 'Valores'], ['actions', 'Ações']]) {
    const cell = document.createElement('span');
    cell.className = `activity-cell--${area}`;
    cell.textContent = label;
    listHeader.append(cell);
  }
  container.append(listHeader);
  for (const item of visible) {
    const article = document.createElement('article'); article.className = 'record activity-grid activity-row';
    const nameCell = document.createElement('div'); nameCell.className = 'activity-cell--name';
    const title = document.createElement('h4'); title.textContent = item.description; nameCell.append(title);
    if (item.owner) {
      const owner = document.createElement('span'); owner.className = 'activity-owner';
      owner.textContent = `Responsável: ${item.owner}`;
      nameCell.append(owner);
    }
    const badge = document.createElement('span'); badge.className = 'status-chip activity-cell--status';
    badge.textContent = effectiveStatus(item);
    if (badge.textContent === 'Concluída') badge.classList.add('is-done');
    if (badge.textContent === 'Atrasada') badge.classList.add('is-late');
    if (badge.textContent === 'Em andamento') badge.classList.add('is-progress');
    const deadline = document.createElement('div'); deadline.className = 'activity-cell--deadline';
    const deadlineLabel = document.createElement('span'); deadlineLabel.className = 'sr-only'; deadlineLabel.textContent = 'Prazo: ';
    deadline.append(deadlineLabel, document.createTextNode(item.deadline ? formattedDate(item.deadline) : 'Não informado'));
    const values = document.createElement('div'); values.className = 'activity-cell--values activity-values';
    addRecordFact(values, 'Previsto', moneyFromCents(cents(item.budget)));
    addRecordFact(values, 'Realizado', moneyFromCents(cents(item.actual)));
    const actions = document.createElement('div'); actions.className = 'actions activity-cell--actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editActivity(item.id)); actions.append(edit);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'danger'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => {
      if (!confirm('Excluir esta atividade?')) return;
      activities = activities.filter(record => record.id !== item.id);
      render(); savedMessage('Atividade excluída.');
    }); actions.append(remove);
    const details = document.createElement('details'); details.className = 'activity-cell--details activity-details';
    const summary = document.createElement('summary'); summary.textContent = 'Ver detalhes'; details.append(summary);
    const facts = document.createElement('div'); facts.className = 'record-facts activity-detail-grid';
    addRecordFact(facts, 'Diferença', moneyFromCents(cents(item.actual) - cents(item.budget)));
    if (item.category) addRecordFact(facts, 'Categoria', item.category);
    if (item.expenseNature) addRecordFact(facts, 'Natureza da despesa', item.expenseNature);
    if (item.periodicity) addRecordFact(facts, 'Periodicidade', item.periodicity);
    if (item.priority === 'Alta') addRecordFact(facts, 'Prioridade', item.priority);
    if (item.executionDate) addRecordFact(facts, 'Execução', formattedDate(item.executionDate));
    if (item.supplier) addRecordFact(facts, 'Empresa prestadora', item.supplier);
    details.append(facts);
    if (item.notes) { const note = document.createElement('p'); note.className = 'record-note'; note.textContent = item.notes; details.append(note); }
    if (item.receipt) { const link = document.createElement('a'); link.href = item.receipt; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.id.startsWith('demo-') ? 'Abrir documento fictício' : 'Abrir comprovante'; details.append(link); }
    article.append(nameCell, badge, deadline, values, actions, details);
    container.append(article);
  }
}

function editActivity(id) {
  const item = activities.find(record => record.id === id);
  if (!item) return;
  show('');
  for (const field of FIELDS) $(field).value = item[field];
  $('edit-id').value = id;
  $('form-title').textContent = 'Editar atividade';
  $('activity-form').querySelector('button[type="submit"]').textContent = 'Atualizar atividade';
  $('cancel-edit').hidden = false;
  window.goToView('plano/nova');
  $('activity-form').scrollIntoView({behavior: 'smooth'});
  $('description').focus();
}

function newId() {
  if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function activityErrorField(message) {
  const fields = [
    [/descrição da atividade/i, 'description'], [/categoria/i, 'category'],
    [/natureza da despesa/i, 'expenseNature'], [/responsável/i, 'owner'],
    [/empresa prestadora/i, 'supplier'], [/^prazo/i, 'deadline'],
    [/periodicidade/i, 'periodicity'], [/prioridade/i, 'priority'],
    [/situação/i, 'status'], [/data de conclusão|data da execução/i, 'executionDate'],
    [/valor previsto/i, 'budget'], [/valor realizado/i, 'actual'],
    [/comprovante/i, 'receipt'], [/observações/i, 'notes']
  ];
  return fields.find(([pattern]) => pattern.test(message))?.[1] || '';
}

$('activity-form').addEventListener('submit', event => {
  event.preventDefault();
  window.uiFeedback.clearFormErrors($('activity-form'));
  try {
    const raw = {id: $('edit-id').value || newId()};
    for (const field of FIELDS) raw[field] = $(field).value;
    const record = normalizeRecord(raw);
    const index = activities.findIndex(item => item.id === record.id);
    if (index < 0 && activities.length >= MAX_RECORDS) throw new Error('Limite de atividades atingido.');
    if (index >= 0) activities[index] = record; else activities.push(record);
    resetForm(); render(); window.goToView('plano/atividades'); savedMessage('Atividade salva.');
  } catch (error) { window.uiFeedback.showFormError($('activity-form'), activityErrorField(error.message), error.message); }
});

$('cancel-edit').addEventListener('click', () => { resetForm(); show(''); window.goToView('plano/atividades'); });
document.addEventListener('click', event => {
  if (event.target instanceof Element && event.target.closest('a[href="#plano/nova"]')) resetForm();
});
$('search').addEventListener('input', renderActivityList);
for (const id of ['status-filter', 'category-filter', 'nature-filter', 'month-filter']) $(id).addEventListener('change', renderActivityList);
$('clear-filters').addEventListener('click', clearActivityFilters);
$('import-trigger').addEventListener('click', () => $('import-file').click());

function addDemoData(silent = false) {
  try {
    if (storageCorrupt) throw new Error('As atividades salvas não puderam ser lidas. Importe uma cópia antes de adicionar exemplos.');
    const examples = normalizeList(window.demoSeed.activities);
    const missing = examples.filter(seed => !activities.some(item => item.id === seed.id));
    if (activities.length + missing.length > MAX_RECORDS) throw new Error('Limite de atividades atingido.');
    const directoryResult = window.demoDirectory.addExamples();
    const financeResult = window.financeLedger.addExamples();
    const documentalResult = window.documental.addExamples();
    activities = [...activities, ...missing];
    render();
    const activitiesSaved = save();
    const added = missing.length + directoryResult.added + financeResult.added + documentalResult.added;
    const message = added ? `${added} registros fictícios adicionados.` : 'Todos os exemplos já estão cadastrados neste navegador.';
    const saved = activitiesSaved && directoryResult.saved && financeResult.saved && documentalResult.saved;
    if (!silent || !saved) show(saved ? message : `${message} Exporte um JSON antes de sair, pois nem tudo foi salvo neste navegador.`, saved ? 'success' : 'notice');
    return saved;
  } catch (error) { show(error.message, 'notice'); return false; }
}

$('add-demo-data').addEventListener('click', () => addDemoData());

$('export').addEventListener('click', () => {
  try {
    const backup = {version: 6, exportedAt: new Date().toISOString(), activities, directory: window.demoDirectory.exportData(), finance: window.financeLedger.exportData(), documental: window.documental.exportData()};
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `plano-trabalho-${localToday()}.json`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    show('Download iniciado. Guarde o arquivo JSON em local privado.');
  } catch { show('Não foi possível iniciar o download da cópia.', 'notice'); }
});

$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  $('import-trigger').disabled = true;
  show('Lendo a cópia de segurança...');
  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('O arquivo de cópia de segurança é grande demais.');
    const backup = JSON.parse(await file.text());
    if (!backup || ![1, 2, 3, 4, 5, 6].includes(backup.version)) throw new Error('Versão de cópia de segurança não reconhecida.');
    const restored = normalizeList(backup.activities, true);
    const restoredDirectory = backup.version >= 2 ? window.demoDirectory.validateData(backup.directory) : null;
    const restoredFinance = backup.version >= 4 ? window.financeLedger.validateData(backup.finance) : null;
    const restoredDocumental = backup.version >= 6 ? window.documental.validateData(backup.documental) : null;
    const restoredLegacyFinance = backup.version === 3 ? window.financeLedger.validateLegacyData(backup.finance) : null;
    const prompt = restoredFinance
      ? backup.version === 6
        ? 'Substituir atividades, cadastros, financeiro e documentos administrativos atuais pelos dados da cópia?'
        : backup.version === 5
        ? 'Substituir atividades, cadastros, lançamentos, categorias, documentos e vínculos atuais pelos dados da cópia?'
        : 'Substituir atividades, cadastros e financeiro pelos dados da versão 4? Essa cópia antiga não contém documentos; os documentos e vínculos atuais serão removidos.'
      : restoredLegacyFinance
      ? 'Substituir atividades, cadastros e lançamentos financeiros pelos dados da cópia? As categorias e os documentos atuais serão mantidos; vínculos com lançamentos removidos serão desfeitos.'
      : restoredDirectory
      ? 'Substituir atividades e cadastros atuais pelos dados da cópia? Lançamentos e categorias financeiras serão mantidos.'
      : `Substituir as ${activities.length} atividades atuais pelas ${restored.length} da cópia antiga? Cadastros de pessoas e lançamentos financeiros serão mantidos.`;
    if (!confirm(`${prompt}${restoredDocumental ? '' : ' Os documentos administrativos desta versão serão mantidos.'}`)) { show('Importação cancelada.'); return; }
    activities = restored;
    const directorySaved = restoredDirectory ? window.demoDirectory.importData(restoredDirectory) : true;
    const financeSaved = restoredFinance ? window.financeLedger.importData(restoredFinance) : restoredLegacyFinance ? window.financeLedger.importLegacyData(restoredLegacyFinance) : true;
    const documentalSaved = restoredDocumental ? window.documental.importData(restoredDocumental) : true;
    storageCorrupt = false;
    resetForm(); render();
    if (directorySaved && financeSaved && documentalSaved) savedMessage('Cópia importada.');
    else show('Cópia importada apenas nesta sessão. Exporte um novo JSON antes de sair.', 'notice');
  } catch (error) { show(`Importação cancelada: ${error.message}`, 'notice'); }
  finally { event.target.value = ''; $('import-trigger').disabled = false; }
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
if (window.demoSeed.autoAddAtLoad && !storageCorrupt && addDemoData(true)) window.demoSeed.markAutoAdded();
render();
