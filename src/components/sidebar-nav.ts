import { LitElement, html } from 'lit';
import { StoreController } from '../utils/store.js';
import { navigateTo, scrollToSection, suppressScrollSync } from '../utils/router.js';
import { parts, chapters } from '../content/index.js';
import type { Chapter, Part } from '../types.js';

class SidebarNav extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    _openPartIds: { state: true },
    _openChapterIds: { state: true },
  };

  private _store = new StoreController(this);
  private _openPartIds: Set<number> = new Set([1]);
  private _openChapterIds: Set<number | string> = new Set();

  render() {
    const { chapterId, sectionSlug, currentSections } = this._store.state;

    // Auto-open the part containing the current chapter
    const currentChapter = chapters.find((c) => c.id === chapterId);
    if (currentChapter && !this._openPartIds.has(currentChapter.part)) {
      this._openPartIds = new Set([...this._openPartIds, currentChapter.part]);
    }
    if (chapterId !== undefined && !this._openChapterIds.has(chapterId)) {
      this._openChapterIds = new Set([...this._openChapterIds, chapterId]);
    }

    return html`
      <nav class="sidebar-nav" aria-label="章節導覽">
        ${parts.map((part) => this._renderPart(part, chapterId, sectionSlug, currentSections))}
      </nav>
    `;
  }

  private _renderPart(part: Part, currentChapterId: number | string, sectionSlug: string | null, currentSections: Chapter['sections']) {
    const isOpen = this._openPartIds.has(part.id);
    const partChapters = chapters.filter((ch) =>
      (part.chapters as (number | string)[]).includes(ch.id)
    );

    return html`
      <div class="nav-part ${isOpen ? 'is-open' : ''}">
        <button
          class="nav-part-header"
          aria-expanded="${isOpen}"
          @click=${() => this._togglePart(part.id)}
        >
          <span class="nav-part-label">${part.title}</span>
          <span class="nav-part-caret" aria-hidden="true">›</span>
        </button>
        <div class="nav-part-chapters">
          ${partChapters.map((ch) =>
            this._renderChapter(ch, ch.id === currentChapterId, sectionSlug, currentSections)
          )}
        </div>
      </div>
    `;
  }

  private _renderChapter(chapter: Chapter, isActive: boolean, sectionSlug: string | null, currentSections: Chapter['sections']) {
    const hasOpen = this._openChapterIds.has(chapter.id) && isActive;
    const sections = isActive && currentSections.length > 0 ? currentSections : chapter.sections;
    const chNum = typeof chapter.id === 'number'
      ? `${chapter.id}.`
      : chapter.isAppendix ? '' : '';

    return html`
      <div class="nav-chapter-item ${hasOpen ? 'is-open' : ''}">
        <button
          class="nav-chapter-btn ${isActive ? 'is-active' : ''}"
          @click=${(e: Event) => this._clickChapter(e, chapter)}
          title="${chapter.title}"
        >
          ${chNum ? html`<span class="nav-chapter-num">${chNum}</span>` : ''}
          <span class="nav-chapter-title">${chapter.title}</span>
          ${sections.length > 0
            ? html`<span class="nav-chapter-caret" aria-hidden="true">›</span>`
            : ''}
        </button>
        ${isActive && sections.length > 0 ? html`
          <ul class="nav-section-list" role="list">
            ${sections.map((sec) => html`
              <li>
                <a
                  class="nav-section-link ${isActive && sectionSlug === sec.slug ? 'is-active' : ''}"
                  href="#${chapter.slug}-${sec.slug}"
                  @click=${(e: Event) => this._clickSection(e, chapter, sec.slug)}
                >
                  ${sec.title}
                </a>
              </li>
            `)}
          </ul>
        ` : ''}
      </div>
    `;
  }

  private _togglePart(partId: number) {
    const next = new Set(this._openPartIds);
    if (next.has(partId)) next.delete(partId);
    else next.add(partId);
    this._openPartIds = next;
  }

  private _clickChapter(e: Event, chapter: Chapter) {
    e.preventDefault();
    navigateTo(chapter.id, null, true);

    const next = new Set(this._openChapterIds);
    if (next.has(chapter.id)) next.delete(chapter.id);
    else {
      next.clear();
      next.add(chapter.id);
    }
    this._openChapterIds = next;
  }

  private _clickSection(e: Event, chapter: Chapter, sectionSlug: string) {
    e.preventDefault();
    suppressScrollSync();
    navigateTo(chapter.id, sectionSlug, true);
    setTimeout(() => scrollToSection(sectionSlug), 50);
  }
}

customElements.define('sidebar-nav', SidebarNav);
