import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import {
  brincoRegex,
  brincoSemEspacos,
  cadastrarMatrizComIatf,
  removerEventoEMatriz,
} from './fixtures/reproducao';

test('selecionar uma matriz pelas sugestões de brinco no lançamento IATF', async ({ page }) => {
  test.setTimeout(240_000);

  await signIn(page);

  const brinco = `E2E SUG ${Date.now()}`;
  await cadastrarMatrizComIatf(page, brinco, 'PO');

  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  await page.getByRole('button', { name: 'Digitar Manualmente' }).click();
  await page.locator('#iatf_matriz').fill(brincoSemEspacos(brinco));

  const dropdown = page.getByTestId('matriz-sugestoes');
  await expect(dropdown).toBeVisible();

  const inputBox = await page.locator('#iatf_matriz').boundingBox();
  const dropdownBox = await dropdown.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(dropdownBox).not.toBeNull();
  expect(dropdownBox!.y).toBeGreaterThanOrEqual(inputBox!.y + inputBox!.height - 2);

  const opcao = dropdown.getByRole('option', { name: brincoRegex(brinco) });
  await expect(opcao).toBeVisible();
  await opcao.click();

  await expect(page.locator('#iatf_matriz')).toHaveValue(brinco);
  await expect(page.getByText(/Matriz identificada no rebanho/)).toBeVisible();

  await removerEventoEMatriz(page, brinco);
});
