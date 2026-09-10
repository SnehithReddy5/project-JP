// LaTeX Resume Parser & Exporter based on standard Jake's Resume / Overleaf template

export function isLatexDocument(text: string): boolean {
  if (!text) return false;
  return (
    text.includes('\\documentclass') ||
    text.includes('\\begin{document}') ||
    text.includes('\\resumeSubheading') ||
    text.includes('\\resumeProjectHeading') ||
    (text.includes('\\section{') && text.includes('\\resumeItem'))
  );
}

// Clean LaTeX formatting commands to Markdown equivalents
function cleanLatexFormatting(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\textbf\{([^{}]+)\}/g, '**$1**')
    .replace(/\\textbf\{([^{}]+)\}/g, '**$1**') // twice for nested
    .replace(/\\textit\{([^{}]+)\}/g, '*$1*')
    .replace(/\\emph\{([^{}]+)\}/g, '*$1*')
    .replace(/\\underline\{([^{}]+)\}/g, '$1')
    .replace(/\\small\{([^{}]+)\}/g, '$1')
    .replace(/\\scshape/g, '')
    .replace(/\\Huge/g, '')
    .replace(/\\large/g, '')
    .replace(/\\bfseries/g, '')
    .replace(/\\href\{mailto:([^}]+)\}\{([^}]+)\}/g, '$2')
    .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '$2')
    .replace(/\\url\{([^}]+)\}/g, '$1')
    .replace(/\\\$/g, '$')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\,/g, ' ')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\$1/g, '')
    .replace(/\$\|\$/g, '|')
    .replace(/\\vspace\{[^}]+\}/g, '')
    .replace(/\\\\/g, '\n')
    .replace(/[{}]/g, '')
    .trim();
}

/**
 * Parses a raw LaTeX resume (Overleaf / Jake's Resume) into standardized clean Markdown
 */
