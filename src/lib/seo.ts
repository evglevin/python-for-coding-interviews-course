import type { Lesson, Section } from '../types/course';

export const SITE_URL = 'https://python.evgenylevin.com';
export const SITE_NAME = 'Python for Coding Interviews';
export const DEFAULT_TITLE = 'Python for Coding Interviews — Interactive Course';
export const DEFAULT_DESCRIPTION =
  'A fast, interactive Python crash course to prepare for coding interviews: 40 hands-on lessons covering the essential syntax, data structures, and idioms.';
export const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;
export const OG_IMAGE_ALT =
  'Python for Coding Interviews — Interactive crash course with 40 hands-on lessons covering essential Python syntax, data structures, and idioms in the browser';

/** Strips lightweight inline markdown (`code`, **bold**, *italic*) for plain-text metadata. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.replace(/[,;:\-—\s]+$/, '')}…`;
}

export function lessonTitle(lesson: Pick<Lesson, 'title'>): string {
  return `${lesson.title} — ${SITE_NAME}`;
}

export function lessonCanonicalUrl(lessonId: string): string {
  return `${SITE_URL}/lessons/${encodeURIComponent(lessonId)}`;
}

/** Builds a concise, natural meta description (target 120–155 chars) from lesson content. */
export function lessonDescription(lesson: Lesson, section: Section): string {
  const paragraphs = lesson.blocks
    .filter((b): b is { type: 'paragraph'; text: string } => b.type === 'paragraph')
    .map((b) => stripInlineMarkdown(b.text))
    .filter(Boolean);

  const first = paragraphs[0] ?? '';
  const suffix = ` Interactive Python lesson in ${section.shortTitle} with in-browser editor and unit tests.`;

  if (!first) {
    return truncateAtWord(
      `Learn ${lesson.title} in Python for coding interviews.${suffix}`,
      155
    );
  }
  if (first.length >= 115) {
    return truncateAtWord(first, 155);
  }
  const combined = `${first}${suffix}`;
  if (combined.length <= 160) return combined;
  if (paragraphs[1]) {
    return truncateAtWord(`${first} ${paragraphs[1]}`, 155);
  }
  return truncateAtWord(combined, 155);
}

export function buildLessonJsonLd(lesson: Lesson, section: Section) {
  const title = lessonTitle(lesson);
  const description = lessonDescription(lesson, section);
  const canonical = lessonCanonicalUrl(lesson.id);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LearningResource',
        name: lesson.title,
        headline: title,
        description,
        url: canonical,
        image: OG_IMAGE_URL,
        inLanguage: 'en',
        isAccessibleForFree: true,
        learningResourceType: 'Interactive programming lesson',
        educationalUse: 'Coding interview preparation',
        teaches: section.shortTitle,
        position: lesson.index + 1,
        isPartOf: {
          '@type': 'Course',
          name: SITE_NAME,
          url: `${SITE_URL}/`,
        },
        author: {
          '@type': 'Person',
          name: 'Evgeny Levin',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: SITE_NAME,
            item: `${SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: lesson.title,
            item: canonical,
          },
        ],
      },
    ],
  };
}

function setMetaContent(selector: string, content: string): void {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

/** Keeps document title, description, canonical, social tags, and JSON-LD synced during SPA navigation. */
export function updateDocumentSeo(lesson: Lesson, section: Section): void {
  if (typeof document === 'undefined') return;
  const title = lessonTitle(lesson);
  const description = lessonDescription(lesson, section);
  const url = lessonCanonicalUrl(lesson.id);

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:type"]', 'article');
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', url);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url);

  let ldScript = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (!ldScript) {
    ldScript = document.createElement('script');
    ldScript.type = 'application/ld+json';
    document.head.appendChild(ldScript);
  }
  ldScript.textContent = JSON.stringify(buildLessonJsonLd(lesson, section));
}
