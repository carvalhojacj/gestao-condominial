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
      const people = item.participants.split('\n').map(line => line.trim()).filter(Boolean);
      if (people.length > 60 || people.some(line => !/^[^|\n]{1,40}\s*\|\s*[^|\n]{1,100}$/.test(line))) {
        throw new Error('Presenças: use até 60 linhas no formato Unidade | Nome.');
      }
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
    const main = document.createElement('div'); main.className = 'documental-main';
    const heading = document.createElement('h4'); heading.textContent = item.title;
    const meta = document.createElement('p'); meta.className = 'document-row-meta';
    meta.textContent = `${item.subtype || item.kind || 'Financeiro'} · ${formattedDate(item.date || item.dueDate)}${item.status ? ` · ${item.status}` : ''}${item.unit ? ` · Unidade ${item.unit}` : ''}`;
    main.append(heading, meta);
    const actions = document.createElement('div'); actions.className = 'actions';
    if (finance) {
      const link = document.createElement('a'); link.href = '#financeiro/documentos'; link.className = 'button-link secondary'; link.textContent = 'Abrir no Financeiro'; actions.append(link);
    } else {
      actions.append(button('Editar', edit, item));
      if (item.kind === 'assembleias') {
        actions.append(button('Convocação', meetingNotice, item), button('Lista de presença', attendance, item), button('Minuta da ata', printItem, item));
      } else actions.append(button('Imprimir', printItem, item));
      actions.append(button('Excluir', remove, item));
    }
    line.append(main, actions); return line;
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
  function openForm(kind, item = null) {
    Object.keys(fields).forEach(area => { $(`${area}-form-panel`).hidden = true; });
    const panel = $(`${kind}-form-panel`); panel.replaceChildren(); panel.hidden = false;
    const title = document.createElement('h4'); title.textContent = `${item ? 'Editar' : 'Novo'} ${labels[kind]}`;
    const form = document.createElement('form'); form.className = 'form-grid compact-form';
    for (const [name, label, type, limit, required] of fields[kind]) {
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
      wrapper.append(input); form.append(wrapper);
    }
    const actions = document.createElement('div'); actions.className = 'actions wide';
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = `Salvar ${labels[kind]}`;
    const cancel = button('Cancelar', () => { panel.hidden = true; panel.replaceChildren(); }, item);
    actions.append(submit, cancel); form.append(actions); panel.append(title, form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      try {
        if (storageCorrupt) throw new Error('Os documentos salvos não puderam ser lidos. Importe uma cópia antes de editar.');
        const raw = {id: item?.id || (globalThis.crypto?.randomUUID?.() || `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`), kind};
        for (const [name] of fields[kind]) raw[name] = form.elements[name].value;
        const next = normalize(raw);
        if (!item && items.length >= MAX_ITEMS) throw new Error('Limite de documentos atingido.');
        items = item ? items.map(current => current.id === item.id ? next : current) : [...items, next];
        panel.hidden = true; panel.replaceChildren(); render();
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
  function printPage(title, html) {
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) { message('Permita a abertura da janela para imprimir.', 'notice'); return; }
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)} · Exemplo fictício</title><style>body{font:16px/1.5 Arial,sans-serif;max-width:760px;margin:40px auto;color:#142938}h1{font-size:24px}h2{font-size:18px;margin-top:26px}p,li{white-space:pre-wrap}table{width:100%;border-collapse:collapse}td,th{border:1px solid #888;padding:10px;text-align:left}.demo{color:#9b3434;font-weight:bold}footer{margin-top:40px;color:#667}@media print{body{margin:18mm}.no-print{display:none}}</style></head><body><p class="demo">EXEMPLO FICTÍCIO · NÃO É DOCUMENTO OFICIAL</p>${html}<footer>Revise as informações e providencie assinaturas e formalidades aplicáveis.</footer><p class="no-print"><button onclick="window.print()">Imprimir ou salvar como PDF</button></p></body></html>`);
    popup.document.close();
  }
  function printItem(item) {
    const value = name => escapeHtml(item[name]);
    let content = `<h1>${value('title')}</h1><p>${value('subtype')} · ${formattedDate(item.date || item.dueDate)}</p>`;
    if (item.kind === 'assembleias') {
      content += `<p><strong>Horário:</strong> ${value('time')} &nbsp; <strong>Local:</strong> ${value('location')}</p><p><strong>Presidente:</strong> ${value('chair')} &nbsp; <strong>Secretário(a):</strong> ${value('secretary')}</p><h2>Pauta</h2><p>${value('agenda')}</p><h2>Presenças informadas</h2><p>${value('participants')}</p><h2>Discussões e deliberações a revisar</h2><p>${value('deliberations') || 'Pendente de registro.'}</p><p>Assinatura do presidente: __________________________________</p><p>Assinatura do secretário(a): ________________________________</p>`;
    } else if (item.kind === 'comunicados') content += `<p><strong>Destinatários:</strong> ${value('audience')}</p><p>${value('body')}</p><p><strong>Meio de divulgação informado:</strong> ${value('channel')}</p>`;
    else if (item.kind === 'ocorrencias') content += `<p><strong>Unidade fictícia:</strong> ${value('unit')}</p><p>${value('body')}</p><p><strong>Regra a conferir:</strong> ${value('rule')}</p><p><strong>Evidência fictícia:</strong> ${value('evidence')}</p><p><strong>Situação:</strong> ${value('status')}</p>`;
    else content += `<p>${value('body')}</p>${item.dueDate ? `<p><strong>Vencimento informado:</strong> ${formattedDate(item.dueDate)}</p>` : ''}`;
    printPage(item.title, content);
  }
  function meetingNotice(item) {
    printPage(`Convocação · ${item.title}`, `<h1>Convocação para assembleia ${escapeHtml(item.subtype)}</h1><p><strong>Assunto:</strong> ${escapeHtml(item.title)}</p><p><strong>Data:</strong> ${formattedDate(item.date)} &nbsp; <strong>Horário:</strong> ${escapeHtml(item.time)} &nbsp; <strong>Local:</strong> ${escapeHtml(item.location)}</p><h2>Ordem do dia</h2><p>${escapeHtml(item.agenda)}</p><p>Prazo e forma de convocação: conferir a convenção do condomínio.</p>`);
  }
  function attendance(item) {
    const entries = item.participants.split('\n').map(line => line.trim()).filter(Boolean);
    const rows = (entries.length ? entries : ['_____ | ______________________________']).map(line => {
      const [unit, name] = line.split('|').map(value => escapeHtml(value.trim()));
      return `<tr><td>${unit}</td><td>${name}</td><td>________________________</td></tr>`;
    }).join('');
    printPage(`Lista de presença · ${item.title}`, `<h1>Lista de presença</h1><p>Assembleia ${escapeHtml(item.subtype)} · ${formattedDate(item.date)} · ${escapeHtml(item.time)} · ${escapeHtml(item.location)}</p><table><thead><tr><th>Unidade</th><th>Participante informado</th><th>Assinatura presencial</th></tr></thead><tbody>${rows}</tbody></table><p>Presenças e representação devem ser conferidas no dia da assembleia.</p>`);
  }
  function addExamples() {
    if (storageCorrupt) throw new Error('Os documentos salvos não puderam ser lidos.');
    const examples = [
      {id:'demo-doc-convencao',kind:'acervo',subtype:'Convenção ou regimento',title:'Convenção condominial (exemplo)',date:'2026-01-15',url:'',body:'Registro fictício para demonstrar a organização do acervo.'},
      {id:'demo-doc-seguro',kind:'prazos',subtype:'Seguro',title:'Renovação do seguro da edificação (exemplo)',date:'2026-11-01',dueDate:'2027-01-31',body:'Prazo demonstrativo; conferir a apólice e sua vigência real.'},
      {id:'demo-doc-assembleia',kind:'assembleias',subtype:'Ordinária',title:'Prestação de contas e plano anual (exemplo)',date:'2026-12-10',time:'19:00',location:'Salão de reuniões fictício',agenda:'Prestação de contas\nPrevisão orçamentária\nEleição do corpo diretivo',participants:'101 | Morador Exemplo A\n202 | Moradora Exemplo B',chair:'',secretary:'',deliberations:'',status:'Planejada'},
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
