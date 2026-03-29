import { LitElement, html } from 'lit';
import { StoreController, applyDesktopSectionsState, setMobilePanelState } from '../utils/store.js';
import { getChapterById } from '../content/index.js';
import { navigateTo, scrollToSection, suppressScrollSync } from '../utils/router.js';

class SectionsPanel extends LitElement {
  createRenderRoot() { return this; }

  private _store = new StoreController(this);

  render() {
    const { chapterId, sectionSlug, currentSections } = this._store.state;
    const chapter = getChapterById(chapterId);
    const sections = currentSections.length > 0 ? currentSections : chapter?.sections ?? [];
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!chapter || sections.length === 0) return html``;

    return html`
      <div class="sections-panel-inner">
        ${isMobile ? null : html`
          <div class="sections-panel-title">
            <span>On this page</span>
            <button
              class="sections-panel-close-btn"
              aria-label="收起目錄"
              @click=${this._closePanel}
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        `}
        <ul class="sections-list" role="list">
          ${sections.map((sec) => html`
            <li>
              <a
                class="section-item-link ${sectionSlug === sec.slug ? 'is-active' : ''}"
                href="#${chapter.slug}-${sec.slug}"
                @click=${(e: Event) => this._clickSection(e, chapterId, sec.slug)}
              >
                ${sec.title}
              </a>
            </li>
          `)}
        </ul>
      </div>
    `;
  }

  private _clickSection(e: Event, chapterId: number | string, sectionSlug: string) {
    e.preventDefault();
    suppressScrollSync();
    navigateTo(chapterId, sectionSlug, true);
    setTimeout(() => scrollToSection(sectionSlug), 50);
  }

  private _closePanel = () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMobilePanelState('closed');
      return;
    }
    applyDesktopSectionsState(true);
  };
}

customElements.define('sections-panel', SectionsPanel);
