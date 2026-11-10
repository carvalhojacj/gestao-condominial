'use strict';

// Extrato demonstrativo independente dos valores planejados nas atividades.
(() => {
  const STORAGE_KEY = 'gestao-condominial-demo-finance-v1';
  const MAX_RECORDS = 1000;
  const MAX_DOCUMENTS = 1000;
  const MAX_LINKS = 3000;
  const DOCUMENT_KINDS = ['Fatura', 'Nota fiscal', 'Recibo', 'Comprovante de pagamento', 'Comprovante de receita', 'Contrato', 'Autorização', 'Justificativa', 'Outro'];
  const DOCUMENT_ROLES = ['origem', 'quitacao', 'autorizacao', 'justificativa'];
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
  let documents = [];
  let links = [];
  let selectedTransactionId = '';
  let pendingLinkTransactionId = '';
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
  function validDate(value, label, required = true) {
    const date = plainText(value, label, 10, required);
    if (!date) return '';
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error(`${label}: data inválida.`);
    return date;
  }
  function validAmount(value, label, required = true) {
    const amount = String(value ?? '').trim();
    if (!amount && !required) return '';
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || amountInCents(amount) < 1 || amountInCents(amount) > 99999999999) throw new Error(`${label}: informe um valor maior que zero com até duas casas decimais.`);
    return amount;
  }
  function validId(value, label) {
    const id = plainText(value, label, 100, true);
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error(`${label}: identificador inválido.`);
    return id;
  }
  function validHttps(value) {
    const link = plainText(value ?? '', 'Link do documento', 2048);
    if (!link) return '';
    try { if (new URL(link).protocol === 'https:') return link; }
    catch { /* Mensagem uniforme abaixo. */ }
    throw new Error('Link do documento: informe um endereço HTTPS válido.');
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
    const id = validId(raw.id, 'Identificador');
    const date = validDate(raw.date, 'Data');
    const type = plainText(raw.type, 'Tipo', 10, true);
    if (!categoryMap[type]) throw new Error('Tipo inválido.');
    const category = plainText(raw.category, 'Categoria', 60, true);
    const subcategory = plainText(raw.subcategory, 'Subcategoria', 60, true);
    if (!Object.hasOwn(categoryMap[type], category) || !categoryMap[type][category].includes(subcategory)) throw new Error('Categoria ou subcategoria inválida para o tipo informado.');
    const amount = validAmount(raw.amount, 'Valor');
    return {id, date, type, description: plainText(raw.description, 'Descrição', 120, true), category, subcategory, amount, notes: plainText(raw.notes ?? '', 'Observações', 300), bankReference: plainText(raw.bankReference ?? '', 'Referência do extrato', 80), bankCheckedAt: validDate(raw.bankCheckedAt ?? '', 'Data da conferência', false)};
  }
  function normalizeDocument(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Documento inválido.');
    const id = validId(raw.id, 'Identificador do documento');
    const kind = plainText(raw.kind, 'Tipo de documento', 40, true);
    if (!DOCUMENT_KINDS.includes(kind)) throw new Error('Tipo de documento inválido.');
    return {id, kind, title: plainText(raw.title, 'Título do documento', 120, true), date: validDate(raw.date, 'Data do documento'), amount: validAmount(raw.amount, 'Valor do documento', false), url: validHttps(raw.url), notes: plainText(raw.notes ?? '', 'Observações do documento', 300)};
  }
  function validateDocuments(raw) {
    if (!Array.isArray(raw) || raw.length > MAX_DOCUMENTS) throw new Error('Lista de documentos inválida ou grande demais.');
    const list = raw.map(normalizeDocument);
    if (new Set(list.map(item => item.id)).size !== list.length) throw new Error('Há documentos duplicados na cópia.');
    return list;
  }
  function validateLinks(raw, recordList, documentList) {
    if (!Array.isArray(raw) || raw.length > MAX_LINKS) throw new Error('Lista de vínculos inválida ou grande demais.');
    const recordIds = new Set(recordList.map(item => item.id));
    const documentIds = new Set(documentList.map(item => item.id));
    const normalized = raw.map(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Vínculo de documento inválido.');
      const transactionId = validId(item.transactionId, 'Lançamento do vínculo');
      const documentId = validId(item.documentId, 'Documento do vínculo');
      const role = plainText(item.role, 'Função do documento', 20, true);
      if (!recordIds.has(transactionId) || !documentIds.has(documentId) || !DOCUMENT_ROLES.includes(role)) throw new Error('Vínculo refere-se a lançamento, documento ou função inexistente.');
      return {transactionId, documentId, role};
    });
    if (new Set(normalized.map(item => `${item.transactionId}:${item.documentId}`)).size !== normalized.length) throw new Error('Há vínculos duplicados na cópia.');
    return normalized;
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
    const restoredRecords = validateRecords(raw.records, categoryMap);
    const restoredDocuments = validateDocuments(raw.documents ?? []);
    return {categories: categoryMap, records: restoredRecords, documents: restoredDocuments, links: validateLinks(raw.links ?? [], restoredRecords, restoredDocuments)};
  }
  function validateLegacyData(raw) { return validateRecords(raw, DEFAULT_CATEGORIES); }
  function save() {
    if (!storageAvailable || storageCorrupt) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({records, categories, documents, links})); return true; }
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
      $('transaction-reference').value = record.bankReference;
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
  function transactionDocuments(record) {
    return links.filter(item => item.transactionId === record.id).map(link => ({link, document: documents.find(item => item.id === link.documentId)})).filter(item => item.document);
  }
  function documentState(record) {
    const attached = transactionDocuments(record);
    const roles = new Set(attached.map(item => item.link.role));
    const hasOrigin = roles.has('origem');
    const hasPayment = roles.has('quitacao');
    const hasJustification = roles.has('justificativa');
    const sufficient = record.type === 'Entrada' ? hasOrigin : hasOrigin && hasPayment;
    const label = !attached.length ? 'Sem documentos' : sufficient ? 'Documentos para revisar' : hasJustification ? 'Exige revisão manual' : 'Documentação parcial';
    return {count: attached.length, sufficient, label, checked: Boolean(record.bankCheckedAt)};
  }
  function openTransactionDocuments(id) {
    selectedTransactionId = id;
    renderDocuments();
    window.goToView('financeiro/documentos');
    $('document-transaction-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('document-transaction-title').focus();
  }
  function actionsFor(record, includeDocuments = true) {
    const actions = document.createElement('div');
    actions.className = 'actions ledger-actions';
    if (includeDocuments) actions.append(makeButton('Documentos', 'secondary', () => openTransactionDocuments(record.id)));
    actions.append(makeButton('Editar', 'secondary', () => openForm(record)));
    actions.append(makeButton('Excluir', 'danger', () => {
      if (!confirm('Excluir este lançamento do extrato demonstrativo?')) return;
      records = records.filter(item => item.id !== record.id);
      links = links.filter(item => item.transactionId !== record.id);
      if (selectedTransactionId === record.id) selectedTransactionId = '';
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
    const documentFilter = $('ledger-doc-filter').value;
    const visible = chronological.filter(item =>
      (!type || item.type === type) && (!month || item.date.startsWith(`${month}-`)) &&
      (!categoryFilter.value || item.category === categoryFilter.value) &&
      (!documentFilter || (documentFilter === 'pending' && !documentState(item).sufficient) || (documentFilter === 'ready' && documentState(item).sufficient && !item.bankCheckedAt) || (documentFilter === 'checked' && Boolean(item.bankCheckedAt))) &&
      (!query || `${item.description} ${item.category} ${item.subcategory} ${item.bankReference} ${item.notes}`.toLocaleLowerCase('pt-BR').includes(query))
    ).reverse();
    $('ledger-count').textContent = visible.length;
    $('ledger-rows').replaceChildren(); $('ledger-mobile').replaceChildren();
    $('ledger-empty').hidden = visible.length > 0;
    $('ledger-empty').textContent = records.length ? 'Nenhum lançamento encontrado com estes filtros.' : 'Nenhum lançamento cadastrado. Use “Novo lançamento” para começar.';
    for (const item of visible) {
      const value = money(amountInCents(item.amount));
      const row = document.createElement('tr');
      const docState = documentState(item);
      for (const content of [dateBR(item.date), item.description, `${item.category} / ${item.subcategory}`, item.type === 'Entrada' ? value : '—', item.type === 'Saída' ? value : '—', money(balances.get(item.id))]) {
        const cell = document.createElement('td'); cell.textContent = content; row.append(cell);
      }
      const documentCell = document.createElement('td'); documentCell.className = 'ledger-document-cell';
      const documentSummary = document.createElement('span'); documentSummary.textContent = `${docState.count} ${docState.count === 1 ? 'doc.' : 'docs'} · ${docState.sufficient ? 'Para revisar' : 'Pendente'}`;
      documentCell.append(documentSummary);
      if (docState.checked) { const checked = document.createElement('span'); checked.textContent = 'Extrato conferido'; documentCell.append(checked); }
      documentCell.append(namedButton('Ver', `Ver documentos de ${item.description}`, 'secondary', () => openTransactionDocuments(item.id)));
      row.append(documentCell);
      const actionCell = document.createElement('td'); actionCell.append(actionsFor(item, false)); row.append(actionCell);
      $('ledger-rows').append(row);

      const card = document.createElement('article'); card.className = 'ledger-mobile-card';
      const head = document.createElement('div'); head.className = 'ledger-mobile-head';
      const title = document.createElement('strong'); title.textContent = item.description;
      const amount = document.createElement('strong'); amount.className = item.type === 'Entrada' ? 'ledger-in' : 'ledger-out'; amount.textContent = `${item.type === 'Entrada' ? '+' : '−'} ${value}`;
      head.append(title, amount);
      const meta = document.createElement('p'); meta.textContent = `${dateBR(item.date)} · ${item.category} / ${item.subcategory}`;
      const balance = document.createElement('p'); balance.textContent = `Saldo após: ${money(balances.get(item.id))}`;
      const documentation = document.createElement('p'); documentation.textContent = `${docState.count} ${docState.count === 1 ? 'documento' : 'documentos'} · ${docState.label}${docState.checked ? ' · Extrato conferido' : ''}`;
      card.append(head, meta, balance, documentation, actionsFor(item)); $('ledger-mobile').append(card);
    }
    renderCategories();
    renderDocuments();
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
  function resetDocumentForm() {
    $('document-form').reset();
    window.uiFeedback.clearFormErrors($('document-form'));
    $('document-id').value = '';
    $('document-form-panel').hidden = true;
    $('document-form-title').textContent = 'Novo documento';
    $('document-form').querySelector('[type="submit"]').textContent = 'Salvar documento';
    $('new-finance-document').setAttribute('aria-expanded', 'false');
    pendingLinkTransactionId = '';
  }
  function openDocumentForm(document = null, transactionId = '') {
    resetDocumentForm();
    pendingLinkTransactionId = transactionId;
    if (document) {
      $('document-id').value = document.id;
      $('document-kind').value = document.kind;
      $('document-title').value = document.title;
      $('document-date').value = document.date;
      $('document-amount').value = document.amount;
      $('document-url').value = document.url;
      $('document-notes').value = document.notes;
      $('document-form-title').textContent = 'Editar documento';
      $('document-form').querySelector('[type="submit"]').textContent = 'Atualizar documento';
    } else $('document-date').value = new Date().toLocaleDateString('sv-SE');
    $('document-form-panel').hidden = false;
    $('new-finance-document').setAttribute('aria-expanded', 'true');
    $('document-form-panel').scrollIntoView({behavior: 'smooth', block: 'start'});
    $('document-title').focus();
  }
  function renderDocuments() {
    const record = records.find(item => item.id === selectedTransactionId);
    const panel = $('document-transaction-panel');
    panel.hidden = !record;
    if (record) {
      const state = documentState(record);
      $('document-transaction-title').textContent = record.description;
      $('document-transaction-summary').textContent = `${dateBR(record.date)} · ${record.type} de ${money(amountInCents(record.amount))}${record.bankReference ? ` · Referência: ${record.bankReference}` : ''}`;
      $('document-transaction-status').textContent = `${state.label} · ${state.count} ${state.count === 1 ? 'documento' : 'documentos'} · ${state.checked ? `Conferido com extrato fictício em ${dateBR(record.bankCheckedAt)}` : 'Extrato não conferido'}`;
      $('document-review-toggle').textContent = state.checked ? 'Desfazer conferência do extrato' : 'Marcar conferido com extrato fictício';
      const linked = transactionDocuments(record);
      const list = $('document-transaction-links'); list.replaceChildren();
      if (!linked.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Nenhum documento vinculado a esta movimentação.'; list.append(empty); }
      for (const {link, document: item} of linked) {
        const article = document.createElement('article'); article.className = 'document-link-row';
        const main = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = item.title;
        const details = document.createElement('p'); details.textContent = `${item.kind} · ${dateBR(item.date)} · Função: ${link.role}${item.amount ? ` · ${money(amountInCents(item.amount))}` : ''}`;
        main.append(title, details);
        if (item.url) { const anchor = document.createElement('a'); anchor.href = item.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.textContent = 'Abrir documento fictício'; main.append(anchor); }
        const unlink = makeButton('Desvincular', 'secondary', () => {
          links = links.filter(candidate => !(candidate.transactionId === record.id && candidate.documentId === item.id));
          render(); show(save() ? 'Documento desvinculado. Ele continua na lista de documentos.' : 'Vínculo removido apenas nesta sessão. Exporte um JSON antes de sair.');
        });
        const actions = document.createElement('div'); actions.className = 'actions'; actions.append(unlink);
        article.append(main, actions); list.append(article);
      }
      const existing = $('document-link-existing'); existing.replaceChildren();
      option(existing, 'Selecione um documento', '');
      const linkedIds = new Set(linked.map(item => item.document.id));
      for (const item of documents.filter(candidate => !linkedIds.has(candidate.id)).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))) option(existing, `${item.title} · ${item.kind}`, item.id);
      $('document-link-button').disabled = existing.options.length === 1;
    }
    const filter = $('document-filter').value;
    const visible = documents.filter(item => filter !== 'unlinked' || !links.some(link => link.documentId === item.id)).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'pt-BR'));
    $('document-count').textContent = documents.length;
    const library = $('document-list'); library.replaceChildren();
    if (!visible.length) { const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = documents.length ? 'Nenhum documento nesta seleção.' : 'Nenhum documento cadastrado. Use “Novo documento” para começar.'; library.append(empty); }
    for (const item of visible) {
      const article = document.createElement('article'); article.className = 'record document-row';
      const main = document.createElement('div'); main.className = 'document-row-main';
      const title = document.createElement('h4'); title.textContent = item.title;
      const attached = links.filter(link => link.documentId === item.id).length;
      const details = document.createElement('p'); details.className = 'document-row-meta'; details.textContent = `${item.kind} · ${dateBR(item.date)}${item.amount ? ` · ${money(amountInCents(item.amount))}` : ''} · ${attached ? `${attached} ${attached === 1 ? 'movimentação' : 'movimentações'}` : 'Aguardando movimentação'}`;
      main.append(title, details);
      if (item.url) { const anchor = document.createElement('a'); anchor.href = item.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.textContent = 'Abrir documento fictício'; main.append(anchor); }
      const actions = document.createElement('div'); actions.className = 'actions';
      actions.append(makeButton('Editar', 'secondary', () => openDocumentForm(item)));
      actions.append(makeButton('Excluir', 'danger', () => {
        if (!confirm(`Excluir o documento “${item.title}” e seus vínculos?`)) return;
        documents = documents.filter(candidate => candidate.id !== item.id);
        links = links.filter(link => link.documentId !== item.id);
        render(); show(save() ? 'Documento excluído.' : 'Documento excluído apenas nesta sessão. Exporte um JSON antes de sair.');
      }));
      article.append(main, actions); library.append(article);
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
  function addDocumentExamples() {
    if (storageCorrupt) throw new Error('Os dados financeiros salvos não puderam ser lidos. Importe uma cópia antes de adicionar exemplos.');
    const sourceDocuments = validateDocuments(window.demoSeed.financeDocuments || []);
    const missing = sourceDocuments.filter(item => !documents.some(existing => existing.id === item.id));
    if (documents.length + missing.length > MAX_DOCUMENTS) throw new Error('Limite de documentos atingido.');
    const nextDocuments = [...documents, ...missing];
    const sourceLinks = (window.demoSeed.financeLinks || []).filter(item => records.some(record => record.id === item.transactionId) && nextDocuments.some(document => document.id === item.documentId));
    const missingLinks = sourceLinks.filter(item => !links.some(existing => existing.transactionId === item.transactionId && existing.documentId === item.documentId));
    const nextLinks = validateLinks([...links, ...missingLinks], records, nextDocuments);
    documents = nextDocuments; links = nextLinks;
    return missing.length;
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
    records = [...records, ...missing];
    const addedDocuments = addDocumentExamples();
    render();
    return {added: missing.length + addedDocuments, saved: save()};
  }
  function importData(raw) {
    const restored = validateData(raw);
    categories = restored.categories; records = restored.records; documents = restored.documents; links = restored.links; storageCorrupt = false;
    selectedTransactionId = ''; resetForm(); resetCategoryForms(); resetDocumentForm(); render(); return save();
  }
  function importLegacyData(raw) {
    const restored = validateLegacyData(raw);
    const next = cloneCategories();
    for (const item of restored) {
      if (!Object.hasOwn(next[item.type], item.category)) next[item.type][item.category] = [];
      if (!next[item.type][item.category].includes(item.subcategory)) next[item.type][item.category].push(item.subcategory);
    }
    categories = validateCategories(next); records = restored; links = links.filter(item => restored.some(record => record.id === item.transactionId)); storageCorrupt = false;
    selectedTransactionId = ''; resetForm(); resetCategoryForms(); resetDocumentForm(); render(); return save();
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
  for (const id of ['ledger-search', 'ledger-type-filter', 'ledger-month-filter', 'ledger-category-filter', 'ledger-doc-filter']) $(id).addEventListener(id === 'ledger-search' ? 'input' : 'change', render);
  $('ledger-clear-filters').addEventListener('click', () => { for (const id of ['ledger-search', 'ledger-type-filter', 'ledger-month-filter', 'ledger-category-filter', 'ledger-doc-filter']) $(id).value = ''; render(); });
  $('new-finance-document').addEventListener('click', () => openDocumentForm());
  $('cancel-finance-document').addEventListener('click', resetDocumentForm);
  $('document-filter').addEventListener('change', renderDocuments);
  $('document-transaction-back').addEventListener('click', () => { selectedTransactionId = ''; resetDocumentForm(); renderDocuments(); window.goToView('financeiro/extrato'); });
  $('document-new-for-transaction').addEventListener('click', () => openDocumentForm(null, selectedTransactionId));
  $('document-kind').addEventListener('change', () => {
    if (!pendingLinkTransactionId) return;
    const kind = $('document-kind').value;
    $('document-link-role').value = kind === 'Comprovante de pagamento' ? 'quitacao' : kind === 'Contrato' || kind === 'Autorização' ? 'autorizacao' : kind === 'Justificativa' ? 'justificativa' : 'origem';
  });
  $('document-link-button').addEventListener('click', () => {
    if (storageCorrupt) { show('Os dados financeiros salvos não puderam ser lidos. Importe uma cópia antes de alterar vínculos.', 'notice'); return; }
    const documentId = $('document-link-existing').value;
    if (!selectedTransactionId || !documentId) { show('Selecione um documento para vincular.', 'notice'); return; }
    try {
      links = validateLinks([...links, {transactionId: selectedTransactionId, documentId, role: $('document-link-role').value}], records, documents);
      render(); show(save() ? 'Documento vinculado ao lançamento.' : 'Vínculo criado apenas nesta sessão. Exporte um JSON antes de sair.');
    } catch (error) { show(error.message, 'notice'); }
  });
  $('document-review-toggle').addEventListener('click', () => {
    if (storageCorrupt) { show('Os dados financeiros salvos não puderam ser lidos. Importe uma cópia antes da conferência.', 'notice'); return; }
    const index = records.findIndex(item => item.id === selectedTransactionId);
    if (index < 0) return;
    const wasChecked = Boolean(records[index].bankCheckedAt);
    records[index] = {...records[index], bankCheckedAt: wasChecked ? '' : new Date().toLocaleDateString('sv-SE')};
    render(); show(save() ? (wasChecked ? 'Conferência desfeita.' : 'Conferência manual com o extrato fictício registrada.') : 'Conferência alterada apenas nesta sessão. Exporte um JSON antes de sair.');
  });
  $('document-form').addEventListener('submit', event => {
    event.preventDefault(); window.uiFeedback.clearFormErrors($('document-form'));
    try {
      if (storageCorrupt) throw new Error('Os dados financeiros salvos não puderam ser lidos. Importe uma cópia antes de cadastrar documentos.');
      const raw = {id: $('document-id').value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`), kind: $('document-kind').value, title: $('document-title').value, date: $('document-date').value, amount: $('document-amount').value, url: $('document-url').value, notes: $('document-notes').value};
      const item = normalizeDocument(raw);
      const index = documents.findIndex(candidate => candidate.id === item.id);
      if (index < 0 && documents.length >= MAX_DOCUMENTS) throw new Error('Limite de documentos atingido.');
      const transactionId = pendingLinkTransactionId;
      const nextDocuments = index < 0 ? [...documents, item] : documents.map(candidate => candidate.id === item.id ? item : candidate);
      const nextLinks = transactionId && !links.some(link => link.transactionId === transactionId && link.documentId === item.id)
        ? validateLinks([...links, {transactionId, documentId: item.id, role: $('document-link-role').value}], records, nextDocuments)
        : links;
      documents = nextDocuments; links = nextLinks;
      resetDocumentForm(); render();
      const saved = save();
      show(saved ? 'Documento salvo. Exporte uma cópia de segurança após a atualização.' : 'Documento salvo apenas nesta sessão. Exporte o JSON antes de sair.', saved ? 'success' : 'notice');
    } catch (error) {
      const match = [['Data', 'document-date'], ['Título', 'document-title'], ['Valor', 'document-amount'], ['Link', 'document-url']].find(([label]) => error.message.includes(label));
      window.uiFeedback.showFormError($('document-form'), match?.[1] || '', error.message);
    }
  });
  $('finance-form').addEventListener('submit', event => {
    event.preventDefault(); window.uiFeedback.clearFormErrors($('finance-form'));
    try {
      if (storageCorrupt) throw new Error('Os lançamentos salvos não puderam ser lidos. Importe uma cópia antes de editar.');
      const id = $('transaction-id').value || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      const previous = records.find(item => item.id === id);
      const raw = {id, date: $('transaction-date').value, type: $('transaction-type').value, description: $('transaction-description').value, category: $('transaction-category').value, subcategory: $('transaction-subcategory').value, amount: $('transaction-amount').value, notes: $('transaction-notes').value, bankReference: $('transaction-reference').value};
      raw.bankCheckedAt = previous && previous.date === raw.date && previous.type === raw.type && previous.description === raw.description && previous.amount === raw.amount && previous.bankReference === raw.bankReference ? previous.bankCheckedAt : '';
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
      else { const restored = validateData(parsed); categories = restored.categories; records = restored.records; documents = restored.documents; links = restored.links; }
    }
  } catch {
    if (storageAvailable) { storageCorrupt = true; show('Os lançamentos financeiros salvos não puderam ser lidos. Importe uma cópia de segurança.', 'notice'); }
    else show('Armazenamento indisponível. Exporte um JSON antes de fechar esta página.', 'notice');
  }
  updateFormCategories(); render();
  window.financeLedger = {addExamples, exportData: () => ({records: records.map(item => ({...item})), categories: cloneCategories(), documents: documents.map(item => ({...item})), links: links.map(item => ({...item}))}), validateData, validateLegacyData, importData, importLegacyData};
  try {
    const marker = 'gestao-condominial-demo-finance-seed-v1';
    if (localStorage.getItem(marker) === null && addExamples().saved) localStorage.setItem(marker, '1');
  } catch (error) { show(error.message || 'Não foi possível adicionar os exemplos financeiros.', 'notice'); }
  try {
    const marker = 'gestao-condominial-demo-documents-seed-v1';
    if (localStorage.getItem(marker) === null) {
      addDocumentExamples(); render();
      if (save()) localStorage.setItem(marker, '1');
    }
  } catch (error) { show(error.message || 'Não foi possível adicionar os documentos fictícios.', 'notice'); }
})();

