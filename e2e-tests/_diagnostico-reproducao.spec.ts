import { test } from '@playwright/test';
import { signIn } from './fixtures/test-user';
import { lancarIatfParaMatriz } from './fixtures/reproducao';

test('diagnostico do estado da listagem reprodutiva', async ({ page }) => {
  test.setTimeout(180_000);

  const eventos: string[] = [];
  page.on('pageerror', (err) => eventos.push(`pageerror: ${err.message}`));
  page.on('response', async (res) => {
    if (!res.url().includes('eventos_reproducao')) return;
    let body = '';
    try {
      body = (await res.text()).replace(/\s+/g, ' ').slice(0, 220);
    } catch {
      body = '(corpo indisponível)';
    }
    eventos.push(`REST ${res.status()} ${decodeURIComponent(res.url())} -> ${body}`);
  });

  await signIn(page);
  const brinco = `E2E-DIAG-${Date.now()}`;
  await lancarIatfParaMatriz(page, brinco, 'PO');

  const estado = async (rotulo: string) => {
    const info = await page.evaluate(() => {
      const texto = document.body.innerText;
      const diag = document.querySelector('[aria-label="Diagnóstico de consultas em desenvolvimento"]');
      return {
        diag: diag ? (diag as HTMLElement).innerText.replace(/\n/g, ' | ') : null,
        vazio: texto.includes('Nenhum evento reprodutivo registrado'),
        erro: texto.includes('Erro ao carregar eventos reprodutivos') || texto.includes('Cache offline indisponível'),
        leitura: texto.includes('somente leitura'),
        carregando: document.querySelectorAll('.animate-pulse').length,
        primeiraLinha: document.querySelector('tbody tr')?.innerText.replace(/\s+/g, ' ').slice(0, 120) ?? null,
      };
    });
    const alvo = await page.getByRole('row', { name: new RegExp(brinco) }).count();
    eventos.push(`[${rotulo}] alvo=${alvo} estado=${JSON.stringify(info)}`);
  };

  await page.waitForTimeout(5000);
  await estado('busca aplicada 5s');
  await page.waitForTimeout(10000);
  await estado('busca aplicada 15s');

  await page.locator('#search_matriz').fill('');
  await page.waitForTimeout(8000);
  await estado('sem busca 8s');

  throw new Error(`DIAGNOSTICO\n${eventos.slice(-12).join('\n')}`);
});
