// High-Fidelity LaTeX (Jake's Resume / Overleaf) HTML & Print Renderer

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdownToHtml(text: string): string {
  if (!text) return '';
  let res = escapeHtml(text);
  // Bold: **text**
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  res = res.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return res;
}

export function generateLatexResumeHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return '';

  const lines = markdown.split(/\r?\n/).map(l => l.trim());

  let candidateName = '';
  let contactLine = '';
  interface Section {
    title: string;
    items: string[];
  }
  const sections: Section[] = [];
  let currentSec: Section | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (!candidateName && (line.startsWith('# ') || i === 0)) {
      candidateName = line.replace(/^#\s*/, '').replace(/^[#*\s•-]+/, '').trim();
      continue;
    }

    if (!contactLine && !line.startsWith('#') && (line.includes('@') || line.includes('|') || line.toLowerCase().includes('linkedin'))) {
      contactLine = line;
      continue;
    }

    if (line.startsWith('## ')) {
      const title = line.replace(/^##\s*/, '').trim();
      currentSec = { title, items: [] };
      sections.push(currentSec);
      continue;
    }

    if (currentSec) {
      currentSec.items.push(line);
    }
  }

  // Format Contact Line
  const contactParts = contactLine.split(/\||•/).map(s => s.trim()).filter(Boolean);
  const contactHtml = contactParts
    .map(p => {
      if (p.includes('@')) {
        return `<a href="mailto:${escapeHtml(p)}">${escapeHtml(p)}</a>`;
      }
      if (p.toLowerCase().includes('linkedin.com')) {
        const url = p.startsWith('http') ? p : `https://${p}`;
        return `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(p.replace(/^https?:\/\/(?:www\.)?/, ''))}</a>`;
      }
      if (p.toLowerCase().includes('github.com')) {
        const url = p.startsWith('http') ? p : `https://${p}`;
        return `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(p.replace(/^https?:\/\/(?:www\.)?/, ''))}</a>`;
      }
      return `<span>${escapeHtml(p)}</span>`;
    })
    .join(' <span class="sep">|</span> ');

  // Format Sections
  const renderedSections: string[] = [];

  for (const sec of sections) {
    const titleUpper = sec.title.toUpperCase();

    if (titleUpper.includes('SUMMARY') || titleUpper.includes('PROFILE')) {
      const summaryText = sec.items.map(l => inlineMarkdownToHtml(l)).join(' ');
      renderedSections.push(`
        <div class="section-block">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          <p class="summary-paragraph">${summaryText}</p>
        </div>
      `);
      continue;
    }

    if (titleUpper.includes('SKILL')) {
      const skillRows: string[] = [];
      for (const line of sec.items) {
        const match = line.match(/^[-*•]?\s*\*\*(.*?)\*\*:\s*(.*)/);
        if (match) {
          skillRows.push(`
            <div class="skill-item">
              <strong>${escapeHtml(match[1].trim())}:</strong> ${inlineMarkdownToHtml(match[2].trim())}
            </div>
          `);
        } else {
          skillRows.push(`
            <div class="skill-item">
              ${inlineMarkdownToHtml(line.replace(/^[-*•]\s*/, ''))}
            </div>
          `);
        }
      }

      renderedSections.push(`
        <div class="section-block">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          <div class="skills-wrapper">
            ${skillRows.join('')}
          </div>
        </div>
      `);
      continue;
    }

    if (titleUpper.includes('EXPERIENCE') || titleUpper.includes('WORK')) {
      const entries: string[] = [];
      let curCompany = '';
      let curLocation = '';
      let curRole = '';
      let curDates = '';
      let curBullets: string[] = [];

      const flushExp = () => {
        if (!curCompany && !curRole && curBullets.length === 0) return;
        const bulletsHtml = curBullets
          .map(b => `<li>${inlineMarkdownToHtml(b)}</li>`)
          .join('');

        entries.push(`
          <div class="entry-block">
            <div class="subheading-row1">
              <span class="left-bold">${escapeHtml(curCompany || curRole)}</span>
              <span class="right-regular">${escapeHtml(curLocation)}</span>
            </div>
            <div class="subheading-row2">
              <span class="left-italic">${escapeHtml(curRole || curCompany)}</span>
              <span class="right-italic">${escapeHtml(curDates)}</span>
            </div>
            ${bulletsHtml ? `<ul class="bullet-list">${bulletsHtml}</ul>` : ''}
          </div>
        `);

        curCompany = '';
        curLocation = '';
        curRole = '';
        curDates = '';
        curBullets = [];
      };

      for (const line of sec.items) {
        if (line.startsWith('### ')) {
          flushExp();
          const parts = line.replace(/^###\s*/, '').split('|').map(s => s.trim());
          if (parts.length >= 2) {
            curCompany = parts[0];
            curLocation = parts[1];
          } else {
            curCompany = parts[0];
          }
        } else if (line.startsWith('*') && line.endsWith('*')) {
          const parts = line.replace(/^\*|\*$/g, '').split('|').map(s => s.trim());
          if (parts.length >= 2) {
            curRole = parts[0];
            curDates = parts[1];
          } else {
            curRole = parts[0];
          }
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          curBullets.push(line.replace(/^[-*•]\s*/, '').trim());
        }
      }
      flushExp();

      renderedSections.push(`
        <div class="section-block">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          ${entries.join('')}
        </div>
      `);
      continue;
    }

    if (titleUpper.includes('PROJECT')) {
      const entries: string[] = [];
      let curTitle = '';
      let curTech = '';
      let curContext = '';
      let curBullets: string[] = [];

      const flushProj = () => {
        if (!curTitle && curBullets.length === 0) return;
        const bulletsHtml = curBullets
          .map(b => `<li>${inlineMarkdownToHtml(b)}</li>`)
          .join('');

        entries.push(`
          <div class="entry-block">
            <div class="subheading-row1">
              <span class="left-bold">
                ${escapeHtml(curTitle)}
                ${curTech ? ` <span class="sep">|</span> <span class="tech-stack">${escapeHtml(curTech)}</span>` : ''}
              </span>
              <span class="right-regular">${escapeHtml(curContext)}</span>
            </div>
            ${bulletsHtml ? `<ul class="bullet-list">${bulletsHtml}</ul>` : ''}
          </div>
        `);

        curTitle = '';
        curTech = '';
        curContext = '';
        curBullets = [];
      };

      for (const line of sec.items) {
        if (line.startsWith('### ')) {
          flushProj();
          const cleanHeading = line.replace(/^###\s*/, '');
          const parts = cleanHeading.split('|').map(s => s.trim());
          curTitle = parts[0] || 'Project';
          if (parts.length >= 2) {
            curContext = parts[1];
          }
        } else if (line.startsWith('*') && line.endsWith('*')) {
          curTech = line.replace(/^\*|\*$/g, '').trim();
        } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          curBullets.push(line.replace(/^[-*•]\s*/, '').trim());
        }
      }
      flushProj();

      renderedSections.push(`
        <div class="section-block">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          ${entries.join('')}
        </div>
      `);
      continue;
    }

    if (titleUpper.includes('EDUCATION')) {
      const entries: string[] = [];
      let curSchool = '';
      let curLocation = '';
      let curDegree = '';
      let curDates = '';

      const flushEdu = () => {
        if (!curSchool && !curDegree) return;
        entries.push(`
          <div class="entry-block">
            <div class="subheading-row1">
              <span class="left-bold">${escapeHtml(curSchool || curDegree)}</span>
              <span class="right-regular">${escapeHtml(curLocation)}</span>
            </div>
            <div class="subheading-row2">
              <span class="left-italic">${escapeHtml(curDegree)}</span>
              <span class="right-italic">${escapeHtml(curDates)}</span>
            </div>
          </div>
        `);
        curSchool = '';
        curLocation = '';
        curDegree = '';
        curDates = '';
      };

      for (const line of sec.items) {
        if (line.startsWith('### ')) {
          flushEdu();
          const parts = line.replace(/^###\s*/, '').split('|').map(s => s.trim());
          curSchool = parts[0];
          if (parts.length >= 2) curLocation = parts[1];
        } else if (line.startsWith('*') && line.endsWith('*')) {
          const parts = line.replace(/^\*|\*$/g, '').split('|').map(s => s.trim());
          curDegree = parts[0];
          if (parts.length >= 2) curDates = parts[1];
        }
      }
      flushEdu();

      renderedSections.push(`
        <div class="section-block">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          ${entries.join('')}
        </div>
      `);
      continue;
    }

    // Default Section
    const genericItems = sec.items.map(l => {
      if (l.startsWith('- ') || l.startsWith('* ') || l.startsWith('• ')) {
        return `<li>${inlineMarkdownToHtml(l.replace(/^[-*•]\s*/, ''))}</li>`;
      }
      return `<p class="summary-paragraph">${inlineMarkdownToHtml(l)}</p>`;
    });

    const isList = sec.items.some(l => l.startsWith('- ') || l.startsWith('* ') || l.startsWith('• '));

    renderedSections.push(`
      <div class="section-block">
        <div class="section-title">${escapeHtml(sec.title)}</div>
        ${isList ? `<ul class="bullet-list">${genericItems.join('')}</ul>` : genericItems.join('')}
      </div>
    `);
  }

  // Exact Jake's Resume LaTeX HTML & Print Stylesheet
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(candidateName)} - Resume</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

@page {
  size: letter;
  margin: 0.6in 0.6in 0.6in 0.6in;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'EB Garamond', 'Latin Modern Roman', 'CMU Serif', Georgia, 'Times New Roman', Times, serif;
  font-size: 10pt;
  line-height: 1.25;
  color: #000000;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.resume-container {
  max-width: 8.5in;
  margin: 0 auto;
  background: #ffffff;
}

.name-header {
  font-size: 21pt;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2pt;
  color: #000000;
}

.contact-line {
  font-size: 9pt;
  text-align: center;
  margin-bottom: 7pt;
  color: #111111;
}

.contact-line a {
  color: #111111;
  text-decoration: none;
}

.contact-line .sep {
  margin: 0 4pt;
  color: #666666;
  font-weight: normal;
}

.section-block {
  margin-top: 6pt;
  margin-bottom: 4pt;
}

.section-title {
  font-size: 11pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 0.75pt solid #000000;
  padding-bottom: 1.5pt;
  margin-bottom: 3pt;
  color: #000000;
}

.summary-paragraph {
  font-size: 9.5pt;
  line-height: 1.35;
  text-align: justify;
  margin-bottom: 4pt;
  color: #000000;
}

.entry-block {
  margin-bottom: 4pt;
}

.subheading-row1 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 9.5pt;
  margin-top: 3pt;
}

.subheading-row1 .left-bold {
  font-weight: 700;
  color: #000000;
}

.subheading-row1 .right-regular {
  font-weight: normal;
  text-align: right;
  color: #111111;
  flex-shrink: 0;
}

.subheading-row1 .sep {
  font-weight: normal;
  margin: 0 3pt;
  color: #555555;
}

.subheading-row1 .tech-stack {
  font-weight: normal;
  font-style: italic;
  font-size: 9pt;
  color: #222222;
}

.subheading-row2 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 9pt;
  margin-bottom: 1.5pt;
}

.subheading-row2 .left-italic {
  font-style: italic;
  color: #222222;
}

.subheading-row2 .right-italic {
  font-style: italic;
  text-align: right;
  color: #333333;
  flex-shrink: 0;
}

.skills-wrapper {
  margin-top: 2pt;
  margin-bottom: 3pt;
}

.skill-item {
  font-size: 9.5pt;
  line-height: 1.35;
  margin-bottom: 2pt;
  color: #000000;
}

.skill-item strong {
  font-weight: 700;
  color: #000000;
}

ul.bullet-list {
  padding-left: 14pt;
  margin-top: 1pt;
  margin-bottom: 3pt;
}

ul.bullet-list li {
  font-size: 9pt;
  line-height: 1.35;
  margin-bottom: 1.5pt;
  color: #000000;
}

strong {
  font-weight: 700;
  color: #000000;
}

@media print {
  body {
    padding: 0;
    margin: 0;
  }
  .resume-container {
    max-width: none;
    width: 100%;
  }
}
</style>
</head>
<body>
<div class="resume-container">
  <div class="name-header">${escapeHtml(candidateName)}</div>
  <div class="contact-line">${contactHtml}</div>
  ${renderedSections.join('')}
</div>
</body>
</html>`;
}
