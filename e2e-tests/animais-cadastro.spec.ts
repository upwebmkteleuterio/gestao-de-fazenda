import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';

test('cadastrar um animal e encontrá-lo pela busca de brinco', async ({ page }) => {
  await signIn(page);

  await page.goto('/animais');
  await expect(page).toHaveURL(/\/animais/);

  // Brinco único para identificar o registro criado por este teste.
  const brinco = `E2E-${Date.now()}`;

  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(brinco);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();

  // A busca por brinco deve trazer o animal recém-cadastrado.
  await page.locator('#search-animais').fill(brinco);

  const linha = page.getByRole('row', { name: new RegExp(brinco) });
  await expect(linha).toBeVisible();

  // Limpeza: remove o animal criado pelo teste para não deixar dados fictícios na fazenda.
  await linha.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  await expect(page.getByRole('row', { name: new RegExp(brinco) })).toHaveCount(0);
});
