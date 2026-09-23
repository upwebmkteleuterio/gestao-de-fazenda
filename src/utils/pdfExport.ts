import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const safeFileName = (name: string) => (name.endsWith('.pdf') ? name : `${name}.pdf`);

const exportarTabelaGrandeParaPDF = (element: HTMLElement, nomeArquivo: string): boolean => {
  const tables = Array.from(element.querySelectorAll('table'));
  if (tables.length === 0) return false;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 10;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const lineHeight = 4;
  let y = margin;
  let hasContent = false;

  pdf.setFontSize(8);
  const writeLine = (text: string, bold = false) => {
    const lines = pdf.splitTextToSize(text.replace(/\s+/g, ' ').trim(), pageWidth - margin * 2) as string[];
    if (lines.length === 0 || !lines[0]) return;
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    lines.forEach((line) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
      hasContent = true;
    });
  };

  const title = element.querySelector('h1')?.textContent;
  if (title) writeLine(title, true);

  tables.forEach((table, tableIndex) => {
    if (tableIndex > 0) y += 2;
    Array.from(table.querySelectorAll('tr')).forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll('th, td'))
        .map((cell) => cell.textContent || '')
        .filter((cell) => cell.trim().length > 0);
      if (cells.length > 0) writeLine(cells.join(' | '), rowIndex === 0);
    });
  });

  if (!hasContent) return false;
  pdf.save(safeFileName(nomeArquivo));
  return true;
};

export async function exportarElementoParaPDF(
  elementId: string,
  nomeArquivo: string,
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Elemento com id '${elementId}' não encontrado para geração de PDF.`);
    return false;
  }

  try {
    if (element.scrollHeight > 24000) {
      return exportarTabelaGrandeParaPDF(element, nomeArquivo);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
    });

    if (canvas.width > 24000 || canvas.height > 24000) {
      return exportarTabelaGrandeParaPDF(element, nomeArquivo);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(safeFileName(nomeArquivo));
    return true;
  } catch (error) {
    console.error('Erro ao gerar arquivo PDF:', error);
    return exportarTabelaGrandeParaPDF(element, nomeArquivo);
  }
}
