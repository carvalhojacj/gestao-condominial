'use strict';

const NAV_AREAS = {
  painel: {
    label: 'Painel',
    views: [{route: 'painel/visao-geral', label: 'Visão geral', description: 'Acompanhe as atividades e os cadastros de demonstração.'}]
  },
  plano: {
    label: 'Plano de trabalho',
    views: [
      {route: 'plano/atividades', label: 'Atividades', description: 'Consulte prazos, situações e responsáveis.'},
      {route: 'plano/nova', label: 'Nova atividade', description: 'Cadastre ou atualize uma atividade planejada.'},
      {route: 'plano/previsto-realizado', label: 'Previsto x realizado', description: 'Compare os valores das atividades cadastradas.'}
    ]
  },
  pessoas: {
    label: 'Pessoas',
    views: [
      {route: 'pessoas/moradores', label: 'Moradores', description: 'Vincule moradores fictícios às unidades.'},
      {route: 'pessoas/funcionarios', label: 'Funcionários', description: 'Registre funções e turnos fictícios.'},
      {route: 'pessoas/empresas', label: 'Empresas', description: 'Acompanhe serviços e vencimentos fictícios.'}
    ]
  },
  financeiro: {
    label: 'Financeiro',
    views: [
      {route: 'financeiro/extrato', label: 'Extrato', description: 'Consulte entradas, saídas e saldos do controle demonstrativo.'},
      {route: 'financeiro/documentos', label: 'Documentos', description: 'Organize os documentos fictícios e acompanhe os vínculos com o extrato.'},
      {route: 'financeiro/categorias', label: 'Categorias', description: 'Consulte os totais e organize categorias e subcategorias.'},
      {route: 'financeiro/comprovantes', label: 'Comprovantes', description: 'Localize os links associados às atividades.'}
    ]
  },
  documentos: {
    label: 'Documentos',
    views: [
      {route: 'documentos/acervo', label: 'Acervo', description: 'Encontre documentos administrativos e financeiros fictícios.'},
      {route: 'documentos/assembleias', label: 'Assembleias', description: 'Prepare convocações, listas de presença e minutas de atas.'},
      {route: 'documentos/comunicados', label: 'Comunicados', description: 'Redija avisos e registre sua divulgação.'},
      {route: 'documentos/ocorrencias', label: 'Ocorrências', description: 'Organize fatos, advertências e multas em análise.'},
      {route: 'documentos/prazos', label: 'Prazos', description: 'Acompanhe vencimentos de contratos, apólices e laudos fictícios.'}
    ]
  },
  configuracoes: {
    label: 'Configurações',
    views: [
      {route: 'configuracoes/backup', label: 'Cópia de segurança', description: 'Exporte ou restaure os dados deste navegador.'},
      {route: 'configuracoes/sobre', label: 'Sobre esta versão', description: 'Conheça o alcance e os limites do protótipo.'}
    ]
  }
};

const ROUTES = Object.values(NAV_AREAS).flatMap(area => area.views);
const DEFAULT_ROUTE = 'painel/visao-geral';

function readRoute() {
  try {
    const route = decodeURIComponent(location.hash.slice(1));
    if (route === 'financeiro/previsto-realizado') return 'plano/previsto-realizado';
    return ROUTES.some(view => view.route === route) ? route : DEFAULT_ROUTE;
  } catch { return DEFAULT_ROUTE; }
}

function renderNavigation() {
  const route = readRoute();
  const areaKey = route.split('/')[0];
  const area = NAV_AREAS[areaKey];
  const view = area.views.find(item => item.route === route);
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);

  document.querySelectorAll('.top-nav [data-area]').forEach(link => {
    const active = link.dataset.area === areaKey;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });

  const sideNav = document.getElementById('side-nav');
  sideNav.replaceChildren();
  for (const item of area.views) {
    const link = document.createElement('a');
    link.href = `#${item.route}`;
    link.textContent = item.label;
    if (item.route === route) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    sideNav.append(link);
  }
  document.getElementById('side-label').textContent = area.label;
  document.getElementById('breadcrumb').textContent = area.label;
  document.getElementById('page-title').textContent = route === 'plano/nova'
    ? document.getElementById('form-title').textContent
    : route === 'financeiro/extrato' && !document.getElementById('finance-form-panel').hidden ? document.getElementById('finance-form-title').textContent : view.label;
  document.getElementById('page-description').textContent = view.description;
  document.querySelectorAll('[data-view]').forEach(section => {
    section.hidden = section.dataset.view !== route;
  });
}

window.goToView = route => {
  if (!ROUTES.some(view => view.route === route)) return;
  if (location.hash === `#${route}`) renderNavigation();
  else location.hash = route;
};

window.addEventListener('hashchange', () => {
  renderNavigation();
  document.getElementById('page-title').focus();
});
renderNavigation();
