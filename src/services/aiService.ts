import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface TailorResumeResult {
  markdown: string;
  source: 'ai' | 'smart-ats-optimizer';
  notice?: string;
}

export const aiService = {
  // Call server-side API to tailor resume with Gemini without exposing keys
  async tailorResume(params: {
    baseResume: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
  }): Promise<TailorResumeResult> {
    const response = await fetch('/api/ai/tailor-resume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'AI tailoring failed' }));
      throw new Error(err.error || 'Failed to tailor resume');
    }

    const data = await response.json();
    return {
      markdown: data.tailoredResumeMarkdown || '',
      source: data.source || 'ai',
      notice: data.notice,
    };
  },

  // Export DOM preview element to crisp, high-quality A4 PDF with multi-page support
  async downloadResumePdf(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Resume preview element not found');
    }

    // Capture at high resolution (scale: 2)
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

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

    // First page
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add extra pages if content overflows single A4 page
    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
  },

  // Native browser print to PDF (creates 100% vector-selectable text)
  printResume(): void {
    window.print();
  },
};

