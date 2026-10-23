import { expect, type Page } from '@playwright/test';

export const CATEGORIA_LABELS = {
  PA: 'PA – Puro por Avaliação',
  PC: 'PC – Puro por Cruzamento',
  PO: 'PO – Puro de Origem',
  CO: 'CO – Comum',
} as const;

export type CategoriaAnimal = keyof typeof CATEGORIA_LABELS;

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

/**
 * Cria uma matriz (fêmea, ativa) com a categoria informada e lança um
 * protocolo IATF apenas para ela, usando as telas do próprio app. Ao final,
 * deixa a tela de manejo reprodutivo aberta com a busca pelo brinco aplicada.
 */
export async function lancarIatfParaMatriz(page: Page, brinco: string, categoria: CategoriaAnimal): Promise<void> {
  await page.goto('/animais');
  await page.getByRole('button', { name: 'Cadastrar Animal' }).click();
  await page.locator('#brinco').fill(brinco);
  await selecionarNoSelect(page, 'categoria', CATEGORIA_LABELS[categoria]);
  await page.getByRole('button', { name: 'Salvar Animal' }).click();

  await page.locator('#search-animais').fill(brinco);
  await expect(page.getByRole('row', { name: new RegExp(brinco) })).toBeVisible();

  await page.goto('/reproducao');
  await page.getByRole('button', { name: 'Novo Registro Reprodutivo' }).click();
  // Digitar o brinco garante que o lançamento seja feito só para esta matriz.
  await page.getByRole('button', { name: 'Digitar Manualmente' }).click();
  await expect(page.locator('input#iatf_matriz')).toBeVisible();
  await page.locator('#iatf_matriz').fill(brinco);
  await page.locator('#iatf_d10').fill(dataDeHoje());
  // Com touros cadastrados o campo de touro vira lista; o botão "Manual" libera a digitação.
  await page.locator('button[title="Digitar código de sêmen ou touro manualmente"]').click();
  await expect(page.locator('input#iatf_touro')).toBeVisible();
  await page.locator('#iatf_touro').fill('Touro E2E');
  await page.getByRole('button', { name: 'Salvar Lançamento' }).click();
  await expect(
    page.getByText(/Protocolo IATF cadastrado com sucesso!|protocolo\(s\) IATF lançado\(s\) com sucesso!/),
  ).toBeVisible();

  // Reabrir a tela parte de uma sessão limpa e a busca por brinco isola o registro criado.
  await page.goto('/reproducao');
  await page.locator('#search_matriz').fill(brinco);
}

/**
 * Cria a matriz com o lançamento IATF e confirma que o registro aparece na listagem.
 */
export async function cadastrarMatrizComIatf(page: Page, brinco: string, categoria: CategoriaAnimal): Promise<void> {
  await lancarIatfParaMatriz(page, brinco, categoria);
  await expect(page.getByRole('row', { name: new RegExp(brinco) })).toBeVisible({ timeout: 45000 });
}

/** Remove o evento reprodutivo e a matriz criados pelo teste. */
export async function removerEventoEMatriz(page: Page, brinco: string): Promise<void> {
  await page.goto('/reproducao');
  await page.locator('#search_matriz').fill(brinco);
  const linhaDoEvento = page.getByRole('row', { name: new RegExp(brinco) });
  await expect(linhaDoEvento).toBeVisible({ timeout: 45000 });
  await linhaDoEvento.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  await expect(linhaDoEvento).toHaveCount(0);

  await page.goto('/animais');
  await page.locator('#search-animais').fill(brinco);
  const linhaDoAnimal = page.getByRole('row', { name: new RegExp(brinco) });
  await linhaDoAnimal.getByRole('button', { name: 'Excluir' }).click();
  await page.getByRole('button', { name: 'Sim, Excluir' }).click();
  await expect(linhaDoAnimal).toHaveCount(0);
}
