import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';

/**
 * O histórico de toques é buscado com a lista de ids dos animais na URL. Com o rebanho
 * inteiro essa URL ficava grande demais e o servidor respondia 400, o que esvaziava a
 * lista de animais e, com ela, a lista de matrizes do manejo reprodutivo.
 */
test('carregar a lista de matrizes com o rebanho inteiro', async ({ page }) => {
  test.setTimeout(180_000);

  const statusDasConsultasDeToques: number[] = [];
  page.on('response', (response) => {
    if (response.url().includes('/rest/v1/registros_toque')) {
      statusDasConsultasDeToques.push(response.status());
    }
  });

  await signIn(page);
  await page.goto('/reproducao');

  // Abrir o lançamento novo exige a lista completa de matrizes (fêmeas ativas do rebanho).
  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  await expect(page.getByText(/Vacas \/ Matrizes Selecionadas \(\d+ de [1-9]\d*\)/)).toBeVisible({
    timeout: 60_000,
  });

  // A consulta do histórico de toques precisa ter acontecido e sem erro do servidor.
  expect(statusDasConsultasDeToques.length).toBeGreaterThan(0);
  expect(statusDasConsultasDeToques.filter((status) => status >= 400)).toEqual([]);
});
