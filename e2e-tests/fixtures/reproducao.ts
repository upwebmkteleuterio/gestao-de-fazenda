import { expect, type Page } from '@playwright/test';

export const CATEGORIA_LABELS = {
  PA: 'PA – Puro por Avaliação',
  PC: 'PC – Puro por Cruzamento',
  PO: 'PO – Puro de Origem',
  CO: 'CO – Comum',
} as const;

export type CategoriaAnimal = keyof typeof CATEGORIA_LABELS;

/** Brinco sem espaços, como o usuário costuma digitar na busca. */
export const brincoSemEspacos = (brinco: string): string => brinco.replace(/\s+/g, '');

/** Regex que casa o brinco cadastrado com ou sem os espaços digitados. */
export const brincoRegex = (brinco: string): RegExp => {
  const partes = brinco
    .trim()
    .split(/\s+/)
    .map((parte) => parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(partes.join('\\s*'), 'i');
};

const SUPABASE_URL = 'https://zipoizwadfyatilohcon.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WwsF1dYAe_cLVN0S1d3fOg_JXmi3adz';

/**
 * Rede de segurança da limpeza. A exclusão de animal feita pela tela é enfileirada para
 * sincronizar depois; se o navegador do teste fechar antes disso, o registro continua no
 * banco. Aqui a remoção é confirmada pela própria API de dados do app, com a sessão do
 * usuário do teste. É melhor esforço: nunca faz o teste falhar.
 */
export async function removerAnimalPelaApi(page: Page, brinco: string): Promise<void> {
  try {
    const token = await page.evaluate(() => {
      const armazenamento = (globalThis as unknown as {
        localStorage?: { length: number; key: (i: number) => string | null; getItem: (k: string) => string | null };
      }).localStorage;
      if (!armazenamento) return null;
      for (let i = 0; i < armazenamento.length; i += 1) {
        const chave = armazenamento.key(i);
        if (!chave || !chave.includes('-auth-token')) continue;
        const bruto = armazenamento.getItem(chave);
        if (!bruto) continue;
        try {
          const sessao = JSON.parse(bruto) as { access_token?: string };
          if (sessao.access_token) return sessao.access_token;
        } catch {
          continue;
        }
      }
      return null;
    });
    if (!token) return;

    const headers = { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` };
    const brincoBusca = brinco.replace(/\s+/g, '').toUpperCase();
    const resposta = await page.request.get(
      `${SUPABASE_URL}/rest/v1/animais?select=id&brinco_busca=eq.${encodeURIComponent(brincoBusca)}`,
      { headers },
    );
    if (!resposta.ok()) return;
    const linhas = (await resposta.json()) as Array<{ id: string }>;
    for (const linha of linhas) {
      await page.request.delete(`${SUPABASE_URL}/rest/v1/animais?id=eq.${encodeURIComponent(linha.id)}`, { headers });
    }
  } catch {
    return;
  }
}

/** Data de hoje no fuso local, no formato aceito por inputs do tipo date. */
const dataDeHoje = (): string => {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${hoje.getFullYear()}-${mes}-${dia}`;
};

/** Abre um Select do app pelo id do gatilho e escolhe a opção pelo rótulo. */
export async function selecionarNoSelect(page: Page, triggerId: string, optionLabel: string): Promise<void> {
  await page.locator(`#${triggerId}`).click();
  await page.getByRole('option', { name: optionLabel }).click();
}

type LancarIatfOptions = {
  /** Texto realmente digitado no campo do brinco (permite testar brinco sem espaço). */
  brincoDigitado?: string;
};

/**
 * Cria uma matriz (fêmea, ativa) com a categoria informada e lança um
 * protocolo IATF apenas para ela, usando as telas do próprio app. Ao final,
 * deixa a tela de manejo reprodutivo aberta com a busca pelo brinco aplicada.
 */
export async function lancarIatfParaMatriz(
  page: Page,
  brinco: string,
  categoria: CategoriaAnimal,
  options: LancarIatfOptions = {},
): Promise<void> {
  await page.goto('/animais');
  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(brinco);
  await selecionarNoSelect(page, 'categoria', CATEGORIA_LABELS[categoria]);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();

  await page.locator('#search-animais').fill(brinco);
  await expect(page.getByRole('row', { name: brincoRegex(brinco) })).toBeVisible();

  await page.goto('/reproducao');
  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  // Digitar o brinco garante que o lançamento seja feito só para esta matriz.
  await page.getByRole('button', { name: 'Digitar Manualmente' }).click();
  await expect(page.locator('input#iatf_matriz')).toBeVisible();
  await page.locator('#iatf_matriz').fill(options.brincoDigitado ?? brinco);
  await page.locator('#iatf_d10').fill(dataDeHoje());
  // Com touros cadastrados o campo de touro vira lista; o botão "Manual" libera a digitação.
  await page.locator('button[title="Digitar código de sêmen ou touro manualmente"]').click();
  await expect(page.locator('input#iatf_touro')).toBeVisible();
  await page.locator('#iatf_touro').fill('Touro E2E');
  await page.getByRole('button', { name: 'Salvar Lançamento' }).click();
  await expect(
    page.getByText(/Protocolo IATF cadastrado com sucesso!|protocolo\(s\) IATF lançado\(s\) com sucesso!/),
  ).toBeVisible({ timeout: 45000 });

  // Reabrir a tela parte de uma sessão limpa e a busca por brinco isola o registro criado.
  await page.goto('/reproducao');
  await page.locator('#search_matriz').fill(brinco);
}

/**
 * Cria a matriz com o lançamento IATF e confirma que o registro aparece na listagem.
 */
export async function cadastrarMatrizComIatf(
  page: Page,
  brinco: string,
  categoria: CategoriaAnimal,
  options: LancarIatfOptions = {},
): Promise<void> {
  await lancarIatfParaMatriz(page, brinco, categoria, options);
  await expect(page.getByRole('row', { name: brincoRegex(brinco) })).toBeVisible({ timeout: 45000 });
}

/** Remove o evento reprodutivo e a matriz criados pelo teste. */
export async function removerEventoEMatriz(page: Page, brinco: string): Promise<void> {
  await page.goto('/reproducao');
  await page.locator('#search_matriz').fill(brinco);
  const linhaDoEvento = page.getByRole('row', { name: brincoRegex(brinco) });
  await expect(linhaDoEvento).toBeVisible({ timeout: 45000 });
  await linhaDoEvento.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  // O aviso confirma que a exclusão foi concluída antes de o teste terminar.
  await expect(page.getByText('Registro reprodutivo excluído.').first()).toBeVisible({ timeout: 45000 });
  await expect(linhaDoEvento).toHaveCount(0);

  await page.goto('/animais');
  await page.locator('#search-animais').fill(brinco);
  const linhaDoAnimal = page.getByRole('row', { name: brincoRegex(brinco) });
  await expect(linhaDoAnimal).toBeVisible({ timeout: 45000 });
  await linhaDoAnimal.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  await expect(page.getByText(/excluído com sucesso/).first()).toBeVisible({ timeout: 45000 });
  await expect(linhaDoAnimal).toHaveCount(0);

  await removerAnimalPelaApi(page, brinco);
}
