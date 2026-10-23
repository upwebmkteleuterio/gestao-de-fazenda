import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import {
  brincoRegex,
  brincoSemEspacos,
  lancarIatfParaMatriz,
  removerEventoEMatriz,
} from './fixtures/reproducao';

test('encontrar o registro reprodutivo digitando o brinco sem espaços', async ({ page }) => {
  test.setTimeout(240_000);

  await signIn(page);

  // Brinco cadastrado com espaço, como nos brincos reais da fazenda (ex.: "MFJF 27").
  const brinco = `E2E X ${Date.now()}`;
  const digitado = brincoSemEspacos(brinco);
  await lancarIatfParaMatriz(page, brinco, 'PO');

  const linha = page.getByRole('row', { name: brincoRegex(brinco) });

  const buscar = async (termo: string) => {
    await page.locator('#search_matriz').fill(termo);
    await expect(linha).toBeVisible({ timeout: 45000 });
  };

  // Um termo sem resultado garante que cada busca abaixo realmente refiltrou a lista.
  const limparBusca = async () => {
    await page.locator('#search_matriz').fill('ZZZNAOEXISTE');
    await expect(linha).toHaveCount(0, { timeout: 45000 });
  };

  // Brinco digitado sem nenhum espaço.
  await buscar(digitado);

  // Espaço digitado em outra posição: o espaço digitado é ignorado.
  await limparBusca();
  await buscar(`${digitado.slice(0, 4)} ${digitado.slice(4)}`);

  // Busca em minúsculas.
  await limparBusca();
  await buscar(digitado.toLowerCase());

  await removerEventoEMatriz(page, brinco);
});
