import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { brincoRegex, brincoSemEspacos, removerAnimalPelaApi } from './fixtures/reproducao';

test('bloquear brinco duplicado quando a diferença é apenas o espaço', async ({ page }) => {
  test.setTimeout(240_000);

  await signIn(page);

  const brinco = `E2E W ${Date.now()}`;
  const semEspacos = brincoSemEspacos(brinco);

  await page.goto('/animais');
  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(brinco);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();

  // O mesmo brinco sem o espaço é o mesmo animal: o cadastro deve ser recusado.
  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(semEspacos);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();
  await expect(page.getByText(/já está em uso/)).toBeVisible({ timeout: 45000 });

  // Limpeza: fecha o painel e remove o animal criado pelo teste.
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await page.locator('#search-animais').fill(semEspacos);
  const linha = page.getByRole('row', { name: brincoRegex(brinco) });
  await expect(linha).toBeVisible({ timeout: 45000 });
  await linha.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  // O aviso confirma que a exclusão foi concluída antes de o teste terminar.
  await expect(page.getByText(/excluído com sucesso/).first()).toBeVisible({ timeout: 45000 });
  await expect(linha).toHaveCount(0);

  await removerAnimalPelaApi(page, brinco);
});
