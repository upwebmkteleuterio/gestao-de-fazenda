import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';

// Chave onde a biblioteca do Supabase guarda a sessão no aparelho.
const AUTH_STORAGE_KEY = 'sb-zipoizwadfyatilohcon-auth-token';

test('continua logado ao reabrir o app com o token vencido e sem acesso ao Supabase', async ({ page }) => {
  // Com o Supabase fora do ar, o app espera os tempos limite de rede antes de cair no cache local.
  test.setTimeout(180000);

  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard/);

  // Reproduz o campo sem internet: o app abre (em produção o "casco" vem do cache do
  // service worker), mas nenhuma chamada ao Supabase responde.
  await page.route(/zipoizwadfyatilohcon\.supabase\.co/, (route) => route.abort());

  // Token de acesso vencido: é o que obriga o app a tentar renovar a sessão — e, sem rede,
  // a renovação não acontece. Antes desta correção, isso levava o usuário logado ao login.
  await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) throw new Error(`Sessão não encontrada em ${storageKey}`);
    const session = JSON.parse(raw) as { expires_at?: number };
    session.expires_at = Math.floor(Date.now() / 1000) - 3600;
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, AUTH_STORAGE_KEY);

  await page.reload();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  await expect(page.locator('#login-email')).toHaveCount(0);
});

test('continua logado ao reabrir o app sem acesso ao Supabase com a sessão ainda válida', async ({ page }) => {
  test.setTimeout(180000);

  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.route(/zipoizwadfyatilohcon\.supabase\.co/, (route) => route.abort());

  await page.reload();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  await expect(page.locator('#login-email')).toHaveCount(0);
});

test('não desloga sozinho alguns segundos depois de ficar offline com o token vencido', async ({ page }) => {
  // O Supabase leva dezenas de segundos tentando renovar o token antes de desistir, e o
  // ambiente de teste ainda soma o tempo de preparação do usuário isolado.
  test.setTimeout(300000);

  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.route(/zipoizwadfyatilohcon\.supabase\.co/, (route) => route.abort());

  await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) throw new Error(`Sessão não encontrada em ${storageKey}`);
    const session = JSON.parse(raw) as { expires_at?: number };
    session.expires_at = Math.floor(Date.now() / 1000) - 3600;
    window.localStorage.setItem(storageKey, JSON.stringify(session));
  }, AUTH_STORAGE_KEY);

  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

  // O Supabase só desiste de renovar o token depois de algumas tentativas. É nesse momento
  // que ele avisa o app (evento de sessão nulo) e o app expulsava o usuário para o login,
  // mesmo com a sessão salva no aparelho.
  await page.waitForTimeout(45000);

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.locator('#login-email')).toHaveCount(0);
});

test('pede login quando não há sessão salva no aparelho', async ({ page }) => {
  test.setTimeout(180000);

  await signIn(page);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.route(/zipoizwadfyatilohcon\.supabase\.co/, (route) => route.abort());
  await page.evaluate((storageKey) => window.localStorage.removeItem(storageKey), AUTH_STORAGE_KEY);

  await page.reload();

  await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
  await expect(page.locator('#login-email')).toBeVisible();
});
