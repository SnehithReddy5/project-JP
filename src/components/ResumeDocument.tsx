import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isLatexDocument, parseLatexToMarkdown } from '../utils/latexResume';

export type ResumeTheme = 'executive' | 'modern' | 'minimal';

interface ResumeDocumentProps {
  markdown: string;
  theme?: ResumeTheme;
  elementId?: string;
  isEditable?: boolean;
  onMarkdownChange?: (newMd: string) => void;
}

export function normalizeResumeMarkdown(rawText: string): string {
  if (!rawText || !rawText.trim()) return '';
  const text = rawText.trim();

  // If raw LaTeX code is detected (e.g. \documentclass, \resumeSubheading, \section{...})
  if (isLatexDocument(text)) {
    return parseLatexToMarkdown(text);
  }

  // If already formatted with standard Markdown headers, normalize bullets and return
  if (text.includes('## ') && text.includes('# ')) {
    return text.replace(/^[•·]\s*/gm, '- ');
  }

  // Parse plain-text or unstructured resume into standard ATS Markdown
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return text;

  const mdOutput: string[] = [];
  let candidateName = '';
  const contactParts: string[] = [];
  let currentSection = '';
  let inContactBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Candidate Name (first line)
    if (!candidateName && i === 0) {
      candidateName = line.replace(/^[#*\s•-]+/, '').trim();
      mdOutput.push(`# ${candidateName}`);
      continue;
    }

    // 2. Contact header section trigger
    if (/^contact\s*$/i.test(line)) {
      inContactBlock = true;
      continue;
    }

    // Contact items
    if (
      inContactBlock ||
      line.includes('@') ||
      line.toLowerCase().startsWith('phone:') ||
      line.toLowerCase().startsWith('email:') ||
      line.toLowerCase().startsWith('linkedin:') ||
      line.toLowerCase().startsWith('location:')
    ) {
      if (
        line.includes('@') ||
        line.toLowerCase().includes('linkedin.com') ||
        /\+?\d{2,4}[-\s]?\d{6,12}/.test(line) ||
        line.toLowerCase().startsWith('location:')
      ) {
        const cleaned = line
          .replace(/^[•·*-]\s*/, '')
          .replace(/^(?:Phone|Email|LinkedIn|Location):\s*/i, '')
          .trim();
        if (cleaned) contactParts.push(cleaned);
        continue;
      }
    }

    // Section headings detection
    const sectionMatch = line.match(
      /^(?:(?:##\s*)?(Professional\s+Summary|Summary|Profile|Core\s+Skills|Technical\s+Skills|Technical\s+&\s+Core\s+Skills|Skills|Professional\s+Experience|Experience|Work\s+History|Work\s+Experience|Education|Academic\s+Background|Certifications\s*&\s*Achievements|Certifications|Key\s+Achievements|Projects|Key\s+Projects))(?:\s*:)?$/i
    );

    if (sectionMatch) {
      inContactBlock = false;
      if (contactParts.length > 0 && mdOutput.length === 1) {
        mdOutput.push(contactParts.join(' | '));
        contactParts.length = 0;
      }
      currentSection = sectionMatch[1].toUpperCase();
      mdOutput.push(`\n## ${currentSection}`);
      continue;
    }

    // Flush contact info if section not triggered yet
    if (contactParts.length > 0 && mdOutput.length === 1 && !inContactBlock) {
      mdOutput.push(contactParts.join(' | '));
      contactParts.length = 0;
    }

    // 3. Job Title and Company under Experience
    if (currentSection.includes('EXPERIENCE') || currentSection.includes('WORK')) {
      const isBullet = /^[•·*-]/.test(line);
      if (!isBullet) {
        const nextLine = lines[i + 1] || '';
        const hasDateOrLocation =
          /(?:present|\d{4}|bengaluru|bangalore|india|usa|remote|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(nextLine) &&
          !/^[•·*-]/.test(nextLine);

        if (hasDateOrLocation) {
          const compParts = nextLine.split(/—|-|–/).map(s => s.trim());
          const compName = compParts[0] || nextLine;
          const dateLocation = compParts.slice(1).join(' — ') || '';

          mdOutput.push(`\n### ${line} | ${compName}`);
          if (dateLocation) {
            mdOutput.push(`*${dateLocation}*`);
          }
          i++; // skip next line
          continue;
        } else if (line.includes('|')) {
          mdOutput.push(`\n### ${line}`);
          continue;
        }
      }
    }

    // 4. Bullet points
    if (/^[•·*-]/.test(line)) {
      const bulletText = line.replace(/^[•·*-]\s*/, '').trim();
      if (bulletText.includes(':') && bulletText.indexOf(':') < 45) {
        const colonIdx = bulletText.indexOf(':');
        const category = bulletText.slice(0, colonIdx).trim();
        const rest = bulletText.slice(colonIdx + 1).trim();
        mdOutput.push(`- **${category}:** ${rest}`);
      } else {
        mdOutput.push(`- ${bulletText}`);
      }
      continue;
    }

    // 5. Default paragraphs
    mdOutput.push(line);
  }

  if (contactParts.length > 0 && mdOutput.length === 1) {
    mdOutput.push(contactParts.join(' | '));
  }

  return mdOutput.join('\n');
}

export const ResumeDocument: React.FC<ResumeDocumentProps> = ({
  markdown,
  theme = 'executive',
  elementId = 'resume-preview-document',
  isEditable = false,
  onMarkdownChange,
}) => {
  const displayMarkdown = React.useMemo(() => normalizeResumeMarkdown(markdown), [markdown]);

  if (isEditable) {
    return (
      <div className="w-full max-w-[800px] mx-auto bg-white rounded-xl border border-neutral-200 shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Direct Resume Editor (Markdown)</h4>
            <p className="text-xs text-neutral-500">
              Edit any bullet points, contact info, or dates. Changes save directly to this application.
            </p>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-mono">
            Markdown Mode
          </span>
        </div>
        <textarea
          id="resume-markdown-editor"
          value={markdown}
          onChange={e => onMarkdownChange?.(e.target.value)}
          rows={24}
          className="w-full p-4 font-mono text-xs text-neutral-800 bg-neutral-50 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900 leading-relaxed"
          placeholder="Enter resume markdown..."
        />
      </div>
    );
  }

  // Theme-specific style mappings adhering to Jake's Resume / Overleaf LaTeX template
  const themeStyles = {
    executive: {
      fontFamily: '"Computer Modern", "Latin Modern Roman", "CMU Serif", Georgia, Cambria, "Times New Roman", Times, serif',
      sectionHeading: 'text-[12.5px] font-bold tracking-[0.05em] uppercase text-black pb-0.5 border-b border-black w-full',
      nameHeading: 'text-2xl sm:text-[26px] font-bold tracking-[0.06em] uppercase text-black text-center pt-2 pb-0.5',
      contactLine: 'text-center text-xs text-neutral-800 tracking-normal pb-2 mb-2',
      bulletSpacing: 'my-0.5',
    },
    modern: {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      sectionHeading: 'text-[12px] font-bold tracking-widest uppercase text-black pb-0.5 border-b border-black w-full',
      nameHeading: 'text-2xl font-bold tracking-tight uppercase text-black text-center pt-2 pb-0.5',
      contactLine: 'text-center text-xs text-neutral-700 pb-2 mb-2',
      bulletSpacing: 'my-0.5',
    },
    minimal: {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      sectionHeading: 'text-[11.5px] font-semibold tracking-wider uppercase text-neutral-900 pb-0.5 border-b border-neutral-300 w-full',
      nameHeading: 'text-xl font-bold tracking-normal uppercase text-neutral-900 text-center pt-1 pb-0.5',
      contactLine: 'text-center text-[11px] text-neutral-600 pb-1.5 mb-1.5',
      bulletSpacing: 'my-0.5',
    },
  }[theme];

  return (
    <div
      id={elementId}
      style={{ fontFamily: themeStyles.fontFamily, backgroundColor: '#ffffff', color: '#000000' }}
      className="w-full max-w-[800px] min-h-[1050px] p-8 sm:p-12 shadow-lg border border-neutral-200 mx-auto text-xs leading-normal print:shadow-none print:border-none print:p-0 print:max-w-none print:min-h-0 bg-white"
    >
      <div className="resume-content-wrapper space-y-1">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1
                className={themeStyles.nameHeading}
                style={{ fontVariant: 'small-caps' }}
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <div className="w-full mt-3.5 mb-1.5">
                <h2
                  className={themeStyles.sectionHeading}
                  style={{ fontVariant: 'small-caps' }}
                >
                  {children}
                </h2>
              </div>
            ),
            h3: ({ children }) => {
              // LaTeX \resumeSubheading 2-column tabular layout
              const text = String(children);
              if (text.includes('|')) {
                const parts = text.split('|').map(s => s.trim());
                return (
                  <div className="flex flex-row items-baseline justify-between pt-1.5 pb-0.2 text-xs font-bold text-black">
                    <span className="font-bold text-black">{parts[0]}</span>
                    <span className="font-normal text-neutral-800 text-right shrink-0">
                      {parts.slice(1).join(' | ')}
                    </span>
                  </div>
                );
              }
              return <h3 className="pt-1.5 pb-0.2 text-xs font-bold text-black">{children}</h3>;
            },
            p: ({ children }) => {
              const text = String(children);
              // Contact Line check: contains email or domain and separator
              const isContactLine =
                text.length < 250 &&
                (text.includes('@') || text.toLowerCase().includes('linkedin.com') || text.toLowerCase().includes('github.com')) &&
                (text.includes('|') || text.includes('•') || /[\d-]{7,}/.test(text));

              if (isContactLine) {
                return (
                  <p className={themeStyles.contactLine}>
                    {children}
                  </p>
                );
              }

              return (
                <p className="text-black text-[11.5px] leading-relaxed my-1 text-left">
                  {children}
                </p>
              );
            },
            em: ({ children }) => {
              // Usually date ranges or tech stack in subheadings
              const text = String(children);
              if (text.includes('|')) {
                const parts = text.split('|').map(s => s.trim());
                return (
                  <div className="flex flex-row items-baseline justify-between pb-0.5 text-[11px] italic text-neutral-700">
                    <span>{parts[0]}</span>
                    <span className="text-right shrink-0">{parts.slice(1).join(' | ')}</span>
                  </div>
                );
              }
              return (
                <span className="block text-[11px] italic text-neutral-700 pb-0.5">
                  {children}
                </span>
              );
            },
            strong: ({ children }) => (
              <strong className="font-bold text-black">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 space-y-0.5 text-black my-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 space-y-0.5 text-black my-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className={`text-[11.5px] leading-relaxed text-black pl-0.5 ${themeStyles.bulletSpacing}`}>
                {children}
              </li>
            ),
          }}
        >
          {displayMarkdown}
        </Markdown>
      </div>
    </div>
  );
};
