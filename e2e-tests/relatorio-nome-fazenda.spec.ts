import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { cadastrarMatrizComIatf, removerEventoEMatriz } from './fixtures/reproducao';

test('exibir o nome da fazenda no cabeçalho do relatório', async ({ page }) => {
  // O fluxo cria matriz + lançamento, abre o relatório e depois limpa os registros no banco real.
  test.setTimeout(120_000);

  await signIn(page);

  // O nome vem do banco: a Sidebar exibe exatamente o mesmo valor.
  const nomeDaFazenda = (await page.getByTestId('sidebar-farm-name').innerText()).trim();
  expect(nomeDaFazenda.length).toBeGreaterThan(0);

  const brinco = `E2E-REL-${Date.now()}`;
  await cadastrarMatrizComIatf(page, brinco, 'PO');

  await page.goto('/relatorios');
  await page.getByRole('button', { name: 'Visualizar Relatório' }).click();

  const folhaDoRelatorio = page.locator('#relatorio-inseminacoes-conteudo');
  await expect(folhaDoRelatorio).toBeVisible({ timeout: 15000 });
  await expect(folhaDoRelatorio.getByTestId('farm-name')).toHaveText(nomeDaFazenda);
  await expect(folhaDoRelatorio).not.toContainText('FarmNexus Agropecuária');

  await removerEventoEMatriz(page, brinco);
});
