import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const templatePath = path.join(distDir, 'index.html');

if (!fs.existsSync(templatePath)) {
  throw new Error('[generate-seo] dist/index.html not found. Run vite build first.');
}

// Transpile TypeScript course data + SEO helpers using esbuild (bundled with Vite).
const esbuildPath = path.join(rootDir, 'node_modules', 'esbuild', 'lib', 'main.js');
const esbuild = await import(esbuildPath);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'py-course-seo-'));

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

function escapeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function renderInlineHtml(text) {
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('`')) {
      result += `<code>${escapeHtml(token.slice(1, -1))}</code>`;
    } else if (token.startsWith('**')) {
      result += `<strong>${escapeHtml(token.slice(2, -2))}</strong>`;
    } else if (token.startsWith('*')) {
      result += `<em>${escapeHtml(token.slice(1, -1))}</em>`;
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    result += escapeHtml(text.slice(lastIndex));
  }
  return result;
}

function replaceExactlyOnce(html, regex, replacement, label) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const globalRegex = new RegExp(regex.source, flags);
  let count = 0;
  const next = html.replace(globalRegex, () => {
    count++;
    return replacement;
  });
  if (count !== 1) {
    throw new Error(`[generate-seo] Expected 1 match for ${label}, got ${count}`);
  }
  return next;
}

function renderCurriculumNav(sections, lessons) {
  const bySection = new Map();
  for (const l of lessons) {
    const list = bySection.get(l.sectionId) ?? [];
    list.push(l);
    bySection.set(l.sectionId, list);
  }
  return sections
    .map((sec) => {
      const items = (bySection.get(sec.id) ?? [])
        .map(
          (l) =>
            `<li><a href="/lessons/${encodeURIComponent(l.id)}" style="color:#82b2ff;text-decoration:none">${l.index}. ${escapeHtml(l.title)}</a></li>`
        )
        .join('');
      return `<section style="margin-bottom:16px"><h3 style="margin:0 0 6px;font-size:15px;color:#f4f4f5">${sec.number}. ${escapeHtml(sec.shortTitle)}</h3><ul style="margin:0;padding-left:20px;line-height:1.8">${items}</ul></section>`;
    })
    .join('');
}

function renderHomeFallback(sections, lessons, defaultDescription) {
  return `<main style="height:100%;overflow-y:auto;padding:32px 24px;max-width:860px;margin:0 auto;color:#c4c4cc;font-family:system-ui,-apple-system,sans-serif;line-height:1.65">
  <h1 style="margin:0 0 12px;font-size:28px;color:#f4f4f5">Python for Coding Interviews — Interactive Course</h1>
  <p style="margin:0 0 24px">${escapeHtml(defaultDescription)}</p>
  <nav aria-label="Course Curriculum">
    <h2 style="margin:0 0 16px;font-size:20px;color:#f4f4f5">Curriculum (${lessons.length} Lessons across ${sections.length} Sections)</h2>
    ${renderCurriculumNav(sections, lessons)}
  </nav>
</main>`;
}

