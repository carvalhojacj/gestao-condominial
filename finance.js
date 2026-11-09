'use strict';

// Extrato demonstrativo independente dos valores planejados nas atividades.
(() => {
  const STORAGE_KEY = 'gestao-condominial-demo-finance-v1';
  const MAX_RECORDS = 1000;
  const DEFAULT_CATEGORIES = {
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
  let categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  let storageAvailable = false;
  let storageCorrupt = false;
  let editingCategory = null;
  let editingSubcategory = null;

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
  function validName(value, label) {
    const name = plainText(value, label, 60, true);
    if (['__proto__', 'prototype', 'constructor'].includes(name.toLowerCase())) throw new Error(`${label}: escolha outro nome.`);
    return name;
  }
  function cloneCategories(source = categories) { return JSON.parse(JSON.stringify(source)); }
  function validateCategories(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Categorias inválidas.');
    const normalized = {Entrada: {}, Saída: {}};
    for (const type of ['Entrada', 'Saída']) {
      const group = raw[type];
      if (!group || typeof group !== 'object' || Array.isArray(group)) throw new Error(`Categorias de ${type.toLowerCase()} inválidas.`);
      const entries = Object.entries(group);
      if (!entries.length || entries.length > 50) throw new Error(`Cadastre entre 1 e 50 categorias de ${type.toLowerCase()}.`);
      const names = new Set();
      for (const [rawName, rawSubcategories] of entries) {
        const name = validName(rawName, 'Categoria');
        const key = name.toLocaleLowerCase('pt-BR');
        if (names.has(key)) throw new Error(`Categoria duplicada: ${name}.`);
        names.add(key);
        if (!Array.isArray(rawSubcategories) || !rawSubcategories.length || rawSubcategories.length > 30) throw new Error(`Cadastre entre 1 e 30 subcategorias em ${name}.`);
        const subs = rawSubcategories.map(value => validName(value, 'Subcategoria'));
        if (new Set(subs.map(value => value.toLocaleLowerCase('pt-BR'))).size !== subs.length) throw new Error(`Há subcategorias duplicadas em ${name}.`);
        normalized[type][name] = subs;
      }
    }
    return normalized;
  }
  function normalize(raw, categoryMap = categories) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Lançamento inválido.');
    const id = plainText(raw.id, 'Identificador', 100, true);
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Identificador inválido.');
    const date = plainText(raw.date, 'Data', 10, true);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Data inválida.');
    const type = plainText(raw.type, 'Tipo', 10, true);
    if (!categoryMap[type]) throw new Error('Tipo inválido.');
    const category = plainText(raw.category, 'Categoria', 60, true);
    const subcategory = plainText(raw.subcategory, 'Subcategoria', 60, true);
    if (!Object.hasOwn(categoryMap[type], category) || !categoryMap[type][category].includes(subcategory)) throw new Error('Categoria ou subcategoria inválida para o tipo informado.');
    const amount = String(raw.amount ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || amountInCents(amount) < 1 || amountInCents(amount) > 99999999999) throw new Error('Valor: informe um valor maior que zero com até duas casas decimais.');
    return {id, date, type, description: plainText(raw.description, 'Descrição', 120, true), category, subcategory, amount, notes: plainText(raw.notes ?? '', 'Observações', 300)};
  }
  function validateRecords(raw, categoryMap = categories) {
    if (!Array.isArray(raw) || raw.length > MAX_RECORDS) throw new Error('A lista de lançamentos é inválida ou excede o limite.');
    const list = raw.map(item => normalize(item, categoryMap));
    if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('Há lançamentos duplicados na cópia.');
    return list;
  }
  function validateData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Dados financeiros inválidos.');
    const categoryMap = validateCategories(raw.categories);
    return {categories: categoryMap, records: validateRecords(raw.records, categoryMap)};
  }
  function validateLegacyData(raw) { return validateRecords(raw, DEFAULT_CATEGORIES); }
  function save() {
    if (!storageAvailable || storageCorrupt) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({records, categories})); return true; }
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
    for (const name of Object.keys(categories[type])) option(category, name);
    if (preferredCategory && Object.hasOwn(categories[type], preferredCategory)) category.value = preferredCategory;
    const subcategory = $('transaction-subcategory');
    subcategory.replaceChildren();
    for (const name of categories[type][category.value]) option(subcategory, name);
    if (preferredSubcategory && categories[type][category.value].includes(preferredSubcategory)) subcategory.value = preferredSubcategory;
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
  function namedButton(label, accessibleName, className, callback) {
    const button = makeButton(label, className, callback);
    button.setAttribute('aria-label', accessibleName);
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
    for (const name of [...new Set([...Object.keys(categories.Entrada), ...Object.keys(categories.Saída)])].sort((a, b) => a.localeCompare(b, 'pt-BR'))) option(categoryFilter, name);
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
    for (const type of ['Entrada', 'Saída']) {
      const section = document.createElement('section'); section.className = 'category-group';
      const title = document.createElement('h4'); title.textContent = type === 'Entrada' ? 'Entradas' : 'Saídas'; section.append(title);
      for (const [category, subcategories] of Object.entries(categories[type])) {
        const matching = records.filter(item => item.type === type && item.category === category);
        const group = document.createElement('div'); group.className = 'category-card';
        const head = document.createElement('div'); head.className = 'category-card-head';
        const name = document.createElement('strong'); name.textContent = category;
        const total = document.createElement('strong'); total.textContent = money(matching.reduce((sum, item) => sum + amountInCents(item.amount), 0));
        const actions = document.createElement('div'); actions.className = 'category-actions';
        actions.append(namedButton('Editar', `Editar categoria ${category}`, 'secondary', () => openCategoryForm(type, category)));
        actions.append(namedButton('Excluir', `Excluir categoria ${category}`, 'danger', () => {
          if (matching.length) { show(`A categoria ${category} possui lançamentos. Exclua ou reclassifique esses lançamentos antes de removê-la.`, 'notice'); return; }
          if (Object.keys(categories[type]).length === 1) { show(`É necessário manter ao menos uma categoria de ${type.toLowerCase()}.`, 'notice'); return; }
          confirmCategoryDeletion(group, `Excluir a categoria ${category} e suas subcategorias?`, () => {
            const next = cloneCategories(); delete next[type][category]; applyCategoryChange(next, records, 'Categoria excluída.');
          });
        }));
        head.append(name, total, actions); group.append(head);
        const addSubcategory = document.createElement('div'); addSubcategory.className = 'category-actions';
        addSubcategory.append(makeButton('Nova subcategoria', 'secondary', () => openSubcategoryForm(type, category)));
        group.append(addSubcategory);
        for (const subcategory of subcategories) {
          const subset = matching.filter(item => item.subcategory === subcategory);
          const line = document.createElement('div'); line.className = 'category-line';
          const label = document.createElement('span'); label.textContent = `${subcategory} · ${subset.length} ${subset.length === 1 ? 'lançamento' : 'lançamentos'}`;
          const value = document.createElement('span'); value.textContent = money(subset.reduce((sum, item) => sum + amountInCents(item.amount), 0));
          const subActions = document.createElement('div'); subActions.className = 'category-actions';
          subActions.append(namedButton('Editar', `Editar subcategoria ${subcategory} de ${category}`, 'secondary', () => openSubcategoryForm(type, category, subcategory)));
          subActions.append(namedButton('Excluir', `Excluir subcategoria ${subcategory} de ${category}`, 'danger', () => {
            if (subset.length) { show(`A subcategoria ${subcategory} possui lançamentos. Exclua ou reclassifique esses lançamentos antes de removê-la.`, 'notice'); return; }
            if (subcategories.length === 1) { show(`É necessário manter ao menos uma subcategoria em ${category}.`, 'notice'); return; }
            confirmCategoryDeletion(line, `Excluir a subcategoria ${subcategory}?`, () => {
              const next = cloneCategories(); next[type][category] = next[type][category].filter(item => item !== subcategory); applyCategoryChange(next, records, 'Subcategoria excluída.');
            });
          }));
          line.append(label, value, subActions); group.append(line);
        }
        section.append(group);
      }
      container.append(section);
    }
  }
  function resetCategoryForms() {
    $('finance-category-form').reset(); $('finance-subcategory-form').reset();
    window.uiFeedback.clearFormErrors($('finance-category-form'));
    window.uiFeedback.clearFormErrors($('finance-subcategory-form'));
    $('finance-category-form-panel').hidden = true;
    $('finance-subcategory-form-panel').hidden = true;
    $('new-finance-category').setAttribute('aria-expanded', 'false');
    $('finance-category-type').disabled = false;
    $('finance-category-first-label').hidden = false;
    $('finance-category-first').required = true;
    editingCategory = null; editingSubcategory = null;
  }
  function openCategoryForm(type = 'Entrada', name = '') {
    resetCategoryForms();
    if (name) editingCategory = {type, name};
    $('finance-category-type').value = type;
    $('finance-category-type').disabled = Boolean(name);
    $('finance-category-name').value = name;
    $('finance-category-first-label').hidden = Boolean(name);
    $('finance-category-first').required = !name;
    $('finance-category-form-title').textContent = name ? 'Editar categoria' : 'Nova categoria';
    $('finance-category-form').querySelector('[type="submit"]').textContent = name ? 'Atualizar categoria' : 'Salvar categoria';
    $('finance-category-form-panel').hidden = false;
    $('new-finance-category').setAttribute('aria-expanded', 'true');
    $('finance-category-form-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('finance-category-name').focus();
  }
  function openSubcategoryForm(type, category, name = '') {
    resetCategoryForms();
    editingSubcategory = {type, category, name};
    $('finance-subcategory-form-title').textContent = name ? 'Editar subcategoria' : 'Nova subcategoria';
    $('finance-subcategory-parent').textContent = `${type} · ${category}`;
    $('finance-subcategory-name').value = name;
    $('finance-subcategory-form').querySelector('[type="submit"]').textContent = name ? 'Atualizar subcategoria' : 'Salvar subcategoria';
    $('finance-subcategory-form-panel').hidden = false;
    $('finance-subcategory-form-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('finance-subcategory-name').focus();
  }
  function applyCategoryChange(nextCategories, nextRecords, message) {
    if (storageCorrupt) throw new Error('Os dados financeiros salvos não puderam ser lidos. Importe uma cópia antes de alterar categorias.');
    const validatedCategories = validateCategories(nextCategories);
    const validatedRecords = validateRecords(nextRecords, validatedCategories);
    categories = validatedCategories; records = validatedRecords;
    resetForm(); resetCategoryForms(); render();
    const saved = save();
    show(saved ? `${message} Exporte uma cópia de segurança após a atualização.` : `${message} A alteração ficou apenas nesta sessão. Exporte o JSON antes de sair.`, saved ? 'success' : 'notice');
  }
  function confirmCategoryDeletion(host, question, onConfirm) {
    $('ledger-category-summary').querySelectorAll('.category-confirmation').forEach(item => item.remove());
    const box = document.createElement('div'); box.className = 'category-confirmation'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Confirmar exclusão');
    const text = document.createElement('p'); text.textContent = question;
    const confirmButton = makeButton('Confirmar exclusão', 'danger', () => { try { onConfirm(); } catch (error) { show(error.message, 'notice'); } });
    const cancelButton = makeButton('Cancelar', 'secondary', () => box.remove());
    box.append(text, confirmButton, cancelButton); host.append(box); confirmButton.focus();
  }
  function nameAlreadyExists(names, candidate, except = '') {
    return names.some(name => name !== except && name.toLocaleLowerCase('pt-BR') === candidate.toLocaleLowerCase('pt-BR'));
  }
  function addExamples() {
    if (storageCorrupt) throw new Error('Os lançamentos salvos não puderam ser lidos. Importe uma cópia antes de adicionar exemplos.');
    const nextCategories = cloneCategories();
    for (const item of window.demoSeed.finance) {
      if (!Object.hasOwn(nextCategories[item.type], item.category)) nextCategories[item.type][item.category] = [];
      if (!nextCategories[item.type][item.category].includes(item.subcategory)) nextCategories[item.type][item.category].push(item.subcategory);
    }
    const validatedCategories = validateCategories(nextCategories);
    const examples = validateRecords(window.demoSeed.finance, validatedCategories);
    const missing = examples.filter(seed => !records.some(item => item.id === seed.id));
    if (records.length + missing.length > MAX_RECORDS) throw new Error('Limite de lançamentos atingido.');
    categories = validatedCategories;
    records = [...records, ...missing]; render();
    return {added: missing.length, saved: save()};
  }
  function importData(raw) {
    const restored = validateData(raw);
    categories = restored.categories; records = restored.records; storageCorrupt = false;
    resetForm(); resetCategoryForms(); render(); return save();
  }
  function importLegacyData(raw) {
    const restored = validateLegacyData(raw);
    const next = cloneCategories();
    for (const item of restored) {
      if (!Object.hasOwn(next[item.type], item.category)) next[item.type][item.category] = [];
      if (!next[item.type][item.category].includes(item.subcategory)) next[item.type][item.category].push(item.subcategory);
    }
    categories = validateCategories(next); records = restored; storageCorrupt = false;
    resetForm(); resetCategoryForms(); render(); return save();
  }

  $('new-finance-category').addEventListener('click', () => openCategoryForm());
  $('cancel-finance-category').addEventListener('click', resetCategoryForms);
  $('cancel-finance-subcategory').addEventListener('click', resetCategoryForms);
  $('finance-category-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = $('finance-category-form'); window.uiFeedback.clearFormErrors(form);
    try {
      const type = $('finance-category-type').value;
      const name = validName($('finance-category-name').value, 'Categoria');
      const original = editingCategory?.name || '';
      if (nameAlreadyExists(Object.keys(categories[type]), name, original)) throw new Error(`A categoria ${name} já existe em ${type.toLowerCase()}.`);
      const next = cloneCategories();
      let nextRecords = records;
      if (original) {
        next[type] = Object.fromEntries(Object.entries(next[type]).map(([key, subs]) => [key === original ? name : key, subs]));
        nextRecords = records.map(item => item.type === type && item.category === original ? {...item, category: name} : item);
      } else {
        next[type][name] = [validName($('finance-category-first').value, 'Subcategoria')];
      }
      applyCategoryChange(next, nextRecords, original ? 'Categoria atualizada.' : 'Categoria cadastrada.');
    } catch (error) {
      const field = error.message.includes('Subcategoria') ? 'finance-category-first' : 'finance-category-name';
      window.uiFeedback.showFormError(form, field, error.message);
    }
  });
  $('finance-subcategory-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = $('finance-subcategory-form'); window.uiFeedback.clearFormErrors(form);
    try {
      const {type, category, name: original} = editingSubcategory;
      const name = validName($('finance-subcategory-name').value, 'Subcategoria');
      if (nameAlreadyExists(categories[type][category], name, original)) throw new Error(`A subcategoria ${name} já existe em ${category}.`);
      const next = cloneCategories();
      let nextRecords = records;
      if (original) {
        next[type][category] = next[type][category].map(value => value === original ? name : value);
        nextRecords = records.map(item => item.type === type && item.category === category && item.subcategory === original ? {...item, subcategory: name} : item);
      } else next[type][category].push(name);
      applyCategoryChange(next, nextRecords, original ? 'Subcategoria atualizada.' : 'Subcategoria cadastrada.');
    } catch (error) { window.uiFeedback.showFormError(form, 'finance-subcategory-name', error.message); }
  });
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
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) records = validateLegacyData(parsed);
      else { const restored = validateData(parsed); categories = restored.categories; records = restored.records; }
    }
  } catch {
    if (storageAvailable) { storageCorrupt = true; show('Os lançamentos financeiros salvos não puderam ser lidos. Importe uma cópia de segurança.', 'notice'); }
    else show('Armazenamento indisponível. Exporte um JSON antes de fechar esta página.', 'notice');
  }
  updateFormCategories(); render();
  window.financeLedger = {addExamples, exportData: () => ({records: records.map(item => ({...item})), categories: cloneCategories()}), validateData, validateLegacyData, importData, importLegacyData};
  try {
    const marker = 'gestao-condominial-demo-finance-seed-v1';
    if (localStorage.getItem(marker) === null && addExamples().saved) localStorage.setItem(marker, '1');
  } catch (error) { show(error.message || 'Não foi possível adicionar os exemplos financeiros.', 'notice'); }
})();

