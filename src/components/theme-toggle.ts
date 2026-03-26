import { LitElement, html } from 'lit';
import { StoreController } from '../utils/store.js';
import { toggleTheme } from '../utils/theme.js';

class ThemeToggle extends LitElement {
  createRenderRoot() { return this; }

  private _store = new StoreController(this);

  render() {
    const { theme } = this._store.state;
    const isDark = theme === 'dark';
    const label = isDark ? '切換至淺色模式' : '切換至深色模式';
    return html`
      <button
        class="theme-toggle-btn icon-btn"
        aria-label="${label}"
        title="${label}"
        @click=${toggleTheme}
      >
        <span aria-hidden="true">${isDark ? '☀' : '☾'}</span>
      </button>
    `;
  }
}

customElements.define('theme-toggle', ThemeToggle);