function renderLessonFallback(lesson, section, prevLesson, nextLesson, sections, lessons) {
  const blocksHtml = lesson.blocks
    .map((block) => {
      if (block.type === 'paragraph') {
        return `<p>${renderInlineHtml(block.text)}</p>`;
      }
      if (block.type === 'heading') {
        return `<h2 style="margin-top:20px;color:#f4f4f5">${escapeHtml(block.text)}</h2>`;
      }
      if (block.type === 'code') {
        const caption = block.caption ? `<figcaption style="font-size:12px;color:#8b8b96;margin-bottom:4px">${escapeHtml(block.caption)}</figcaption>` : '';
        return `<figure style="margin:14px 0">${caption}<pre style="background:#18181b;border:1px solid #2e2e34;border-radius:8px;padding:12px;overflow-x:auto"><code>${escapeHtml(block.code)}</code></pre></figure>`;
      }
      if (block.type === 'list') {
        return `<ul>${block.items.map((item) => `<li>${renderInlineHtml(item)}</li>`).join('')}</ul>`;
      }
      if (block.type === 'note') {
        const heading = block.title ? `<strong>${escapeHtml(block.title)}:</strong> ` : '';
        return `<aside style="background:#27272c;border:1px solid #2e2e34;border-radius:8px;padding:12px;margin:14px 0">${heading}${renderInlineHtml(block.text)}</aside>`;
      }
      return '';
    })
    .join('\n');

  const challengeFns = lesson.challenge.functions
    .map((fn) => `<li><code>${escapeHtml(fn.signature)}</code> — ${renderInlineHtml(fn.description)}</li>`)
    .join('');

  const challengeNotes =
    lesson.challenge.notes && lesson.challenge.notes.length > 0
      ? lesson.challenge.notes.map((n) => `<p>${renderInlineHtml(n)}</p>`).join('')
      : '';

  const prevLink = prevLesson
    ? `<a href="/lessons/${encodeURIComponent(prevLesson.id)}" style="color:#82b2ff">&larr; Previous: ${escapeHtml(prevLesson.title)}</a>`
    : '<span></span>';
  const nextLink = nextLesson
    ? `<a href="/lessons/${encodeURIComponent(nextLesson.id)}" style="color:#82b2ff">Next: ${escapeHtml(nextLesson.title)} &rarr;</a>`
    : '<span></span>';

  return `<main style="height:100%;overflow-y:auto;padding:32px 24px;max-width:860px;margin:0 auto;color:#c4c4cc;font-family:system-ui,-apple-system,sans-serif;line-height:1.65">
  <nav aria-label="Breadcrumb" style="font-size:13px;color:#8b8b96;margin-bottom:12px">
    <a href="/" style="color:#82b2ff;text-decoration:none">Python for Coding Interviews</a> &rsaquo;
    <span>Section ${section.number}: ${escapeHtml(section.shortTitle)}</span> &rsaquo;
    <span>${escapeHtml(lesson.title)}</span>
  </nav>
  <article>
    <h1 style="margin:0 0 16px;font-size:28px;color:#f4f4f5">${escapeHtml(lesson.title)}</h1>
    ${blocksHtml}
    <section style="margin-top:24px">
      <h2 style="color:#f4f4f5">Challenge</h2>
      <p>${renderInlineHtml(lesson.challenge.intro)}</p>
      <ul>${challengeFns}</ul>
      ${challengeNotes}
    </section>
    <section style="margin-top:24px">
      <h2 style="color:#f4f4f5">Time and Space Complexity</h2>
      <ul>
        <li><strong>Time:</strong> ${renderInlineHtml(lesson.complexity.time)}</li>
        <li><strong>Space:</strong> ${renderInlineHtml(lesson.complexity.space)}</li>
      </ul>
      ${lesson.complexity.note ? `<p><em>Note:</em> ${renderInlineHtml(lesson.complexity.note)}</p>` : ''}
    </section>
  </article>
  <nav aria-label="Lesson Navigation" style="display:flex;justify-content:space-between;margin:28px 0;padding-top:16px;border-top:1px solid #2e2e34">
    ${prevLink}
    ${nextLink}
  </nav>
  <nav aria-label="All Course Lessons" style="margin-top:32px;padding-top:20px;border-top:1px solid #2e2e34">
    <h2 style="margin:0 0 16px;font-size:18px;color:#f4f4f5">All Lessons</h2>
    ${renderCurriculumNav(sections, lessons)}
  </nav>
</main>`;
}