export function parseLatexToMarkdown(rawLatex: string): string {
  if (!rawLatex || !rawLatex.trim()) return '';

  const cleaned = rawLatex.replace(/%.*$/gm, ''); // strip comments
  const lines: string[] = [];

  // 1. Extract Candidate Name
  let candidateName = '';
  const nameMatch =
    cleaned.match(/\\textbf\{\\Huge\s*(?:\\scshape)?\s*([^{}\\]+)\}/i) ||
    cleaned.match(/\\Huge\s*(?:\\scshape)?\s*([^{}\\]+)/i) ||
    cleaned.match(/\\begin\{center\}[\s\S]*?\\textbf\{([^}]+)\}/i);

  if (nameMatch) {
    candidateName = cleanLatexFormatting(nameMatch[1]).replace(/\n/g, ' ').trim();
    lines.push(`# ${candidateName}`);
  }

  // 2. Extract Contact Info from header
  const contactLines: string[] = [];
  const centerMatch = cleaned.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/i);
  if (centerMatch) {
    const centerContent = centerMatch[1];
    // Find email
    const emailMatch = centerContent.match(/\\href\{mailto:([^}]+)\}/i) || centerContent.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) contactLines.push(emailMatch[1] || emailMatch[0]);

    // Find phone
    const phoneMatch = centerContent.match(/(\+?[\d\\,\s()–-]{8,}\d)/);
    if (phoneMatch) {
      const cleanPhone = phoneMatch[1].replace(/\\,/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanPhone.length >= 8) contactLines.push(cleanPhone);
    }

    // Find LinkedIn / Portfolio (allowing optional whitespace or newline between braces)
    const linkMatches = [...centerContent.matchAll(/\\href\{([^}]+)\}\s*\{([^}]+)\}/g)];
    for (const m of linkMatches) {
      if (!m[1].startsWith('mailto:')) {
        const linkText = cleanLatexFormatting(m[2] || m[1]);
        if (!contactLines.includes(linkText)) {
          contactLines.push(linkText);
        }
      }
    }
  }

  if (contactLines.length > 0) {
    lines.push(contactLines.join(' | '));
  }

  // 3. Extract Sections
  const sectionRegex = /\\section\{([^}]+)\}([\s\S]*?)(?=(?:\\section\{|\\end\{document\}|$))/gi;
  let sectionMatch: RegExpExecArray | null;

  while ((sectionMatch = sectionRegex.exec(cleaned)) !== null) {
    const sectionTitle = cleanLatexFormatting(sectionMatch[1]).toUpperCase();
    const sectionBody = sectionMatch[2].trim();

    lines.push(`\n## ${sectionTitle}`);

    if (sectionTitle.includes('SUMMARY') || sectionTitle.includes('PROFILE')) {
      const summaryText = cleanLatexFormatting(
        sectionBody
          .replace(/\\begin\{[^}]+\}/g, '')
          .replace(/\\end\{[^}]+\}/g, '')
          .replace(/\s+/g, ' ')
      );
      if (summaryText) lines.push(summaryText);
      continue;
    }

    if (sectionTitle.includes('SKILL')) {
      // Find each \textbf{Category: ...} followed by items
      const skillRegex = /\\textbf\{([^}]+:?)\}:?\s*([\s\S]*?)(?=(?:\\\\|\n\s*\\textbf|\n\s*\}\}|\\end\{itemize\}|$))/gi;
      let skMatch: RegExpExecArray | null;
      let foundSkills = false;

      while ((skMatch = skillRegex.exec(sectionBody)) !== null) {
        const cat = cleanLatexFormatting(skMatch[1]).replace(/:$/, '').trim();
        const items = cleanLatexFormatting(skMatch[2])
          .replace(/\\\\/g, '')
          .replace(/\s+/g, ' ')
          .replace(/^:\s*/, '')
          .trim();
        if (cat && items) {
          lines.push(`- **${cat}:** ${items}`);
          foundSkills = true;
        }
      }

      if (!foundSkills) {
        const rawLines = sectionBody.split(/\\\\|\n/).map(l => cleanLatexFormatting(l).trim()).filter(Boolean);
        for (const rl of rawLines) {
          if (rl && !rl.startsWith('\\')) {
            lines.push(rl.startsWith('-') ? rl : `- ${rl}`);
          }
        }
      }
      continue;
    }

    if (sectionTitle.includes('EXPERIENCE') || sectionTitle.includes('WORK') || sectionTitle.includes('EMPLOYMENT')) {
      // Subheading pattern: \resumeSubheading{Company}{Location}{Role}{Date}
      const subheadings = sectionBody.split(/\\resumeSubheading/g).filter(s => s.trim());
      for (const block of subheadings) {
        const argsMatch = block.match(/^\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/);
        if (argsMatch) {
          const company = cleanLatexFormatting(argsMatch[1]);
          const location = cleanLatexFormatting(argsMatch[2]);
          const role = cleanLatexFormatting(argsMatch[3]);
          const dates = cleanLatexFormatting(argsMatch[4]);

          lines.push(`\n### ${company}${location ? ` | ${location}` : ''}`);
          lines.push(`*${role}${dates ? ` | ${dates}` : ''}*`);
        }

        // Extract bullet items
        const itemMatches = [...block.matchAll(/\\resumeItem\{([\s\S]*?)\}(?=\s*(?:\\resumeItem|\\resumeItemListEnd|\\resumeSubheading|$))/g)];
        for (const im of itemMatches) {
          const itemText = cleanLatexFormatting(im[1].replace(/\s+/g, ' ').trim());
          if (itemText) lines.push(`- ${itemText}`);
        }
      }
      continue;
    }

    if (sectionTitle.includes('PROJECT')) {
      const projectBlocks = sectionBody.split(/\\resumeProjectHeading/g).filter(s => s.trim());
      for (const block of projectBlocks) {
        const argsMatch = block.match(/^\s*\{([\s\S]*?)\}\s*\{([^}]*)\}/);
        if (argsMatch) {
          let titlePart = argsMatch[1];
          const contextPart = cleanLatexFormatting(argsMatch[2]);

          let techStack = '';
          const techMatch = titlePart.match(/\\emph\{([^}]+)\}/i) || titlePart.match(/\$\|\$\s*(.*)/i);
          if (techMatch) {
            techStack = cleanLatexFormatting(techMatch[1]);
            titlePart = titlePart.replace(techMatch[0], '');
          }

          const cleanTitle = cleanLatexFormatting(titlePart).replace(/\|\s*$/, '').trim();

          lines.push(`\n### ${cleanTitle}${contextPart ? ` | ${contextPart}` : ''}`);
          if (techStack) {
            lines.push(`*${techStack}*`);
          }
        }

        const itemMatches = [...block.matchAll(/\\resumeItem\{([\s\S]*?)\}(?=\s*(?:\\resumeItem|\\resumeItemListEnd|\\resumeProjectHeading|$))/g)];
        for (const im of itemMatches) {
          const itemText = cleanLatexFormatting(im[1].replace(/\s+/g, ' ').trim());
          if (itemText) lines.push(`- ${itemText}`);
        }
      }
      continue;
    }

    if (sectionTitle.includes('EDUCATION')) {
      const eduBlocks = sectionBody.split(/\\resumeSubheading/g).filter(s => s.trim());
      for (const block of eduBlocks) {
        const argsMatch = block.match(/^\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}\s*\{([^}]*)\}/);
        if (argsMatch) {
          const school = cleanLatexFormatting(argsMatch[1]);
          const location = cleanLatexFormatting(argsMatch[2]);
          const degree = cleanLatexFormatting(argsMatch[3]);
          const dates = cleanLatexFormatting(argsMatch[4]);

          lines.push(`\n### ${school}${location ? ` | ${location}` : ''}`);
          lines.push(`*${degree}${dates ? ` | ${dates}` : ''}*`);
        }
      }
      continue;
    }

    // Default fallback for any other sections
    const defaultLines = sectionBody.split('\n').map(l => cleanLatexFormatting(l).trim()).filter(Boolean);
    for (const dl of defaultLines) {
      if (!dl.startsWith('\\')) {
        lines.push(dl.startsWith('-') || dl.startsWith('•') ? dl : `- ${dl}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Escapes characters for LaTeX compilation
 */
function escapeLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/–/g, '--')
    .replace(/—/g, '---');
}

/**
 * Converts Markdown bold/italic syntax to LaTeX commands
 */
function markdownToLatexInline(text: string): string {
  if (!text) return '';

  // Handle **bold**
  let converted = text.replace(/\*\*(.*?)\*\*/g, (_, p1) => `\\textbf{${escapeLatex(p1)}}`);
  // Handle *italic*
  converted = converted.replace(/\*(.*?)\*/g, (_, p1) => `\\textit{${escapeLatex(p1)}}`);

  return converted;
}

/**
 * Exports standardized Markdown resume into the exact Overleaf / Jake's Resume LaTeX template
 */
export function exportMarkdownToLatex(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const lines = markdown.split(/\r?\n/).map(l => l.trim());

  let candidateName = 'Candidate Name';
  let contactLine = '';
  const sections: { title: string; lines: string[] }[] = [];
  let currentSection: { title: string; lines: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (line.startsWith('# ') && candidateName === 'Candidate Name') {
      candidateName = line.replace(/^#\s*/, '').trim();
      continue;
    }

    if (!contactLine && !line.startsWith('#') && (line.includes('@') || line.includes('|'))) {
      contactLine = line;
      continue;
    }

    if (line.startsWith('## ')) {
      const secTitle = line.replace(/^##\s*/, '').trim();
      currentSection = { title: secTitle, lines: [] };
      sections.push(currentSection);
      continue;
    }

    if (currentSection) {
      currentSection.lines.push(line);
    }
  }

  // Parse contact line into links / components
  const contactParts = contactLine.split(/\||•/).map(s => s.trim()).filter(Boolean);
  const formattedContact = contactParts
    .map(part => {
      if (part.includes('@')) {
        return `\\href{mailto:${escapeLatex(part)}}{${escapeLatex(part)}}`;
      }
      if (part.toLowerCase().includes('linkedin.com')) {
        const url = part.startsWith('http') ? part : `https://${part}`;
        return `\\href{${escapeLatex(url)}}{${escapeLatex(part.replace(/^https?:\/\/(?:www\.)?/, ''))}}`;
      }
      if (part.toLowerCase().includes('github.com')) {
        const url = part.startsWith('http') ? part : `https://${part}`;
        return `\\href{${escapeLatex(url)}}{${escapeLatex(part.replace(/^https?:\/\/(?:www\.)?/, ''))}}`;
      }
      return escapeLatex(part);
    })
    .join(' $|$\n    ');

  // Build LaTeX Sections
  const latexSections: string[] = [];

  for (const sec of sections) {
    const titleUpper = sec.title.toUpperCase();

    if (titleUpper.includes('SUMMARY') || titleUpper.includes('PROFILE')) {
      const summaryContent = sec.lines
        .map(l => markdownToLatexInline(l))
        .join(' ');
      latexSections.push(
        `%----------SUMMARY----------\n\\section{${escapeLatex(sec.title)}}\n\n${summaryContent}\n`
      );
      continue;
    }

    if (titleUpper.includes('SKILL')) {
      const skillItems: string[] = [];
      for (const line of sec.lines) {
        const match = line.match(/^[-*•]?\s*\*\*(.*?)\*\*:\s*(.*)/);
        if (match) {
          const category = escapeLatex(match[1].trim());
          const list = escapeLatex(match[2].trim());
          skillItems.push(`    \\textbf{${category}:} ${list} \\\\\n`);
        } else {
          skillItems.push(`    ${escapeLatex(line.replace(/^[-*•]\s*/, ''))} \\\\\n`);
        }
      }

      latexSections.push(
        `%----------TECHNICAL SKILLS----------\n\\section{${escapeLatex(sec.title)}}\n\n\\begin{itemize}[leftmargin=0.15in, label={}, itemsep=2pt]\n    \\small{\\item{\n${skillItems.join('\n')}    }}\n\\end{itemize}\n`
      );
      continue;
    }

    if (titleUpper.includes('EXPERIENCE') || titleUpper.includes('WORK')) {
      const expEntries: string[] = [];
      let currentCompany = '';
      let currentRole = '';
      let currentLocation = '';
      let currentDates = '';
      let currentBullets: string[] = [];

      const flushEntry = () => {
        if (!currentCompany && !currentRole && currentBullets.length === 0) return;
        const bulletsLatex = currentBullets
          .map(b => `        \\resumeItem{${markdownToLatexInline(b)}}`)
          .join('\n\n');

        expEntries.push(
          `\\resumeSubheading\n    {${escapeLatex(currentCompany || currentRole)}}{${escapeLatex(currentLocation)}}\n    {${escapeLatex(currentRole || currentCompany)}}{${escapeLatex(currentDates)}}\n\n    \\resumeItemListStart\n${bulletsLatex}\n    \\resumeItemListEnd`
        );
        currentCompany = '';
        currentRole = '';
        currentLocation = '';
        currentDates = '';
        currentBullets = [];
      };

      for (const line of sec.lines) {
        if (line.startsWith('### ')) {
          flushEntry();
          const parts = line.replace(/^###\s*/, '').split('|').map(s => s.trim());
          if (parts.length >= 2) {
            currentRole = parts[0];
            currentCompany = parts[1];
          } else {
            currentCompany = parts[0];
          }
        } else if (line.startsWith('*') && line.endsWith('*')) {
          const dateLoc = line.replace(/^\*|\*$/g, '').split('|').map(s => s.trim());
          if (dateLoc.length >= 2) {
            currentDates = dateLoc[0];
            currentLocation = dateLoc[1];
          } else {
            currentDates = dateLoc[0];
          }
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          currentBullets.push(line.replace(/^[-*•]\s*/, '').trim());
        }
      }
      flushEntry();

      latexSections.push(
        `%----------EXPERIENCE----------\n\\section{${escapeLatex(sec.title)}}\n\n\\resumeSubHeadingListStart\n\n${expEntries.join('\n\n')}\n\n\\resumeSubHeadingListEnd\n`
      );
      continue;
    }

    if (titleUpper.includes('PROJECT')) {
      const projEntries: string[] = [];
      let currentTitle = '';
      let currentTech = '';
      let currentContext = '';
      let currentBullets: string[] = [];

      const flushProj = () => {
        if (!currentTitle && currentBullets.length === 0) return;
        const headingPart = currentTech
          ? `\\textbf{${escapeLatex(currentTitle)}} $|$ \\emph{${escapeLatex(currentTech)}}`
          : `\\textbf{${escapeLatex(currentTitle)}}`;

        const bulletsLatex = currentBullets
          .map(b => `        \\resumeItem{${markdownToLatexInline(b)}}`)
          .join('\n\n');

        projEntries.push(
          `\\resumeProjectHeading\n    {${headingPart}}\n    {${escapeLatex(currentContext)}}\n\n    \\resumeItemListStart\n${bulletsLatex}\n    \\resumeItemListEnd`
        );
        currentTitle = '';
        currentTech = '';
        currentContext = '';
        currentBullets = [];
      };

      for (const line of sec.lines) {
        if (line.startsWith('### ')) {
          flushProj();
          const cleanHeading = line.replace(/^###\s*/, '');
          const parts = cleanHeading.split('|').map(s => s.trim());
          currentTitle = parts[0] || 'Project';
          if (parts.length >= 2) {
            currentContext = parts[1];
          }
        } else if (line.startsWith('*') && line.endsWith('*')) {
          currentTech = line.replace(/^\*|\*$/g, '').trim();
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          currentBullets.push(line.replace(/^[-*•]\s*/, '').trim());
        }
      }
      flushProj();

      latexSections.push(
        `%----------PROJECTS----------\n\\section{${escapeLatex(sec.title)}}\n\n\\resumeSubHeadingListStart\n\n${projEntries.join('\n\n')}\n\n\\resumeSubHeadingListEnd\n`
      );
      continue;
    }

    if (titleUpper.includes('EDUCATION')) {
      const eduEntries: string[] = [];
      let currentSchool = '';
      let currentDegree = '';
      let currentLocation = '';
      let currentDates = '';

      for (const line of sec.lines) {
        if (line.startsWith('### ')) {
          currentDegree = line.replace(/^###\s*/, '').trim();
        } else if (line.startsWith('*') && line.endsWith('*')) {
          const parts = line.replace(/^\*|\*$/g, '').split('|').map(s => s.trim());
          if (parts.length >= 3) {
            currentSchool = parts[0];
            currentLocation = parts[1];
            currentDates = parts[2];
          } else if (parts.length === 2) {
            currentSchool = parts[0];
            currentDates = parts[1];
          } else {
            currentSchool = parts[0];
          }
        }
      }

      if (currentSchool || currentDegree) {
        eduEntries.push(
          `  \\resumeSubheading\n    {${escapeLatex(currentSchool || currentDegree)}}{${escapeLatex(currentLocation)}}\n    {${escapeLatex(currentDegree)}}{${escapeLatex(currentDates)}}`
        );
      }

      latexSections.push(
        `%----------EDUCATION----------\n\\section{${escapeLatex(sec.title)}}\n\n\\resumeSubHeadingListStart\n\n${eduEntries.join('\n\n')}\n\n\\resumeSubHeadingListEnd\n`
      );
      continue;
    }

    // Default other sections
    const defaultBullets = sec.lines
      .map(l => `    \\item ${markdownToLatexInline(l.replace(/^[-*•]\s*/, ''))}`)
      .join('\n');
    latexSections.push(
      `\\section{${escapeLatex(sec.title)}}\n\n\\begin{itemize}[leftmargin=0.15in]\n${defaultBullets}\n\\end{itemize}\n`
    );
  }

  // Exact Jake's Resume / Overleaf LaTeX template requested by user
  return `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

%----------PAGE SETUP----------
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.2in}
\\addtolength{\\topmargin}{-0.7in}
\\addtolength{\\textheight}{1.4in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

%----------SECTION FORMATTING----------
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

%----------CUSTOM COMMANDS----------
\\newcommand{\\resumeItem}[1]{
  \\item\\small{#1 \\vspace{-2pt}}
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubHeadingListStart}{
  \\begin{itemize}[leftmargin=0.15in, label={}]
}

\\newcommand{\\resumeSubHeadingListEnd}{
  \\end{itemize}
}

\\newcommand{\\resumeItemListStart}{
  \\begin{itemize}[leftmargin=0.18in, itemsep=1pt]
}

\\newcommand{\\resumeItemListEnd}{
  \\end{itemize}\\vspace{-5pt}
}

%===========================================================
% DOCUMENT
%===========================================================
\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(candidateName)}} \\\\ \\vspace{4pt}
    \\small
    ${formattedContact}
\\end{center}

${latexSections.join('\n')}
\\end{document}
`;
}
