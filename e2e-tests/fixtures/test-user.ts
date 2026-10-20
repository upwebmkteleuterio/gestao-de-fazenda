import { expect, type Page } from '@playwright/test';

/**
 * Faz login no app usando o usuário de teste isolado fornecido pelo runner.
 * As credenciais são lidas em tempo de execução, pois cada caso de teste
 * recebe uma conta nova.
 */
export async function signIn(page: Page): Promise<void> {
  const email = process.env.DYAD_TEST_USER_EMAIL;
  const password = process.env.DYAD_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Credenciais de teste indisponíveis: DYAD_TEST_USER_EMAIL e DYAD_TEST_USER_PASSWORD não estão definidas.',
    );
  }

  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
