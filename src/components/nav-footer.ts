import { LitElement, html } from 'lit';
import { navigateTo } from '../utils/router.js';
import type { Chapter } from '../types.js';

class NavFooter extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    prev: { type: Object },
    next: { type: Object },
  };

  prev: Chapter | null = null;
  next: Chapter | null = null;

  render() {
    if (!this.prev && !this.next) return html``;

    return html`
      <nav class="chapter-nav-footer" aria-label="章節前後導覽">
        ${this.prev ? html`
          <a
            class="chapter-nav-btn prev"
            href="#${this.prev.slug}"
            @click=${(e: Event) => this._go(e, this.prev!.id)}
          >
            <span class="chapter-nav-label">← 上一章</span>
            <span class="chapter-nav-title">${this.prev.title}</span>
          </a>
        ` : html`<div></div>`}
        ${this.next ? html`
          <a
            class="chapter-nav-btn next"
            href="#${this.next.slug}"
            @click=${(e: Event) => this._go(e, this.next!.id)}
          >
            <span class="chapter-nav-label">下一章 →</span>
            <span class="chapter-nav-title">${this.next.title}</span>
          </a>
        ` : html`<div></div>`}
      </nav>
    `;
  }

  private _go(e: Event, chapterId: number | string) {
    e.preventDefault();
    navigateTo(chapterId, null, true);
    const contentArea = document.getElementById('content-area');
    if (contentArea) contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

customElements.define('nav-footer', NavFooter);
