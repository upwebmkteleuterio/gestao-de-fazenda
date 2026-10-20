import { test, expect } from '@playwright/test';
import { signIn } from './fixtures/test-user';

test('a tela de Lotes cai para o cache local quando o servidor não responde', async ({ page }) => {
  await signIn(page);

  // Reproduz a rede "meio aberta" do cliente: o dispositivo continua conectado (a sondagem
  // de conectividade e o login funcionam), mas as requisições de dados ficam penduradas sem
  // responder. Antes da correção não havia tempo limite, então a lista ficava no esqueleto
  // para sempre — só a tela de Animais saía do esqueleto, por ter tempo limite próprio.
  await page.route('**/rest/v1/**', () => new Promise(() => {}));

  await page.goto('/lotes');
  await expect(page).toHaveURL(/\/lotes/);

  // A tela só exibe o aviso de cache local depois que a consulta realmente resolve.
  await expect(
    page.getByText('Modo offline: mostrando os lotes mais recentes em cache.'),
  ).toBeVisible({ timeout: 20000 });

  // E resolve pelo cache, sem virar erro de carregamento.
  await expect(page.getByText('Erro ao carregar lotes')).toHaveCount(0);
});
