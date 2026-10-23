import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { cadastrarMatrizComIatf, removerEventoEMatriz } from './fixtures/reproducao';

test('mostrar a identificação da matriz ao abrir um registro reprodutivo', async ({ page }) => {
  test.setTimeout(120_000);

  await signIn(page);

  const brinco = `E2E-IDE-${Date.now()}`;
  await cadastrarMatrizComIatf(page, brinco, 'PO');

  // Abrir o registro pela listagem (modo Ver).
  await page.getByRole('row', { name: new RegExp(brinco) }).click();

  const identificacao = page.getByTestId('matriz-identificacao');
  await expect(identificacao).toBeVisible();
  await expect(identificacao).toContainText(brinco);
  await expect(identificacao).toContainText('PO – Puro de Origem');

  // Ver/Editar não oferecem mais a seleção em lote de matrizes.
  await expect(page.getByText('Vacas / Matrizes Selecionadas')).toHaveCount(0);

  // O lançamento novo continua com a seleção em lote.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  await expect(page.getByText('Vacas / Matrizes Selecionadas')).toBeVisible();

  await removerEventoEMatriz(page, brinco);
});
