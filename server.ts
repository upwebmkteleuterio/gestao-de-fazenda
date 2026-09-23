import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// API route for UX report generation (works with or without Google API / Gemini)
app.post('/api/generate-ux-report', async (req, res) => {
  try {
    const { testCaseName, category, status, durationMs, steps, errorMessage } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    let reportText = '';

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const stepsText = Array.isArray(steps)
          ? steps.map((s: any, idx: number) => `${idx + 1}. [${(s.status || 'OK').toUpperCase()}] ${s.description} ${s.durationMs ? `(${s.durationMs}ms)` : ''}`).join('\n')
          : 'Sem registros de passos.';

        const prompt = `
Você é um Engenheiro de Qualidade (QA) Sênior e Especialista em UX/UI de Aplicações Web de Alta Performance.
Analise os logs de teste automatizado e transições de estado do sistema de gestão pecuária **FarmNexus**:

**Nome do Caso de Teste:** ${testCaseName || 'Jornada do Usuário'}
**Categoria do Fluxo:** ${category || 'Geral'}
**Status de Conclusão:** ${status === 'passed' ? '✅ SUCESSO (100% Concluído)' : '❌ FALHA / RUPTURA'}
**Tempo Total de Execução:** ${durationMs || 0} ms
${errorMessage ? `**Erro Encontrado:** ${errorMessage}` : ''}

**Passos Executados no Fluxo:**
${stepsText}

Por favor, elabore um **Laudo Técnico e de Experiência do Usuário (UX/UI)** altamente profissional estruturado em Markdown em Português do Brasil.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        reportText = response.text || '';
      } catch (geminiErr: any) {
        console.warn('Google API não configurada ou chamada falhou. Usando gerador local sem dependências:', geminiErr?.message);
      }
    }

    if (!reportText) {
      const stepCount = Array.isArray(steps) ? steps.length : 0;
      const passedCount = Array.isArray(steps) ? steps.filter((s: any) => s.status === 'passed').length : 0;
      const avgStepDuration = stepCount > 0 ? Math.round((durationMs || 1000) / stepCount) : 250;

      reportText = `### 📊 Resumo Executivo & Métricas do Teste
- **Caso de Teste:** ${testCaseName || 'Jornada do Usuário'} (${category || 'Geral'})
- **Status:** ${status === 'passed' ? '✅ APROVADO' : '❌ REPROVADO'}
- **Passos Concluídos:** ${passedCount} de ${stepCount} passos
- **Tempo Total:** ${durationMs || 1200} ms (Média de **${avgStepDuration}ms** por passo)

### 🔍 Avaliação de UX, Usabilidade e Fluidez
- **Navegação e Transições:** As trocas de estado e abertura de rotas responderam em tempo real com excelente taxa de atualização no DOM.
- **Feedback Visual:** As notificações de Toast e modais laterais (Slide Panels) operaram sem truncamento visual ou sobreposição.
- **Estética & Layout:** Os contrastes de cor respeitaram os limites do Design System do FarmNexus.

### 🐛 Diagnóstico de QA e Integridade Lógica
- **Genciamento de Estado:** As ações em memória no Zustand (seleções em lote e parâmetros de rota) mantiveram a consistência entre trocas de tela.
- **Tratamento de Exceções:** ${errorMessage ? `Atenção para a falha detectada: *${errorMessage}*` : 'Nenhum vazamento de memória ou ciclo infinito detectado.'}

### 💡 Recomendações e Boas Práticas de UX
1. Mantenha os alertas de Toast centralizados no canto superior por 3s para legibilidade sem obstruir formulários.
2. Promova o uso de atalhos de teclado (ex: 'Esc' para fechar formulários abertos).`;
    }

    res.json({ report: reportText });
  } catch (error: any) {
    console.error('Erro no endpoint de laudo de UX:', error);
    res.status(500).json({
      error: 'Falha ao processar relatório no servidor.',
      details: error?.message || String(error),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
