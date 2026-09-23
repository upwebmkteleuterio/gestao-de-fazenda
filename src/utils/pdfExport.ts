import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Utilitário de exportação direta de elementos HTML para arquivo PDF
 * Renderiza em alta resolução (scale 2), formato A4 retrato com quebra de página automática.
 */
export async function exportarElementoParaPDF(
  elementId: string,
  nomeArquivo: string
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Elemento com id '${elementId}' não encontrado para geração de PDF.`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Páginas subsequentes se o documento for longo
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    const safeName = nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`;
    pdf.save(safeName);
    return true;
  } catch (error) {
    console.error('Erro ao gerar arquivo PDF:', error);
    return false;
  }
}
