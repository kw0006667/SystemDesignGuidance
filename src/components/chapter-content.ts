import { LitElement, html } from 'lit';
import { StoreController, appState } from '../utils/store.js';
import { getChapterById, getPartForChapter, getPrevNext } from '../content/index.js';
import { setupScrollSync } from '../utils/router.js';
import type { ChapterContent as ChapterContentData, Section } from '../types.js';

// Lazy-load map — each chapter is its own Vite chunk
const CHAPTER_MODULES: Record<string | number, () => Promise<{ default: ChapterContentData }>> = {
  1:  () => import('../content/zh-TW/ch01.js'),
  2:  () => import('../content/zh-TW/ch02.js'),
  3:  () => import('../content/zh-TW/ch03.js'),
  4:  () => import('../content/zh-TW/ch04.js'),
  5:  () => import('../content/zh-TW/ch05.js'),
  6:  () => import('../content/zh-TW/ch06.js'),
  7:  () => import('../content/zh-TW/ch07.js'),
  8:  () => import('../content/zh-TW/ch08.js'),
  9:  () => import('../content/zh-TW/ch09.js'),
  10: () => import('../content/zh-TW/ch10.js'),
  11: () => import('../content/zh-TW/ch11.js'),
  12: () => import('../content/zh-TW/ch12.js'),
  13: () => import('../content/zh-TW/ch13.js'),
  14: () => import('../content/zh-TW/ch14.js'),
  15: () => import('../content/zh-TW/ch15.js'),
  16: () => import('../content/zh-TW/ch16.js'),
  17: () => import('../content/zh-TW/ch17.js'),
  18: () => import('../content/zh-TW/ch18.js'),
  19: () => import('../content/zh-TW/ch19.js'),
  20: () => import('../content/zh-TW/ch20.js'),
  21: () => import('../content/zh-TW/ch21.js'),
  22: () => import('../content/zh-TW/ch22.js'),
  23: () => import('../content/zh-TW/ch23.js'),
  24: () => import('../content/zh-TW/ch24.js'),
  25: () => import('../content/zh-TW/ch25.js'),
  26: () => import('../content/zh-TW/ch26.js'),
  27: () => import('../content/zh-TW/ch27.js'),
  28: () => import('../content/zh-TW/ch28.js'),
  29: () => import('../content/zh-TW/ch29.js'),
  30: () => import('../content/zh-TW/ch30.js'),
  31: () => import('../content/zh-TW/ch31.js'),
  32: () => import('../content/zh-TW/ch32.js'),
  33: () => import('../content/zh-TW/ch33.js'),
  appA: () => import('../content/zh-TW/appendix-a.js'),
  appB: () => import('../content/zh-TW/appendix-b.js'),
};

const DIFFICULTY_LABELS: Record<string, string> = {
  'entry': 'Entry Level',
  'junior-mid': 'Junior → Mid',
  'mid-senior': 'Mid → Senior',
  'senior': 'Senior',
  'senior-staff': 'Senior → Staff',
  'staff': 'Staff',
};

class ChapterContent extends LitElement {
  createRenderRoot() { return this; }

  private _store = new StoreController(this);
  private _loadedChapterId: number | string | null = null;

  render() {
    return html`
      <div id="content-area">
        <div id="content-body">
          <div class="loading-spinner">
            <div class="spinner-ring"></div>
            <span>載入中…</span>
          </div>
        </div>
      </div>
    `;
  }

  updated() {
    const { chapterId } = this._store.state;
    if (chapterId !== this._loadedChapterId) {
      this._loadedChapterId = chapterId;
      this._loadChapter(chapterId);
    }
  }

