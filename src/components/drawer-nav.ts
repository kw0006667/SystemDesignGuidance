import { LitElement, html } from 'lit';
import { StoreController, setMobilePanelState } from '../utils/store.js';
import { navigateTo } from '../utils/router.js';
import { parts, chapters } from '../content/index.js';

class DrawerNav extends LitElement {
  createRenderRoot() { return this; }

  private _store = new StoreController(this);

  render() {
    const { chapterId } = this._store.state;

    return html`
      <nav class="drawer-nav" aria-label="章節導覽（手機）">
        ${parts.map((part) => {
          const partChapters = chapters.filter((ch) =>
            (part.chapters as (number | string)[]).includes(ch.id)
          );
          return html`
            <div class="drawer-part-label">${part.title}</div>
            ${partChapters.map((ch) => html`
              <a
                class="drawer-chapter-link ${ch.id === chapterId ? 'is-active' : ''}"
                href="#${ch.slug}"
                @click=${(e: Event) => this._clickChapter(e, ch.id)}
              >
                ${typeof ch.id === 'number' ? html`<span class="nav-chapter-num">${ch.id}.</span>` : ''}
                <span>${ch.title}</span>
              </a>
            `)}
          `;
        })}
      </nav>
    `;
  }

  private _clickChapter(e: Event, chapterId: number | string) {
    e.preventDefault();
    navigateTo(chapterId, null, true);
    setMobilePanelState('closed');
  }
}

customElements.define('drawer-nav', DrawerNav);
