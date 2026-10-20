import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { cadastrarMatrizComIatf, removerEventoEMatriz, selecionarNoSelect } from './fixtures/reproducao';

test('filtrar o manejo reprodutivo por categoria', async ({ page }) => {
  // O fluxo cria matriz + lançamento e depois limpa os registros no banco real.
  test.setTimeout(120_000);

  await signIn(page);

  const brinco = `E2E-CAT-${Date.now()}`;
  await cadastrarMatrizComIatf(page, brinco, 'PO');

  // A listagem já está filtrada pelo brinco desta matriz.
  const linhaDoEvento = page.getByRole('row', { name: new RegExp(brinco) });
  await expect(linhaDoEvento).toBeVisible();

  // Categoria diferente da matriz do evento: nenhum registro deve aparecer.
  await selecionarNoSelect(page, 'filter_categoria', 'CO – Comum');
  await expect(linhaDoEvento).toHaveCount(0);

  // Voltando para a categoria da matriz, o evento reaparece.
  await selecionarNoSelect(page, 'filter_categoria', 'PO – Puro de Origem');
  await expect(linhaDoEvento).toBeVisible();

  await removerEventoEMatriz(page, brinco);
});
