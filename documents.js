'use strict';

// Área documental demonstrativa. Não recebe arquivos, assinaturas ou dados reais.
(() => {
  const KEY = 'gestao-condominial-demo-documental-v1';
  const SEED_KEY = 'gestao-condominial-demo-documental-seed-v1';
  const MAX_ITEMS = 300;
  const $ = id => document.getElementById(id);
  const fields = {
    acervo: [
      ['subtype', 'Tipo de documento', 'select', ['Convenção ou regimento', 'Contrato ou aditivo', 'Orçamento', 'Apólice de seguro', 'Laudo ou certificado', 'Ordem de serviço', 'Parecer do conselho', 'Outro']],
      ['title', 'Título', 'text', 120, true], ['date', 'Data do documento', 'date', null, true],
      ['url', 'Link HTTPS fictício (opcional)', 'url', 2048], ['body', 'Descrição ou localização do original', 'textarea', 1200]
    ],
    assembleias: [
      ['subtype', 'Tipo', 'select', ['Ordinária', 'Extraordinária']],
      ['title', 'Assunto da assembleia', 'text', 120, true], ['date', 'Data', 'date', null, true],
      ['time', 'Horário', 'time'], ['location', 'Local', 'text', 120],
      ['agenda', 'Pauta (um assunto por linha)', 'textarea', 2000, true],
      ['participants', 'Presenças fictícias (Unidade | Nome, uma por linha)', 'textarea', 2000],
      ['chair', 'Presidente da mesa', 'text', 100], ['secretary', 'Secretário(a)', 'text', 100],
      ['deliberations', 'Discussões e deliberações (uma por item da pauta)', 'textarea', 4000],
      ['status', 'Situação', 'select', ['Planejada', 'Minuta em elaboração', 'Minuta revisada']]
    ],
    comunicados: [
      ['subtype', 'Tipo', 'select', ['Aviso', 'Comunicado', 'Circular']],
      ['title', 'Assunto', 'text', 120, true], ['date', 'Data', 'date', null, true],
      ['audience', 'Destinatários fictícios', 'text', 120, true],
      ['body', 'Texto', 'textarea', 4000, true],
      ['channel', 'Meio de divulgação planejado ou utilizado', 'text', 120],
      ['status', 'Situação', 'select', ['Rascunho', 'Divulgação informada']]
    ],
    ocorrencias: [
      ['subtype', 'Tipo', 'select', ['Ocorrência', 'Advertência', 'Multa em análise']],
      ['title', 'Resumo', 'text', 120, true], ['date', 'Data do fato', 'date', null, true],
      ['unit', 'Unidade fictícia (opcional)', 'text', 40],
      ['body', 'Descrição objetiva do fato', 'textarea', 3000, true],
      ['rule', 'Regra da convenção ou do regimento a conferir', 'text', 200],
      ['evidence', 'Descrição da evidência fictícia', 'textarea', 1200],
      ['status', 'Situação', 'select', ['Em análise', 'Advertência preparada', 'Encerrada']]
    ],
    prazos: [
      ['subtype', 'Tipo', 'select', ['Contrato', 'Seguro', 'Laudo', 'Certificado', 'Outro']],
      ['title', 'Documento ou obrigação', 'text', 120, true],
      ['date', 'Data de referência', 'date'], ['dueDate', 'Vencimento informado', 'date', null, true],
      ['body', 'Providência ou observação', 'textarea', 1200]
    ]
  };
  const labels = {acervo: 'documento', assembleias: 'assembleia', comunicados: 'comunicado', ocorrencias: 'ocorrência', prazos: 'prazo'};
  const lists = {acervo: 'archive-list', assembleias: 'meetings-list', comunicados: 'notices-list', ocorrencias: 'incidents-list', prazos: 'deadlines-list'};
  const counts = {acervo: 'archive-count', assembleias: 'meetings-count', comunicados: 'notices-count', ocorrencias: 'incidents-count', prazos: 'deadlines-count'};
  let items = [];
  let storageCorrupt = false;
  let previewState = null;
  let previewReturnFocus = null;

  function clean(value, label, max, required = false) {
    if (typeof value !== 'string') throw new Error(`${label}: texto inválido.`);
    const result = value.trim();
    if (required && !result) throw new Error(`Informe ${label.toLowerCase()}.`);
    if (result.length > max) throw new Error(`${label}: máximo de ${max} caracteres.`);
    return result;
  }
  function date(value, label) {
    if (!value) return '';
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: data inválida.`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`${label}: data inválida.`);
    return value;
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Documento inválido.');
    const kind = raw.kind;
    if (!fields[kind]) throw new Error('Tipo de documento inválido.');
    const id = clean(raw.id, 'Identificador', 100, true);
    if (!/^[A-Za-z0-9._-]+$/.test(id)) throw new Error('Identificador inválido.');
    const item = {id, kind};
    for (const [name, label, type, limit, required] of fields[kind]) {
      const value = raw[name] ?? '';
      if (type === 'select') {
        if (!limit.includes(value)) throw new Error(`${label}: opção inválida.`);
        item[name] = value;
      } else if (type === 'date') {
        item[name] = date(value, label);
        if (required && !item[name]) throw new Error(`Informe ${label.toLowerCase()}.`);
      } else if (type === 'time') {
        item[name] = clean(value, label, 5);
        if (item[name] && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item[name])) throw new Error('Horário inválido.');
      } else if (type === 'url') {
        item[name] = clean(value, label, limit);
        if (item[name]) {
          try { const url = new URL(item[name]); if (url.protocol !== 'https:' || !url.hostname) throw new Error(); item[name] = url.href; }
          catch { throw new Error('Informe um link HTTPS válido.'); }
        }
      } else item[name] = clean(value, label, limit, required);
    }
    if (kind === 'assembleias') {
      if (raw.attendanceConfirmed !== undefined && typeof raw.attendanceConfirmed !== 'boolean') throw new Error('Confirmação de presença inválida.');
      item.attendanceConfirmed = raw.attendanceConfirmed === true;
      const people = item.participants.split('\n').map(line => line.trim()).filter(Boolean);
      if (people.length > 60 || people.some(line => !/^[^|\n]{1,40}\s*\|\s*[^|\n]{1,100}$/.test(line))) {
        throw new Error('Presenças: use até 60 linhas no formato Unidade | Nome.');
      }
      const topics = item.agenda.split('\n').map(line => line.trim()).filter(Boolean);
      if (topics.length > 20 || topics.some(topic => topic.length > 200)) {
        throw new Error('Pauta: use até 20 assuntos com 200 caracteres cada.');
      }
      const legacy = item.deliberations.split('\n');
      const resolutions = raw.resolutions === undefined
        ? legacy.length === topics.length ? legacy : []
        : raw.resolutions;
      if (!Array.isArray(resolutions) || resolutions.length > topics.length || resolutions.some(value => typeof value !== 'string')) {
        throw new Error('Deliberações inválidas.');
      }
      item.resolutions = topics.map((_, index) => clean(resolutions[index] || '', 'Deliberação', 4000));
    }
    return item;
  }
  function validateData(raw) {
    if (!Array.isArray(raw) || raw.length > MAX_ITEMS) throw new Error('Acervo inválido ou acima do limite.');
    const result = raw.map(normalize);
    if (new Set(result.map(item => item.id)).size !== result.length) throw new Error('Há documentos duplicados na cópia.');
    return result;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); return true; }
    catch { window.uiFeedback.showPageMessage('Não foi possível salvar os documentos neste navegador. Exporte uma cópia JSON antes de sair.', 'notice'); return false; }
  }
  function message(text, type = 'success') { window.uiFeedback.showPageMessage(text, type); }
  function formattedDate(value) { return value ? value.split('-').reverse().join('/') : 'Data não informada'; }
  function button(label, action, item) {
    const element = document.createElement('button');
    element.type = 'button'; element.className = 'secondary'; element.textContent = label;
    element.addEventListener('click', () => action(item));
    return element;
  }
  function row(item, finance = false) {
    const line = document.createElement('article'); line.className = 'documental-row';
    const main = document.createElement('button'); main.type = 'button'; main.className = 'documental-open';
    main.setAttribute('aria-label', `Abrir prévia de ${item.title}`);
    const heading = document.createElement('strong'); heading.className = 'documental-title'; heading.textContent = item.title;
    const meta = document.createElement('span'); meta.className = 'document-row-meta';
    meta.textContent = `${item.subtype || item.kind || 'Financeiro'} · ${formattedDate(item.date || item.dueDate)}${item.status ? ` · ${item.status}` : ''}${item.unit ? ` · Unidade ${item.unit}` : ''}`;
    if (item.kind === 'assembleias') meta.textContent += item.attendanceConfirmed ? ` · ${item.participants.split('\n').filter(Boolean).length} presença(s) informada(s)` : ' · Presenças a confirmar';
    const hint = document.createElement('span'); hint.className = 'documental-open-hint'; hint.textContent = 'Ver documento →';
    main.append(heading, meta, hint);
    main.addEventListener('click', () => openPreview(item, finance, main));
    const actions = document.createElement('div'); actions.className = 'actions';
    if (finance) {
      const link = document.createElement('a'); link.href = '#financeiro/documentos'; link.className = 'button-link secondary'; link.textContent = 'Abrir no Financeiro'; actions.append(link);
    } else {
      actions.append(button('Editar', edit, item));
      actions.append(button('Excluir', remove, item));
    }
    line.append(main, actions);
    line.addEventListener('click', event => {
      if (event.target instanceof Element && !event.target.closest('button, a')) openPreview(item, finance, main);
    });
    return line;
  }
  function renderKind(kind) {
    const list = $(lists[kind]); list.replaceChildren();
    let visible = items.filter(item => kind === 'acervo' || item.kind === kind);
    const finance = kind === 'acervo' ? (window.financeLedger.exportData().documents || []) : [];
    if (kind === 'acervo') {
      const query = $('archive-search').value.trim().toLocaleLowerCase('pt-BR');
      const filter = $('archive-filter').value;
      const match = item => `${item.title} ${item.subtype || item.kind || ''}`.toLocaleLowerCase('pt-BR').includes(query);
      visible = filter === 'financeiro' ? [] : visible.filter(match);
      var financial = filter === 'administrativo' ? [] : finance.filter(match);
      $(counts[kind]).textContent = String(items.length + finance.length);
    } else $(counts[kind]).textContent = String(visible.length);
    visible.sort((a, b) => (b.date || b.dueDate || '').localeCompare(a.date || a.dueDate || '')).forEach(item => list.append(row(item)));
    if (kind === 'acervo') financial.sort((a, b) => b.date.localeCompare(a.date)).forEach(item => list.append(row({...item, subtype: `Financeiro · ${item.kind}`}, true)));
    if (!list.children.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state';
      empty.textContent = kind === 'acervo' ? 'Nenhum documento nesta seleção.' : `Nenhuma ${labels[kind]} cadastrada.`;
      list.append(empty);
    }
  }
  function render() { Object.keys(lists).forEach(renderKind); }
  function meetingEditor(form, item) {
    const editor = document.createElement('div'); editor.className = 'meeting-editor wide';
    const topicsTitle = document.createElement('h5'); topicsTitle.textContent = 'Pauta e deliberações';
    const topicsHelp = document.createElement('p'); topicsHelp.className = 'section-intro';
    topicsHelp.textContent = 'Registre cada assunto separadamente. Preencha a decisão somente após a reunião.';
    const topicList = document.createElement('div'); topicList.className = 'meeting-topic-list'; topicList.setAttribute('role', 'group'); topicList.setAttribute('aria-label', 'Assuntos da pauta');
    const addTopic = (topic = '', resolution = '') => {
      if (topicList.children.length >= 20) { message('A pauta aceita até 20 assuntos.', 'notice'); return; }
      const row = document.createElement('div'); row.className = 'meeting-topic-row';
      const topicLabel = document.createElement('label'); topicLabel.textContent = 'Assunto da pauta *';
      const topicInput = document.createElement('input'); topicInput.type = 'text'; topicInput.maxLength = 200; topicInput.required = true; topicInput.value = topic;
      topicLabel.append(topicInput);
      const decisionLabel = document.createElement('label'); decisionLabel.textContent = 'Discussão e decisão (minuta)';
      const decisionInput = document.createElement('textarea'); decisionInput.maxLength = 4000; decisionInput.value = resolution;
      decisionLabel.append(decisionInput);
      const removeTopic = button('Remover assunto', () => { if (topicList.children.length > 1) row.remove(); }, null);
      row.append(topicLabel, decisionLabel, removeTopic); topicList.append(row);
    };
    const existingTopics = item?.agenda.split('\n').map(value => value.trim()).filter(Boolean) || [];
    if (existingTopics.length) existingTopics.forEach((topic, index) => addTopic(topic, item.resolutions?.[index] || ''));
    else addTopic();
    let oldNote = null;
    if (item?.deliberations && !item.resolutions?.some(Boolean)) {
      oldNote = document.createElement('p'); oldNote.className = 'meeting-legacy-note';
      oldNote.textContent = `Anotação anterior sem vínculo à pauta (preservada para consulta): ${item.deliberations}`;
    }
    const addTopicButton = button('Adicionar assunto', () => { addTopic(); topicList.lastElementChild?.querySelector('input')?.focus(); }, null);
    const peopleTitle = document.createElement('h5'); peopleTitle.textContent = 'Lista de participantes';
    const peopleHelp = document.createElement('p'); peopleHelp.className = 'section-intro';
    peopleHelp.textContent = 'Marque somente quem compareceu. Os moradores fictícios aparecem como opções; a lista para assinatura também pode ser impressa antes da reunião.';
    const peopleList = document.createElement('div'); peopleList.className = 'meeting-people-list'; peopleList.setAttribute('role', 'group'); peopleList.setAttribute('aria-label', 'Participantes com presença confirmada');
    const selected = new Set((item?.attendanceConfirmed ? item.participants : '').split('\n').map(value => value.trim()).filter(Boolean));
    const candidates = new Map();
    for (const resident of window.demoDirectory.exportData().residents) candidates.set(`${resident.unit} | ${resident.name}`, [resident.unit, resident.name]);
    for (const line of (item?.participants || '').split('\n').map(value => value.trim()).filter(Boolean)) {
      const [unit, name] = line.split('|').map(value => value.trim());
      candidates.set(`${unit} | ${name}`, [unit, name]);
    }
    const addPerson = (unit, name) => {
      if (peopleList.children.length >= 60) { message('A lista aceita até 60 participantes.', 'notice'); return; }
      const key = `${unit} | ${name}`;
      if ([...peopleList.querySelectorAll('input[type="checkbox"]')].some(box => box.value === key)) return;
      const label = document.createElement('label'); label.className = 'meeting-person';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = key; checkbox.checked = selected.has(key);
      const text = document.createElement('span'); text.textContent = `Unidade ${unit} · ${name}`;
      label.append(checkbox, text); peopleList.append(label);
    };
    [...candidates.values()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', {numeric: true})).forEach(([unit, name]) => addPerson(unit, name));
    const extra = document.createElement('div'); extra.className = 'meeting-extra';
    const unitLabel = document.createElement('label'); unitLabel.textContent = 'Outra unidade fictícia';
    const unitInput = document.createElement('input'); unitInput.type = 'text'; unitInput.maxLength = 40; unitLabel.append(unitInput);
    const nameLabel = document.createElement('label'); nameLabel.textContent = 'Participante ou representante fictício';
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.maxLength = 100; nameLabel.append(nameInput);
    const addPersonButton = button('Adicionar à lista', () => {
      const unit = unitInput.value.trim(); const name = nameInput.value.trim();
      if (!unit || !name || unit.includes('|') || name.includes('|')) { message('Informe unidade e nome fictícios, sem o caractere |.', 'notice'); return; }
      addPerson(unit, name); unitInput.value = ''; nameInput.value = '';
    }, null);
    extra.append(unitLabel, nameLabel, addPersonButton);
    editor.append(topicsTitle, topicsHelp, topicList, addTopicButton);
    if (oldNote) editor.append(oldNote);
    editor.append(peopleTitle, peopleHelp, peopleList, extra);
    form.append(editor);
    return () => {
      const rows = [...topicList.children];
      const agenda = rows.map(row => row.querySelector('input').value.trim());
      if (agenda.some(value => !value)) throw new Error('Preencha todos os assuntos da pauta.');
      const resolutions = rows.map(row => row.querySelector('textarea').value.trim());
      const participants = [...peopleList.querySelectorAll('input[type="checkbox"]:checked')].map(box => box.value);
      return {agenda: agenda.join('\n'), deliberations: item?.deliberations || '', resolutions, participants: participants.join('\n'), attendanceConfirmed: participants.length > 0};
    };
  }
  function openForm(kind, item = null) {
    Object.keys(fields).forEach(area => { $(`${area}-form-panel`).hidden = true; });
    const panel = $(`${kind}-form-panel`); panel.replaceChildren(); panel.hidden = false;
    const title = document.createElement('h4'); title.textContent = `${item ? 'Editar' : 'Novo'} ${labels[kind]}`;
    const form = document.createElement('form'); form.className = 'form-grid compact-form';
    let statusField = null;
    for (const [name, label, type, limit, required] of fields[kind]) {
      if (kind === 'assembleias' && ['agenda', 'participants', 'deliberations'].includes(name)) continue;
      const wrapper = document.createElement('label');
      if (type === 'textarea' || type === 'url') wrapper.className = 'wide';
      wrapper.append(document.createTextNode(`${label}${required ? ' *' : ''}`));
      let input;
      if (type === 'select') {
        input = document.createElement('select');
        limit.forEach(option => { const node = document.createElement('option'); node.value = option; node.textContent = option; input.append(node); });
      } else input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      if (type !== 'select' && type !== 'textarea') input.type = type;
      if (typeof limit === 'number') input.maxLength = limit;
      input.name = name; input.required = Boolean(required);
      if (item) input.value = item[name] || '';
      wrapper.append(input);
      if (kind === 'assembleias' && name === 'status') statusField = wrapper;
      else form.append(wrapper);
    }
    const collectMeeting = kind === 'assembleias' ? meetingEditor(form, item) : null;
    if (statusField) form.append(statusField);
    const actions = document.createElement('div'); actions.className = 'actions wide';
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = `Salvar ${labels[kind]}`;
    const cancel = button('Cancelar', () => { panel.hidden = true; panel.replaceChildren(); document.querySelector(`[data-doc-new="${kind}"]`)?.focus(); }, item);
    actions.append(submit, cancel); form.append(actions); panel.append(title, form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        if (storageCorrupt) throw new Error('Os documentos salvos não puderam ser lidos. Importe uma cópia antes de editar.');
        const raw = {id: item?.id || (globalThis.crypto?.randomUUID?.() || `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`), kind};
        for (const [name] of fields[kind]) {
          if (collectMeeting && ['agenda', 'participants', 'deliberations'].includes(name)) continue;
          raw[name] = form.elements[name].value;
        }
        if (collectMeeting) Object.assign(raw, collectMeeting());
        const next = normalize(raw);
        if (!item && items.length >= MAX_ITEMS) throw new Error('Limite de documentos atingido.');
        items = item ? items.map(current => current.id === item.id ? next : current) : [...items, next];
        panel.hidden = true; panel.replaceChildren(); render(); document.querySelector(`[data-doc-new="${kind}"]`)?.focus();
        const saved = save();
        message(saved ? `${labels[kind][0].toUpperCase()}${labels[kind].slice(1)} salvo.` : 'Registro atualizado apenas nesta sessão.', saved ? 'success' : 'notice');
      } catch (error) { message(error.message, 'notice'); }
    });
    panel.scrollIntoView({block: 'nearest'}); form.querySelector('input, select, textarea').focus();
  }
  function edit(item) { window.goToView(`documentos/${item.kind}`); openForm(item.kind, item); }
  function remove(item) {
    if (!confirm(`Excluir ${labels[item.kind]} “${item.title}”?`)) return;
    items = items.filter(current => current.id !== item.id); render();
    message(save() ? 'Registro excluído.' : 'Registro excluído apenas nesta sessão.', 'notice');
  }
  function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
  function logoMarkup() {
    return '<svg class="letterhead-logo" viewBox="0 0 80 80" role="img" aria-label="Logomarca demonstrativa SQS 110 F" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="74" height="74" rx="3" fill="#f8f4e9" stroke="#876a3d" stroke-width="2"/><rect x="9" y="9" width="62" height="62" fill="none" stroke="#b79a64" stroke-width="1"/><path d="M18 31h44M23 27l17-11 17 11M27 35v18m13-18v18m13-18v18M20 55h40" fill="none" stroke="#17384c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><text x="40" y="67" text-anchor="middle" font-family="Georgia,serif" font-size="8" font-weight="700" fill="#17384c">SQS 110 F</text></svg>';
  }
  function safeDocumentLink(value) {
    if (!value) return '';
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname ? url.href : ''; }
    catch { return ''; }
  }
  function linkMarkup(value) {
    const url = safeDocumentLink(value);
    return url ? `<p class="document-reference"><strong>Arquivo de referência:</strong> <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir link HTTPS fictício</a></p>` : '';
  }
  function deliveryProtocolBody(item) {
    const residents = window.demoDirectory.exportData().residents;
    const rows = (residents.length ? residents : [{unit:'_____',name:'______________________________'}])
      .sort((a, b) => a.unit.localeCompare(b.unit, 'pt-BR', {numeric: true}))
      .map(person => `<tr><td>${escapeHtml(person.unit)}</td><td>${escapeHtml(person.name)}</td><td>________________________</td><td>____/____/________</td></tr>`).join('');
    return `<h1>Protocolo de entrega da convocação</h1><p>Assembleia ${escapeHtml(item.subtype)} · ${formattedDate(item.date)} · ${escapeHtml(item.title)}</p><table><thead><tr><th>Unidade</th><th>Destinatário previsto</th><th>Assinatura ou forma de entrega</th><th>Data</th></tr></thead><tbody>${rows}</tbody></table><p>Preencha a forma e a data efetivas da entrega. Confira a convenção e as regras aplicáveis.</p>`;
  }
  function attendanceBody(item) {
    const entries = new Set(item.participants.split('\n').map(line => line.trim()).filter(Boolean));
    for (const resident of window.demoDirectory.exportData().residents) entries.add(`${resident.unit} | ${resident.name}`);
    const roster = entries.size ? [...entries].sort((a, b) => a.split('|')[0].trim().localeCompare(b.split('|')[0].trim(), 'pt-BR', {numeric: true})) : ['_____ | ______________________________'];
    const rows = roster.map(line => {
      const [unit, name] = line.split('|').map(value => escapeHtml(value.trim()));
      return `<tr><td>${unit}</td><td>${name}</td><td>________________________</td></tr>`;
    }).join('');
    return `<h1>Lista preparatória de presença</h1><p>Assembleia ${escapeHtml(item.subtype)} · ${formattedDate(item.date)} · ${escapeHtml(item.time)} · ${escapeHtml(item.location)}</p><table><thead><tr><th>Unidade</th><th>Participante previsto</th><th>Assinatura presencial</th></tr></thead><tbody>${rows}</tbody></table><p>Confirme presencialmente quem compareceu e a representação de cada unidade.</p>`;
  }
  function documentBody(item, variant, finance) {
    const value = name => escapeHtml(item[name]);
    const heading = `<p class="document-type">${finance ? 'Referência financeira' : value('subtype')}</p>`;
    if (finance) {
      const amount = item.amount ? new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(Number(item.amount)) : '';
      return `${heading}<h1>${value('title')}</h1><p class="document-date">${formattedDate(item.date)}</p><div class="document-rule"></div><p><strong>Tipo:</strong> ${value('kind')}</p>${amount ? `<p><strong>Valor indicado:</strong> ${escapeHtml(amount)}</p>` : ''}${item.notes ? `<p>${value('notes')}</p>` : ''}${linkMarkup(item.url)}<p class="document-note">Referência cadastrada no Financeiro. A prévia não representa o arquivo original.</p>`;
    }
    if (item.kind === 'assembleias') {
      if (variant === 'convocacao') return `${heading}<h1>Convocação de assembleia</h1><p class="document-date">${formattedDate(item.date)}</p><div class="document-rule"></div><p><strong>Assunto:</strong> ${value('title')}</p><p><strong>Horário:</strong> ${value('time')} &nbsp; <strong>Local:</strong> ${value('location')}</p><h2>Ordem do dia</h2><p>${value('agenda')}</p><p class="document-note">Prazo e forma de convocação: conferir a convenção do condomínio.</p>`;
      if (variant === 'protocolo') return `${heading}${deliveryProtocolBody(item)}`;
      if (variant === 'presenca') return `${heading}${attendanceBody(item)}`;
      const topics = item.agenda.split('\n').map(line => line.trim()).filter(Boolean);
      const decisions = topics.map((topic, index) => `<h2>${index + 1}. ${escapeHtml(topic)}</h2><p>${escapeHtml(item.resolutions?.[index]) || 'Discussão e deliberação pendentes de registro.'}</p>`).join('');
      const oldNote = item.deliberations && !item.resolutions?.some(Boolean) ? `<h2>Anotação anterior sem vínculo à pauta</h2><p>${value('deliberations')}</p>` : '';
      return `${heading}<h1>Minuta de ata</h1><p class="document-subtitle">${value('title')}</p><p class="document-date">${formattedDate(item.date)} · ${value('time')} · ${value('location')}</p><div class="document-rule"></div><p><strong>Presidente:</strong> ${value('chair') || 'A definir'} &nbsp; <strong>Secretário(a):</strong> ${value('secretary') || 'A definir'}</p><h2>Presenças</h2><p>${item.attendanceConfirmed ? value('participants') : 'Presenças ainda não confirmadas para esta minuta.'}</p><h2>Itens da pauta e deliberações a revisar</h2>${decisions}${oldNote}<div class="document-signatures"><p>Assinatura do presidente: __________________________________</p><p>Assinatura do secretário(a): ________________________________</p></div>`;
    }
    if (item.kind === 'comunicados') return `${heading}<h1>${value('title')}</h1><p class="document-date">${formattedDate(item.date)}</p><div class="document-rule"></div><p><strong>Destinatários:</strong> ${value('audience')}</p><p>${value('body')}</p><div class="document-signatures"><p><strong>Divulgação informada:</strong> ${value('channel') || 'Não informada'}</p><p><strong>Situação:</strong> ${value('status')}</p></div>`;
    if (item.kind === 'ocorrencias') return `${heading}<h1>${value('title')}</h1><p class="document-date">${formattedDate(item.date)}</p><div class="document-rule"></div><p><strong>Unidade fictícia:</strong> ${value('unit') || 'Não informada'}</p><h2>Registro do fato</h2><p>${value('body')}</p><p><strong>Regra a conferir:</strong> ${value('rule') || 'Não informada'}</p><p><strong>Evidência fictícia:</strong> ${value('evidence') || 'Não informada'}</p><p><strong>Situação:</strong> ${value('status')}</p><p class="document-note">Registro demonstrativo. Uma eventual penalidade depende de análise específica.</p>`;
    if (item.kind === 'prazos') return `${heading}<h1>${value('title')}</h1><p class="document-date">Vencimento informado: ${formattedDate(item.dueDate)}</p><div class="document-rule"></div><p>${value('body') || 'Nenhuma providência descrita.'}</p><p class="document-note">Confira a vigência no documento original e as regras aplicáveis.</p>`;
    return `${heading}<h1>${value('title')}</h1><p class="document-date">${formattedDate(item.date)}</p><div class="document-rule"></div><p>${value('body') || 'Nenhuma descrição cadastrada.'}</p>${linkMarkup(item.url)}`;
  }
  function documentMarkup(item, variant = 'documento', finance = false) {
    return `<header class="document-letterhead">${logoMarkup()}<div class="document-letterhead-name"><strong>Condomínio SQS 110 F</strong><span>Administração condominial · Identidade demonstrativa</span></div></header><div class="document-body">${documentBody(item, variant, finance)}</div><footer class="document-footnote">Exemplo fictício para demonstração acadêmica · Não é documento oficial.</footer>`;
  }
  function renderPreview() {
    if (!previewState) return;
    $('document-preview-paper').innerHTML = documentMarkup(previewState.item, previewState.variant, previewState.finance);
    $('document-preview-variants').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.variant === previewState.variant)));
  }
  function openPreview(item, finance, opener) {
    const dialog = $('document-preview');
    if (typeof dialog.showModal !== 'function') { message('A prévia não está disponível neste navegador.', 'notice'); return; }
    previewReturnFocus = opener;
    previewState = {item, finance, variant: 'documento'};
    $('document-preview-heading').textContent = item.title;
    const variants = $('document-preview-variants'); variants.replaceChildren(); variants.hidden = item.kind !== 'assembleias' || finance;
    if (!variants.hidden) {
      for (const [variant, label] of [['documento','Minuta da ata'],['convocacao','Convocação'],['protocolo','Protocolo de entrega'],['presenca','Lista de presença']]) {
        const control = document.createElement('button'); control.type = 'button'; control.className = 'secondary'; control.dataset.variant = variant; control.textContent = label;
        control.addEventListener('click', () => { previewState.variant = variant; renderPreview(); }); variants.append(control);
      }
    }
    $('document-preview-finance').hidden = !finance;
    renderPreview(); dialog.showModal(); $('document-preview-close').focus();
  }
  function printPreview() {
    if (!previewState) return;
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) { message('Permita a abertura da janela para imprimir.', 'notice'); return; }
    const {item, variant, finance} = previewState;
    const printStyles = 'body{margin:0;background:#f1ede5;color:#24313a}.document-paper{max-width:800px;margin:25px auto;padding:42px 50px;background:#fffdf8;box-shadow:0 8px 35px #0002;font:16px/1.65 Georgia,serif}.document-letterhead{display:flex;align-items:center;gap:18px;padding-bottom:20px;border-bottom:2px solid #876a3d}.letterhead-logo{width:76px;height:76px;flex:none}.document-letterhead-name strong{display:block;color:#17384c;font-size:20px;font-variant:small-caps;letter-spacing:.04em}.document-letterhead-name span{display:block;color:#665a48;font:12px/1.4 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase}.document-body{padding-top:30px}.document-body h1{margin:4px 0 10px;color:#17384c;font-size:27px;line-height:1.25;text-align:center}.document-body h2{margin:26px 0 8px;color:#17384c;font-size:18px}.document-body p{white-space:pre-wrap;overflow-wrap:anywhere}.document-type{text-align:center;text-transform:uppercase;letter-spacing:.15em;color:#876a3d;font:700 11px Arial,sans-serif}.document-date,.document-subtitle{text-align:center}.document-rule{width:90px;margin:24px auto;border-top:1px solid #b79a64}.document-note{color:#665a48;font-size:14px}.document-signatures{margin-top:40px}.document-footnote{margin-top:42px;padding-top:12px;border-top:1px solid #b79a64;color:#665a48;text-align:center;font:11px Arial,sans-serif}table{width:100%;border-collapse:collapse;font:13px Arial,sans-serif}td,th{padding:9px;border:1px solid #9f9a8e;text-align:left;overflow-wrap:anywhere}a{color:#17384c}.print-action{display:block;margin:0 auto 25px;padding:10px 18px}@media print{body{background:#fff}.document-paper{margin:0;max-width:none;padding:0;box-shadow:none}.print-action{display:none}}';
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(item.title)} · Exemplo fictício</title><style>${printStyles}</style></head><body><div class="document-paper">${documentMarkup(item, variant, finance)}</div><button class="print-action" onclick="window.print()">Imprimir ou salvar como PDF</button></body></html>`);
    popup.document.close();
  }
  function addExamples() {
    if (storageCorrupt) throw new Error('Os documentos salvos não puderam ser lidos.');
    const examples = [
      {id:'demo-doc-convencao',kind:'acervo',subtype:'Convenção ou regimento',title:'Convenção condominial (exemplo)',date:'2026-01-15',url:'',body:'Registro fictício para demonstrar a organização do acervo.'},
      {id:'demo-doc-seguro',kind:'prazos',subtype:'Seguro',title:'Renovação do seguro da edificação (exemplo)',date:'2026-11-01',dueDate:'2027-01-31',body:'Prazo demonstrativo; conferir a apólice e sua vigência real.'},
      {id:'demo-doc-assembleia',kind:'assembleias',subtype:'Ordinária',title:'Prestação de contas e plano anual (exemplo)',date:'2026-12-10',time:'19:00',location:'Salão de reuniões fictício',agenda:'Prestação de contas\nPrevisão orçamentária\nEleição do corpo diretivo',participants:'',chair:'',secretary:'',deliberations:'',status:'Planejada'},
      {id:'demo-doc-aviso',kind:'comunicados',subtype:'Aviso',title:'Manutenção das bombas (exemplo)',date:'2026-11-12',audience:'Moradores fictícios',body:'A manutenção demonstrativa das bombas está prevista para o período da manhã.',channel:'Mural fictício',status:'Rascunho'},
      {id:'demo-doc-ocorrencia',kind:'ocorrencias',subtype:'Ocorrência',title:'Ruído em área comum (exemplo)',date:'2026-11-05',unit:'303',body:'Registro inteiramente fictício de relato sobre ruído fora do horário previsto.',rule:'Conferir a convenção e o regimento.',evidence:'Relato fictício, sem arquivo anexado.',status:'Em análise'}
    ].map(normalize);
    const missing = examples.filter(example => !items.some(item => item.id === example.id));
    if (items.length + missing.length > MAX_ITEMS) throw new Error('Limite de documentos atingido.');
    items = [...items, ...missing]; render(); return {added: missing.length, saved: save()};
  }
  function importData(validated) { items = validateData(validated); storageCorrupt = false; render(); return save(); }
  window.documental = {addExamples, exportData: () => items.map(item => ({...item})), validateData, importData};
  document.querySelectorAll('[data-doc-new]').forEach(element => element.addEventListener('click', () => openForm(element.dataset.docNew)));
  $('document-preview-close').addEventListener('click', () => $('document-preview').close());
  $('document-preview-print').addEventListener('click', printPreview);
  $('document-preview-finance').addEventListener('click', () => $('document-preview').close());
  $('document-preview').addEventListener('close', () => { previewState = null; if (previewReturnFocus?.isConnected) previewReturnFocus.focus(); previewReturnFocus = null; });
  $('document-preview').addEventListener('click', event => { if (event.target === $('document-preview')) $('document-preview').close(); });
  $('archive-search').addEventListener('input', () => renderKind('acervo'));
  $('archive-filter').addEventListener('change', () => renderKind('acervo'));
  window.addEventListener('hashchange', () => { if (location.hash === '#documentos/acervo') renderKind('acervo'); });
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) items = validateData(JSON.parse(raw));
  } catch {
    storageCorrupt = true;
    message('Os documentos administrativos salvos não puderam ser lidos. Importe uma cópia de segurança antes de editar.', 'notice');
  }
  if (!storageCorrupt) {
    try { if (localStorage.getItem(SEED_KEY) === null && addExamples().saved) localStorage.setItem(SEED_KEY, '1'); }
    catch { /* Os exemplos podem ser adicionados manualmente em Configurações. */ }
  }
  render();
})();