  private async _loadChapter(chapterId: number | string): Promise<void> {
    const contentBody = this.querySelector<HTMLElement>('#content-body');
    if (!contentBody) return;

    // Show spinner
    contentBody.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <span>載入中…</span>
      </div>
    `;

    try {
      const loader = CHAPTER_MODULES[chapterId];
      if (!loader) throw new Error(`No module for chapter ${chapterId}`);

      const [mod, chapter, part, prevNext] = await Promise.all([
        loader(),
        Promise.resolve(getChapterById(chapterId)),
        Promise.resolve(getPartForChapter(chapterId)),
        Promise.resolve(getPrevNext(chapterId)),
      ]);

      if (!chapter) throw new Error('Chapter metadata not found');

      const difficultyClass = chapter.difficulty ? `difficulty-${chapter.difficulty}` : '';
      const difficultyLabel = chapter.difficulty ? DIFFICULTY_LABELS[chapter.difficulty] : '';

      contentBody.innerHTML = `
        <div class="chapter-header">
          <div class="chapter-breadcrumb">
            <span>${part?.title ?? ''}</span>
          </div>
          <h1 class="chapter-title">${mod.default.title}</h1>
          ${difficultyLabel ? `<span class="chapter-difficulty ${difficultyClass}">${difficultyLabel}</span>` : ''}
        </div>
        <div id="chapter-main-content">
          ${mod.default.content}
        </div>
        <nav-footer></nav-footer>
      `;

      const currentSections = this._extractSections(contentBody);
      appState.setState({ currentSections });

      // Set prev/next on nav-footer
      const navFooter = contentBody.querySelector('nav-footer') as any;
      if (navFooter) {
        navFooter.prev = prevNext.prev;
        navFooter.next = prevNext.next;
      }

      // Wrap bare tables in scroll container
      this._wrapTables(contentBody);

      // Add copy buttons to code blocks
      this._addCopyButtons(contentBody);

      // Syntax highlight
      this._highlightCode(contentBody);

      // Update document title
      document.title = `${mod.default.title} — 系統設計實戰手冊`;

      // Scroll to section if needed, then setup scroll sync
      const { sectionSlug } = this._store.state;
      if (sectionSlug) {
        setTimeout(() => {
          const el = document.getElementById(sectionSlug);
          if (el) {
            const area = this.querySelector<HTMLElement>('#content-area');
            if (area) area.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
          }
        }, 100);
      } else {
        const area = this.querySelector<HTMLElement>('#content-area');
        if (area) area.scrollTo({ top: 0 });
      }

      // Setup scroll sync
      setupScrollSync(chapter);

    } catch (err) {
      console.error('Failed to load chapter:', err);
      contentBody.innerHTML = `
        <div class="chapter-header">
          <p style="color: var(--color-text-muted); text-align:center; padding: 60px 20px;">
            章節載入失敗，請重新整理頁面。
          </p>
        </div>
      `;
    }
  }

  private _extractSections(root: HTMLElement): Section[] {
    return Array.from(root.querySelectorAll<HTMLElement>('#chapter-main-content section[id]'))
      .map((sectionEl) => {
        const heading = sectionEl.querySelector('h2');
        const title = heading?.textContent?.trim() ?? '';
        return {
          slug: sectionEl.id,
          title: title || sectionEl.id,
        };
      })
      .filter((section) => section.slug);
  }

  private _wrapTables(root: HTMLElement): void {
    root.querySelectorAll('table').forEach((table) => {
      if (table.parentElement?.classList.contains('table-scroll')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'table-scroll';
      table.parentNode!.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  private _addCopyButtons(root: HTMLElement): void {
    root.querySelectorAll('pre').forEach((pre) => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '複製';
      btn.setAttribute('aria-label', '複製程式碼');
      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code?.textContent ?? pre.textContent ?? '';
        try {
          await navigator.clipboard.writeText(text);
          btn.textContent = '已複製';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.textContent = '複製';
            btn.classList.remove('copied');
          }, 2000);
        } catch {
          btn.textContent = '失敗';
          setTimeout(() => { btn.textContent = '複製'; }, 2000);
        }
      });
      pre.style.position = 'relative';
      pre.appendChild(btn);
    });
  }

  private _highlightCode(root: HTMLElement): void {
    const Prism = (window as any).Prism;
    if (Prism?.highlightAllUnder) {
      Prism.highlightAllUnder(root);
    }
  }
}

customElements.define('chapter-content', ChapterContent);
