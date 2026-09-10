import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

export interface TailorResumeResult {
  markdown: string;
  source: 'ai' | 'smart-ats-optimizer';
  modelUsed?: string;
  notice?: string;
}

export interface BuilderTailorResult {
  markdown: string;
  updatedExperience?: string;
  updatedProjects?: string;
  modelUsed?: string;
}

export interface AiModelConfig {
  aiModel?: string;
  customApiKey?: string;
  customModelName?: string;
  customModelProvider?: string;
}

export const aiService = {
  // Call server-side Resume Builder API — strictly preserving structure, editing only Projects & Experience
  async builderTailor(params: {
    companyName: string;
    jobDescription: string;
    resumeText: string;
    modelConfig?: AiModelConfig;
  }): Promise<BuilderTailorResult> {
    const response = await fetch('/api/ai/builder-tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: params.companyName,
        jobDescription: params.jobDescription,
        resumeText: params.resumeText,
        aiModel: params.modelConfig?.aiModel,
        customApiKey: params.modelConfig?.customApiKey,
        customModelName: params.modelConfig?.customModelName,
        customModelProvider: params.modelConfig?.customModelProvider,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Resume alignment failed.' }));
      throw new Error(err.error || 'Failed to align resume to job description.');
    }

    const data = await response.json();
    return {
      markdown: data.tailoredResumeMarkdown || '',
      updatedExperience: data.updatedExperienceMarkdown,
      updatedProjects: data.updatedProjectsMarkdown,
      modelUsed: data.modelUsed,
    };
  },

  // Call server-side API to tailor resume — passes user's model preference
  async tailorResume(params: {
    baseResume: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
    modelConfig?: AiModelConfig;
  }): Promise<TailorResumeResult> {
    const response = await fetch('/api/ai/tailor-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseResume: params.baseResume,
        jobTitle: params.jobTitle,
        company: params.company,
        jobDescription: params.jobDescription,
        aiModel: params.modelConfig?.aiModel,
        customApiKey: params.modelConfig?.customApiKey,
        customModelName: params.modelConfig?.customModelName,
        customModelProvider: params.modelConfig?.customModelProvider,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'AI tailoring failed' }));
      throw new Error(err.error || 'Failed to tailor resume');
    }

    const data = await response.json();
    return {
      markdown: data.tailoredResumeMarkdown || '',
      source: data.source || 'ai',
      modelUsed: data.modelUsed,
      notice: data.notice,
    };
  },

  // Export DOM preview element to crisp, high-quality A4 PDF with multi-page support
  async downloadResumePdf(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Resume preview element not found');
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
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

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 5) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`);
    } catch (renderError: any) {
      console.error('PDF generation error:', renderError);
      throw new Error(
        renderError?.message ||
          'Failed to render PDF canvas. Please try again or use the browser Print button to save as PDF.'
      );
    }
  },

  // Native browser print to PDF
  printResume(): void {
    window.print();
  },

  // Direct download as Markdown (.md), Text (.txt), or LaTeX (.tex) file
  downloadResumeFile(content: string, filename: string, extension: 'md' | 'txt' | 'tex' = 'md'): void {
    let mimeType = 'text/plain;charset=utf-8';
    if (extension === 'md') mimeType = 'text/markdown;charset=utf-8';
    if (extension === 'tex') mimeType = 'application/x-tex;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
