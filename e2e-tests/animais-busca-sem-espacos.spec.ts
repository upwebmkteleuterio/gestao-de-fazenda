import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { brincoRegex, brincoSemEspacos, removerAnimalPelaApi } from './fixtures/reproducao';

test('encontrar o animal digitando o brinco sem espaços', async ({ page }) => {
  test.setTimeout(240_000);

  await signIn(page);

  const brinco = `E2E Z ${Date.now()}`;
  const digitado = brincoSemEspacos(brinco);

  await page.goto('/animais');
  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(brinco);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();

  const linha = page.getByRole('row', { name: brincoRegex(brinco) });

  // Busca digitando o brinco sem espaços.
  await page.locator('#search-animais').fill(digitado);
  await expect(linha).toBeVisible({ timeout: 45000 });

  // Um termo sem resultado garante que a busca seguinte realmente refiltrou a lista.
  await page.locator('#search-animais').fill('ZZZNAOEXISTE');
  await expect(linha).toHaveCount(0, { timeout: 45000 });

  // Espaço digitado em outra posição: o espaço digitado é ignorado.
  await page.locator('#search-animais').fill(`${digitado.slice(0, 4)} ${digitado.slice(4)}`);
  await expect(linha).toBeVisible({ timeout: 45000 });

  // Limpeza: remove o animal criado pelo teste.
  await linha.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  // O aviso confirma que a exclusão foi concluída antes de o teste terminar.
  await expect(page.getByText(/excluído com sucesso/).first()).toBeVisible({ timeout: 45000 });
  await expect(linha).toHaveCount(0);

  await removerAnimalPelaApi(page, brinco);
});
