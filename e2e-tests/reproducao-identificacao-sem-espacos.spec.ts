import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import {
  brincoRegex,
  brincoSemEspacos,
  cadastrarMatrizComIatf,
  removerEventoEMatriz,
} from './fixtures/reproducao';

test('identificar a matriz digitando o brinco sem espaços', async ({ page }) => {
  test.setTimeout(240_000);

  await signIn(page);

  const brinco = `E2E Y ${Date.now()}`;
  const digitado = brincoSemEspacos(brinco);

  // O lançamento é feito digitando o brinco SEM espaço. Se a identificação não funcionasse,
  // o app recusaria o brinco ("não corresponde ao animal selecionado") e o registro não existiria.
  await cadastrarMatrizComIatf(page, brinco, 'PO', { brincoDigitado: digitado });

  // O histórico guarda o brinco oficial do rebanho (com espaço), não o texto digitado.
  await expect(page.getByRole('row', { name: brincoRegex(brinco) })).toContainText(brinco);

  // Feedback visual: ao digitar sem espaço o painel confirma que identificou a matriz.
  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  await page.getByRole('button', { name: 'Digitar Manualmente' }).click();
  await page.locator('#iatf_matriz').fill(digitado);
  await expect(page.getByText(/Matriz identificada no rebanho/)).toBeVisible();
  await page.keyboard.press('Escape');

  await removerEventoEMatriz(page, brinco);
});