try {
  await esbuild.build({
    entryPoints: {
      course: path.join(rootDir, 'src', 'data', 'index.ts'),
      seo: path.join(rootDir, 'src', 'lib', 'seo.ts'),
    },
    bundle: true,
    format: 'esm',
    outdir: tmpDir,
    outExtension: { '.js': '.mjs' },
  });

  const { LESSONS, SECTIONS, getSectionById } = await import(path.join(tmpDir, 'course.mjs'));
  const {
    SITE_URL,
    SITE_NAME,
    DEFAULT_TITLE,
    DEFAULT_DESCRIPTION,
    OG_IMAGE_URL,
    lessonTitle,
    lessonDescription,
    lessonCanonicalUrl,
    buildLessonJsonLd,
  } = await import(path.join(tmpDir, 'seo.mjs'));

  const baseTemplate = fs.readFileSync(templatePath, 'utf8');

  // 1. Enhance dist/index.html with Course + WebApplication JSON-LD and crawlable curriculum links.
  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Course',
        name: SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        url: `${SITE_URL}/`,
        image: OG_IMAGE_URL,
        inLanguage: 'en',
        isAccessibleForFree: true,
        educationalLevel: 'Beginner to Intermediate',
        teaches: SECTIONS.map((s) => s.shortTitle),
        author: {
          '@type': 'Person',
          name: 'Evgeny Levin',
        },
        provider: {
          '@type': 'Person',
          name: 'Evgeny Levin',
          url: SITE_URL,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          courseWorkload: 'PT6H',
        },
        numberOfCredits: 0,
        offers: {
          '@type': 'Offer',
          price: 0,
          priceCurrency: 'USD',
          category: 'Free',
        },
      },
      {
        '@type': 'WebApplication',
        name: DEFAULT_TITLE,
        url: `${SITE_URL}/`,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Any (Web Browser)',
        offers: {
          '@type': 'Offer',
          price: 0,
          priceCurrency: 'USD',
        },
      },
    ],
  };

  let homeHtml = replaceExactlyOnce(
    baseTemplate,
    /<\/head>/,
    `    <script type="application/ld+json">${escapeJsonLd(homeJsonLd)}</script>\n  </head>`,
    'home </head>'
  );
  homeHtml = replaceExactlyOnce(
    homeHtml,
    /<div id="root"><\/div>/,
    `<div id="root">${renderHomeFallback(SECTIONS, LESSONS, DEFAULT_DESCRIPTION)}</div>`,
    'home #root'
  );
  fs.writeFileSync(templatePath, homeHtml, 'utf8');

  // 2. Pre-render dist/lessons/<id>.html for every lesson.
  const lessonsOutDir = path.join(distDir, 'lessons');
  fs.mkdirSync(lessonsOutDir, { recursive: true });

  for (let i = 0; i < LESSONS.length; i++) {
    const lesson = LESSONS[i];
    const section = getSectionById(lesson.sectionId);
    const prevLesson = i > 0 ? LESSONS[i - 1] : null;
    const nextLesson = i < LESSONS.length - 1 ? LESSONS[i + 1] : null;

    const title = lessonTitle(lesson);
    const description = lessonDescription(lesson, section);
    const canonical = lessonCanonicalUrl(lesson.id);
    const lessonJsonLd = buildLessonJsonLd(lesson, section);

    let pageHtml = baseTemplate;
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(title)}</title>`,
      `title (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${escapeAttr(description)}" />`,
      `description (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
      `canonical (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:type" content="article" />`,
      `og:type (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${escapeAttr(title)}" />`,
      `og:title (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${escapeAttr(description)}" />`,
      `og:description (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
      `og:url (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
      `twitter:title (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
      `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
      `twitter:description (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<\/head>/,
      `    <script type="application/ld+json">${escapeJsonLd(lessonJsonLd)}</script>\n  </head>`,
      `json-ld (${lesson.id})`
    );
    pageHtml = replaceExactlyOnce(
      pageHtml,
      /<div id="root"><\/div>/,
      `<div id="root">${renderLessonFallback(lesson, section, prevLesson, nextLesson, SECTIONS, LESSONS)}</div>`,
      `#root (${lesson.id})`
    );

    fs.writeFileSync(path.join(lessonsOutDir, `${lesson.id}.html`), pageHtml, 'utf8');
  }

  // 3. Generate dist/sitemap.xml covering `/` and all lesson pages.
  const urlEntries = [
    { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    ...LESSONS.map((lesson) => ({
      loc: lessonCanonicalUrl(lesson.id),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries
  .map(
    (entry) => `  <url>
    <loc>${escapeHtml(entry.loc)}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');

  console.log(
    `[generate-seo] Pre-rendered index.html + ${LESSONS.length} lesson pages and generated sitemap.xml (${urlEntries.length} URLs).`
  );
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
