// Teste funcional opcional. Requer Playwright no ambiente de desenvolvimento.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

async function main() {
  const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH});
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, acceptDownloads: true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href);
    assert.equal(await page.getByRole('link', {name: 'Ir para o conteúdo'}).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (process.env.PREVIEW_DIR) {
      fs.mkdirSync(process.env.PREVIEW_DIR, {recursive: true});
      await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'painel-mobile.png'), fullPage: true});
    }
    assert.equal(await page.locator('#total').textContent(), '0');
    assert.equal(await page.locator('#side-nav a').count(), 1);

    await page.locator('.top-nav [data-area="pessoas"]').click();
    assert.equal(await page.locator('#side-nav a').count(), 3);
    assert.equal(await page.locator('#page-title').textContent(), 'Moradores');
    assert.equal(await page.locator('#resident-form-panel').isHidden(), true);
    assert.equal(await page.locator('#residents-list').evaluate(list => list.compareDocumentPosition(document.getElementById('resident-form-panel')) & Node.DOCUMENT_POSITION_FOLLOWING), Node.DOCUMENT_POSITION_FOLLOWING);
    if (process.env.PREVIEW_DIR) await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'moradores-mobile.png'), fullPage: true});
    await page.getByRole('button', {name: 'Novo morador'}).click();
    assert.equal(await page.locator('#resident-form-panel').isVisible(), true);
    await page.locator('form[data-directory="residents"] [name="unit"]').fill('101');
    await page.locator('form[data-directory="residents"] [name="name"]').fill('Morador Exemplo');
    await page.getByRole('button', {name: 'Salvar morador'}).click();
    assert.equal(await page.locator('#residents-count').textContent(), '1');
    assert.equal(await page.locator('#residents-list-count').textContent(), '1');
    assert.equal(await page.locator('#resident-form-panel').isHidden(), true);
    await page.locator('#residents-list .record').getByRole('button', {name: 'Editar'}).click();
    assert.equal(await page.locator('#resident-form-title').textContent(), 'Editar morador');
    assert.equal(await page.locator('form[data-directory="residents"] [name="unit"]').inputValue(), '101');
    await page.locator('form[data-directory="residents"] [name="unit"]').fill('102');
    await page.getByRole('button', {name: 'Atualizar morador'}).click();
    assert.match(await page.locator('#residents-list').textContent(), /Unidade 102/);
    assert.equal(await page.locator('#resident-form-panel').isHidden(), true);

    await page.locator('#side-nav a[href="#pessoas/funcionarios"]').click();
    assert.equal(await page.locator('#employee-form-panel').isHidden(), true);
    await page.getByRole('button', {name: 'Novo funcionário'}).click();
    await page.locator('form[data-directory="employees"] [name="name"]').fill('Funcionária Exemplo');
    await page.locator('form[data-directory="employees"] [name="job"]').fill('Portaria');
    await page.getByRole('button', {name: 'Salvar funcionário'}).click();
    assert.equal(await page.locator('#employees-count').textContent(), '1');
    assert.equal(await page.locator('#employee-form-panel').isHidden(), true);
    await page.locator('#side-nav a[href="#pessoas/empresas"]').click();
    assert.equal(await page.locator('#vendor-form-panel').isHidden(), true);
    await page.getByRole('button', {name: 'Nova empresa'}).click();
    await page.locator('form[data-directory="vendors"] [name="company"]').fill('Empresa Exemplo');
    await page.locator('form[data-directory="vendors"] [name="service"]').fill('Elevadores');
    await page.getByRole('button', {name: 'Salvar empresa'}).click();
    assert.equal(await page.locator('#vendors-count').textContent(), '1');
    assert.equal(await page.locator('#vendor-form-panel').isHidden(), true);

    await page.locator('.top-nav [data-area="plano"]').click();
    assert.equal(await page.locator('#side-nav a').count(), 2);
    await page.locator('#side-nav a[href="#plano/nova"]').click();
    await page.locator('#description').fill('Teste de manutenção');
    await page.locator('#category').fill('Manutenção');
    await page.locator('#expenseNature').selectOption('Eventual');
    await page.locator('#supplier').fill('Empresa Exemplo');
    await page.locator('#deadline').fill('2026-12-15');
    await page.locator('#periodicity').selectOption('Anual');
    await page.locator('#status').selectOption('Concluída');
    await page.locator('#budget').fill('100.00');
    await page.locator('#actual').fill('89.50');
    await page.locator('#receipt').fill('https://example.com/comprovante.pdf');
    await page.getByRole('button', {name: 'Salvar atividade'}).click();
    assert.match(await page.locator('#message').textContent(), /data de conclusão/i);
    assert.equal(await page.locator('#executionDate').getAttribute('aria-invalid'), 'true');
    assert.equal(await page.locator('#total').textContent(), '0');

    await page.locator('#executionDate').fill('2026-12-16');
    await page.getByRole('button', {name: 'Salvar atividade'}).click();
    assert.equal(await page.locator('#total').textContent(), '1');
    assert.match(await page.locator('#difference').textContent(), /10,50/);
    assert.equal(await page.locator('#items .record').count(), 1);
    await page.reload();
    assert.equal(await page.locator('#total').textContent(), '1');
    assert.equal(await page.locator('#residents-count').textContent(), '1');

    await page.locator('#category-filter').selectOption('Manutenção');
    await page.locator('#nature-filter').selectOption('Eventual');
    assert.equal(await page.locator('#items .record').count(), 1);
    await page.locator('#nature-filter').selectOption('Ordinária');
    assert.equal(await page.locator('#items .record').count(), 0);
    await page.locator('#nature-filter').selectOption('Eventual');
    await page.locator('#month-filter').fill('2026-11');
    assert.equal(await page.locator('#items .record').count(), 0);
    await page.getByRole('button', {name: 'Limpar filtros'}).first().click();
    assert.equal(await page.locator('#items .record').count(), 1);

    await page.locator('#items .record').getByRole('button', {name: 'Editar'}).click();
    assert.equal(await page.locator('#page-title').textContent(), 'Editar atividade');
    await page.locator('#actual').fill('120.25');
    await page.getByRole('button', {name: 'Atualizar atividade'}).click();
    assert.match(await page.locator('#difference').textContent(), /20,25/);

    await page.locator('.top-nav [data-area="financeiro"]').click();
    assert.equal(await page.locator('#message').textContent(), '');
    if (process.env.PREVIEW_DIR) await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'financeiro-mobile.png'), fullPage: true});
    assert.equal(await page.locator('#side-nav a').count(), 2);
    assert.match(await page.locator('#finance-percent').textContent(), /20,3/);
    assert.match(await page.locator('#finance-interpretation').textContent(), /acima do previsto/i);
    assert.match(await page.locator('#finance-by-nature').textContent(), /Eventual/);
    await page.locator('#side-nav a[href="#financeiro/comprovantes"]').click();
    assert.equal(await page.locator('#receipt-items .record').count(), 1);

    await page.locator('.top-nav [data-area="configuracoes"]').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Exportar JSON'}).click();
    assert.match(await page.locator('#message').textContent(), /download iniciado/i);
    const download = await downloadPromise;
    const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.version, 2);
    assert.equal(backup.activities[0].actual, '120.25');
    assert.equal(backup.activities[0].supplier, 'Empresa Exemplo');
    assert.equal(backup.directory.residents.length, 1);
    assert.equal(backup.directory.employees.length, 1);
    assert.equal(backup.directory.vendors.length, 1);

    await page.locator('.top-nav [data-area="plano"]').click();
    await page.locator('#items .record').getByRole('button', {name: 'Excluir'}).click();
    assert.equal(await page.locator('#total').textContent(), '0');
    await page.locator('.top-nav [data-area="configuracoes"]').click();
    await page.locator('#import-file').setInputFiles({name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup))});
    assert.equal(await page.locator('#total').textContent(), '1');
    assert.equal(await page.locator('#residents-count').textContent(), '1');

    const oldBackup = {version: 1, activities: JSON.parse(JSON.stringify(backup.activities))};
    delete oldBackup.activities[0].expenseNature;
    delete oldBackup.activities[0].supplier;
    await page.locator('#import-file').setInputFiles({name: 'backup-antigo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(oldBackup))});
    await page.locator('.top-nav [data-area="plano"]').click();
    await page.locator('#nature-filter').selectOption('');
    await page.locator('#items .record').getByRole('button', {name: 'Editar'}).click();
    assert.equal(await page.locator('#expenseNature').inputValue(), '');
    assert.equal(await page.locator('#supplier').inputValue(), '');
    await page.getByRole('button', {name: 'Cancelar edição'}).click();
    assert.equal(await page.locator('#residents-count').textContent(), '1');

    if (process.env.PREVIEW_DIR) {
      await page.setViewportSize({width: 1280, height: 800});
      await page.locator('.top-nav [data-area="painel"]').click();
      await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'painel-desktop.png'), fullPage: true});
    }
    await page.locator('.top-nav [data-area="configuracoes"]').click();
    await page.locator('#import-file').setInputFiles({name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2,"activities":[{"id":"x","description":"Teste","actual":"-10"}]}')});
    assert.equal(await page.locator('#total').textContent(), '1');
    assert.match(await page.locator('#message').textContent(), /importação cancelada/i);
    assert.deepEqual(errors, []);
    console.log('OK: navegação, cadastros, plano, financeiro e backups v1/v2 em tela de celular');
  } finally { await browser.close(); }
}

main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
