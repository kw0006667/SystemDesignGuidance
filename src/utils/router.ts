import { chapters, getChapterById } from '../content/index.js';
import { appState } from './store.js';
import type { Chapter } from '../types.js';

const VALID_SLUGS = new Set(chapters.map((ch) => ch.slug));

let _scrollSyncEnabled = true;
let _scrollSyncTimer: ReturnType<typeof setTimeout> | null = null;
let _removeScrollSync: (() => void) | null = null;

function _isMobileLayout(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

function _getMobileScrollOffset(): number {
  const rootStyle = getComputedStyle(document.documentElement);
  const topbarHeight = Number.parseFloat(rootStyle.getPropertyValue('--topbar-height')) || 52;
  return topbarHeight + 24;
}

export function initRouter(): void {
  window.addEventListener('hashchange', _onHashChange);
  _onHashChange();
}

function _onHashChange(): void {
  const hash = window.location.hash.slice(1);
  const parsed = parseHash(hash);
  if (!parsed) {
    navigateTo(1, null, false);
    return;
  }
  navigateTo(parsed.chapterId, parsed.sectionSlug, false);
}

export function parseHash(hash: string): { chapterId: number | string; sectionSlug: string | null } | null {
  if (!hash) return null;

  // Appendix: appendix-a, appendix-b, appendix-a-section-slug
  const appendixMatch = hash.match(/^(appendix-[ab])(?:-(.+))?$/);
  if (appendixMatch) {
    const slug = appendixMatch[1];
    if (VALID_SLUGS.has(slug)) {
      const ch = chapters.find((c) => c.slug === slug);
      if (ch) return { chapterId: ch.id, sectionSlug: appendixMatch[2] ?? null };
    }
  }

  // Chapter: chapter-N, chapter-N-section-slug
  const chapterMatch = hash.match(/^(chapter-\d+)(?:-(.+))?$/);
  if (chapterMatch) {
    const slug = chapterMatch[1];
    if (VALID_SLUGS.has(slug)) {
      const ch = chapters.find((c) => c.slug === slug);
      if (ch) return { chapterId: ch.id, sectionSlug: chapterMatch[2] ?? null };
    }
  }

  return null;
}

export function navigateTo(
  chapterId: number | string,
  sectionSlug: string | null = null,
  updateHash = true
): void {
  const chapter = getChapterById(chapterId);
  if (!chapter) return;

  appState.setState({ chapterId, sectionSlug });

  if (updateHash) {
    const newHash = sectionSlug ? `${chapter.slug}-${sectionSlug}` : chapter.slug;
    history.pushState(null, '', `#${newHash}`);
  }
}

// ============================================================
// Scroll Sync — keeps hash updated as user scrolls
// ============================================================
export function setupScrollSync(chapter: Chapter): void {
  const contentArea = document.getElementById('content-area');
  const sectionElements = Array.from(
    document.querySelectorAll<HTMLElement>('#chapter-main-content section[id]')
  );
  _removeScrollSync?.();
  if (!contentArea || sectionElements.length === 0) return;

  let rafId: number | null = null;

  const syncActiveSection = (): void => {
    if (!_scrollSyncEnabled) return;

    const isMobile = _isMobileLayout();
    const containerTop = isMobile ? 0 : contentArea.getBoundingClientRect().top;
    const activationOffset = isMobile ? _getMobileScrollOffset() : 120;
    let currentSlug = sectionElements[0]?.id ?? null;
    for (const el of sectionElements) {
      const relativeTop = el.getBoundingClientRect().top - containerTop;
      if (relativeTop <= activationOffset) {
        currentSlug = el.id;
      } else {
        break;
      }
    }

    if (currentSlug && currentSlug !== appState.state.sectionSlug) {
      appState.setState({ sectionSlug: currentSlug });
      const newHash = `${chapter.slug}-${currentSlug}`;
      history.replaceState(null, '', `#${newHash}`);
    }
  };

  const onScroll = (): void => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      syncActiveSection();
    });
  };

  contentArea.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  _removeScrollSync = () => {
    contentArea.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
    _removeScrollSync = null;
  };
  syncActiveSection();
}

export function suppressScrollSync(duration = 700): void {
  _scrollSyncEnabled = false;
  if (_scrollSyncTimer) clearTimeout(_scrollSyncTimer);
  _scrollSyncTimer = setTimeout(() => {
    _scrollSyncEnabled = true;
  }, duration);
}

export function scrollToContentPosition(top: number, behavior: ScrollBehavior = 'smooth'): void {
  const contentArea = document.getElementById('content-area');
  if (_isMobileLayout()) {
    window.scrollTo({ top, behavior });
    return;
  }
  contentArea?.scrollTo({ top, behavior });
}

export function scrollToSection(sectionSlug: string, behavior: ScrollBehavior = 'smooth'): void {
  const el = document.getElementById(sectionSlug);
  if (!el) return;

  if (_isMobileLayout()) {
    const top = el.getBoundingClientRect().top + window.scrollY - _getMobileScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }

  const contentArea = document.getElementById('content-area');
  if (!contentArea) return;
  contentArea.scrollTo({ top: Math.max(0, el.offsetTop - 24), behavior });
}
