'use strict';

// Extrato demonstrativo independente dos valores planejados nas atividades.
(() => {
  const STORAGE_KEY = 'gestao-condominial-demo-finance-v1';
  const MAX_RECORDS = 1000;
  const CATEGORIES = {
    Entrada: {
      'Cotas condominiais': ['Ordinária', 'Extraordinária'],
      'Receitas acessórias': ['Garagem extra', 'Uso de áreas comuns'],
      'Outras entradas': ['Reembolso', 'Rendimentos', 'Outros']
    },
    Saída: {
      Pessoal: ['Salários', 'Encargos', 'Benefícios'],
      Consumo: ['Água', 'Energia', 'Gás'],
      Manutenção: ['Preventiva', 'Corretiva', 'Elevadores'],
      Serviços: ['Limpeza', 'Segurança', 'Administração'],
      'Tributos e seguros': ['Tributos', 'Seguro'],
      'Obras e melhorias': ['Obras', 'Melhorias'],
      'Outras saídas': ['Taxas bancárias', 'Outros']
    }
  };
  const $ = id => document.getElementById(id);
  const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
  let records = [];
  let storageAvailable = false;
  let storageCorrupt = false;

  function amountInCents(value) {
    const [whole, decimal = ''] = value.split('.');
    return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  }
  function money(value) { return currency.format(value / 100); }
  function dateBR(value) { return value.split('-').reverse().join('/'); }
  function plainText(value, label, max, required = false) {
    if (typeof value !== 'string') throw new Error(`${label}: texto inválido.`);
    const result = value.trim();
    if (required && !result) throw new Error(`Informe ${label.toLowerCase()}.`);
    if (result.length > max) throw new Error(`${label}: máximo de ${max} caracteres.`);
    return result;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Lançamento inválido.');
    const id = plainText(raw.id, 'Identificador', 100, true);
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Identificador inválido.');
    const date = plainText(raw.date, 'Data', 10, true);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Data inválida.');
    const type = plainText(raw.type, 'Tipo', 10, true);
    if (!CATEGORIES[type]) throw new Error('Tipo inválido.');
    const category = plainText(raw.category, 'Categoria', 60, true);
    const subcategory = plainText(raw.subcategory, 'Subcategoria', 60, true);
    if (!CATEGORIES[type][category] || !CATEGORIES[type][category].includes(subcategory)) throw new Error('Categoria ou subcategoria inválida para o tipo informado.');
    const amount = String(raw.amount ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || amountInCents(amount) < 1 || amountInCents(amount) > 99999999999) throw new Error('Valor: informe um valor maior que zero com até duas casas decimais.');
    return {id, date, type, description: plainText(raw.description, 'Descrição', 120, true), category, subcategory, amount, notes: plainText(raw.notes ?? '', 'Observações', 300)};
  }
  function validateData(raw) {
    if (!Array.isArray(raw) || raw.length > MAX_RECORDS) throw new Error('A lista de lançamentos é inválida ou excede o limite.');
    const list = raw.map(normalize);
    if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('Há lançamentos duplicados na cópia.');
    return list;
  }
  function save() {
    if (!storageAvailable || storageCorrupt) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); return true; }
    catch { return false; }
  }
  function show(message, type = 'success') { window.uiFeedback.showPageMessage(message, type); }
  function option(select, label, value = label) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    select.append(element);
  }
  function updateFormCategories(preferredCategory = '', preferredSubcategory = '') {
    const type = $('transaction-type').value;
    const category = $('transaction-category');
    category.replaceChildren();
    for (const name of Object.keys(CATEGORIES[type])) option(category, name);
    if (preferredCategory && CATEGORIES[type][preferredCategory]) category.value = preferredCategory;
    const subcategory = $('transaction-subcategory');
    subcategory.replaceChildren();
    for (const name of CATEGORIES[type][category.value]) option(subcategory, name);
    if (preferredSubcategory && CATEGORIES[type][category.value].includes(preferredSubcategory)) subcategory.value = preferredSubcategory;
  }
  function resetForm() {
    $('finance-form').reset();
    window.uiFeedback.clearFormErrors($('finance-form'));
    $('transaction-id').value = '';
    $('finance-form-title').textContent = 'Novo lançamento';
    $('finance-form').querySelector('[type="submit"]').textContent = 'Salvar lançamento';
    $('finance-form-panel').hidden = true;
    $('new-transaction').setAttribute('aria-expanded', 'false');
    updateFormCategories();
  }
  function openForm(record = null) {
    resetForm();
    if (record) {
      $('transaction-id').value = record.id;
      $('transaction-date').value = record.date;
      $('transaction-type').value = record.type;
      updateFormCategories(record.category, record.subcategory);
      $('transaction-description').value = record.description;
      $('transaction-amount').value = record.amount;
      $('transaction-notes').value = record.notes;
      $('finance-form-title').textContent = 'Editar lançamento';
      $('finance-form').querySelector('[type="submit"]').textContent = 'Atualizar lançamento';
    } else $('transaction-date').value = new Date().toLocaleDateString('sv-SE');
    $('finance-form-panel').hidden = false;
    $('new-transaction').setAttribute('aria-expanded', 'true');
    $('finance-form-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('transaction-date').focus();
  }
  function makeButton(label, className, callback) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = className; button.textContent = label;
    button.addEventListener('click', callback);
    return button;
  }
  function actionsFor(record) {
    const actions = document.createElement('div');
    actions.className = 'actions ledger-actions';
    actions.append(makeButton('Editar', 'secondary', () => openForm(record)));
    actions.append(makeButton('Excluir', 'danger', () => {
      if (!confirm('Excluir este lançamento do extrato demonstrativo?')) return;
      records = records.filter(item => item.id !== record.id);
      render();
      const saved = save();
      show(saved ? 'Lançamento excluído. Exporte uma cópia de segurança após a atualização.' : 'Lançamento excluído apenas nesta sessão. Exporte o JSON antes de sair.', saved ? 'success' : 'notice');
    }));
    return actions;
  }
  function render() {
    const chronological = [...records].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let running = 0;
    const balances = new Map();
    for (const item of chronological) {
      running += (item.type === 'Entrada' ? 1 : -1) * amountInCents(item.amount);
      balances.set(item.id, running);
    }
    const inflows = records.filter(item => item.type === 'Entrada').reduce((sum, item) => sum + amountInCents(item.amount), 0);
    const outflows = records.filter(item => item.type === 'Saída').reduce((sum, item) => sum + amountInCents(item.amount), 0);
    $('ledger-opening').textContent = money(0);
    $('ledger-inflows').textContent = money(inflows);
    $('ledger-outflows').textContent = money(outflows);
    $('ledger-balance').textContent = money(running);

    const categoryFilter = $('ledger-category-filter');
    const selectedCategory = categoryFilter.value;
    categoryFilter.replaceChildren(); option(categoryFilter, 'Todas', '');
    for (const name of [...new Set(records.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'))) option(categoryFilter, name);
    categoryFilter.value = [...categoryFilter.options].some(item => item.value === selectedCategory) ? selectedCategory : '';
    const query = $('ledger-search').value.trim().toLocaleLowerCase('pt-BR');
    const type = $('ledger-type-filter').value;
    const month = $('ledger-month-filter').value;
    const visible = chronological.filter(item =>
      (!type || item.type === type) && (!month || item.date.startsWith(`${month}-`)) &&
      (!categoryFilter.value || item.category === categoryFilter.value) &&
      (!query || `${item.description} ${item.category} ${item.subcategory} ${item.notes}`.toLocaleLowerCase('pt-BR').includes(query))
    ).reverse();
    $('ledger-count').textContent = visible.length;
    $('ledger-rows').replaceChildren(); $('ledger-mobile').replaceChildren();
    $('ledger-empty').hidden = visible.length > 0;
    $('ledger-empty').textContent = records.length ? 'Nenhum lançamento encontrado com estes filtros.' : 'Nenhum lançamento cadastrado. Use “Novo lançamento” para começar.';
    for (const item of visible) {
      const value = money(amountInCents(item.amount));
      const row = document.createElement('tr');
      for (const content of [dateBR(item.date), item.description, `${item.category} / ${item.subcategory}`, item.type === 'Entrada' ? value : '—', item.type === 'Saída' ? value : '—', money(balances.get(item.id))]) {
        const cell = document.createElement('td'); cell.textContent = content; row.append(cell);
      }
      const actionCell = document.createElement('td'); actionCell.append(actionsFor(item)); row.append(actionCell);
      $('ledger-rows').append(row);

      const card = document.createElement('article'); card.className = 'ledger-mobile-card';
      const head = document.createElement('div'); head.className = 'ledger-mobile-head';
      const title = document.createElement('strong'); title.textContent = item.description;
      const amount = document.createElement('strong'); amount.className = item.type === 'Entrada' ? 'ledger-in' : 'ledger-out'; amount.textContent = `${item.type === 'Entrada' ? '+' : '−'} ${value}`;
      head.append(title, amount);
      const meta = document.createElement('p'); meta.textContent = `${dateBR(item.date)} · ${item.category} / ${item.subcategory}`;
      const balance = document.createElement('p'); balance.textContent = `Saldo após: ${money(balances.get(item.id))}`;
      card.append(head, meta, balance, actionsFor(item)); $('ledger-mobile').append(card);
    }
    renderCategories();
  }
  function renderCategories() {
    const container = $('ledger-category-summary'); container.replaceChildren();
    if (!records.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Nenhum lançamento para resumir.'; container.append(empty); return; }
    for (const type of ['Entrada', 'Saída']) {
      const section = document.createElement('section'); section.className = 'category-group';
      const title = document.createElement('h4'); title.textContent = type === 'Entrada' ? 'Entradas' : 'Saídas'; section.append(title);
      for (const [category, subcategories] of Object.entries(CATEGORIES[type])) {
        const matching = records.filter(item => item.type === type && item.category === category);
        if (!matching.length) continue;
        const group = document.createElement('div'); group.className = 'category-card';
        const head = document.createElement('div'); head.className = 'category-card-head';
        const name = document.createElement('strong'); name.textContent = category;
        const total = document.createElement('strong'); total.textContent = money(matching.reduce((sum, item) => sum + amountInCents(item.amount), 0));
        head.append(name, total); group.append(head);
        for (const subcategory of subcategories) {
          const subset = matching.filter(item => item.subcategory === subcategory);
          if (!subset.length) continue;
          const line = document.createElement('div'); line.className = 'category-line';
          const label = document.createElement('span'); label.textContent = `${subcategory} · ${subset.length} ${subset.length === 1 ? 'lançamento' : 'lançamentos'}`;
          const value = document.createElement('span'); value.textContent = money(subset.reduce((sum, item) => sum + amountInCents(item.amount), 0));
          line.append(label, value); group.append(line);
        }
        section.append(group);
      }
      container.append(section);
    }
  }
  function addExamples() {
    if (storageCorrupt) throw new Error('Os lançamentos salvos não puderam ser lidos. Importe uma cópia antes de adicionar exemplos.');
    const examples = validateData(window.demoSeed.finance);
    const missing = examples.filter(seed => !records.some(item => item.id === seed.id));
    if (records.length + missing.length > MAX_RECORDS) throw new Error('Limite de lançamentos atingido.');
    records = [...records, ...missing]; render();
    return {added: missing.length, saved: save()};
  }
  function importData(list) { records = validateData(list); storageCorrupt = false; resetForm(); render(); return save(); }

  $('new-transaction').addEventListener('click', () => openForm());
  $('cancel-transaction').addEventListener('click', resetForm);
  $('transaction-type').addEventListener('change', () => updateFormCategories());
  $('transaction-category').addEventListener('change', () => updateFormCategories($('transaction-category').value));
  for (const id of ['ledger-search', 'ledger-type-filter', 'ledger-month-filter', 'ledger-category-filter']) $(id).addEventListener(id === 'ledger-search' ? 'input' : 'change', render);
  $('ledger-clear-filters').addEventListener('click', () => { for (const id of ['ledger-search', 'ledger-type-filter', 'ledger-month-filter', 'ledger-category-filter']) $(id).value = ''; render(); });
  $('finance-form').addEventListener('submit', event => {
    event.preventDefault(); window.uiFeedback.clearFormErrors($('finance-form'));
    try {
      if (storageCorrupt) throw new Error('Os lançamentos salvos não puderam ser lidos. Importe uma cópia antes de editar.');
      const raw = {id: $('transaction-id').value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`), date: $('transaction-date').value, type: $('transaction-type').value, description: $('transaction-description').value, category: $('transaction-category').value, subcategory: $('transaction-subcategory').value, amount: $('transaction-amount').value, notes: $('transaction-notes').value};
      const record = normalize(raw);
      const index = records.findIndex(item => item.id === record.id);
      if (index < 0 && records.length >= MAX_RECORDS) throw new Error('Limite de lançamentos atingido.');
      if (index < 0) records.push(record); else records[index] = record;
      resetForm(); render();
      const saved = save();
      show(saved ? 'Lançamento salvo. Exporte uma cópia de segurança após a atualização.' : 'Lançamento salvo apenas nesta sessão. Exporte o JSON antes de sair.', saved ? 'success' : 'notice');
    } catch (error) {
      const match = [['Data', 'transaction-date'], ['Descrição', 'transaction-description'], ['Categoria', 'transaction-category'], ['Subcategoria', 'transaction-subcategory'], ['Valor', 'transaction-amount']].find(([label]) => error.message.includes(label));
      window.uiFeedback.showFormError($('finance-form'), match?.[1] || '', error.message);
    }
  });
  try {
    localStorage.setItem(`${STORAGE_KEY}-test`, '1'); localStorage.removeItem(`${STORAGE_KEY}-test`);
    storageAvailable = true;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) records = validateData(JSON.parse(saved));
  } catch {
    if (storageAvailable) { storageCorrupt = true; show('Os lançamentos financeiros salvos não puderam ser lidos. Importe uma cópia de segurança.', 'notice'); }
    else show('Armazenamento indisponível. Exporte um JSON antes de fechar esta página.', 'notice');
  }
  updateFormCategories(); render();
  window.financeLedger = {addExamples, exportData: () => records.map(item => ({...item})), validateData, importData};
  try {
    const marker = 'gestao-condominial-demo-finance-seed-v1';
    if (localStorage.getItem(marker) === null && addExamples().saved) localStorage.setItem(marker, '1');
  } catch (error) { show(error.message || 'Não foi possível adicionar os exemplos financeiros.', 'notice'); }
})();

