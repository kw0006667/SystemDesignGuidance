import { LitElement, html } from 'lit';
import { appState, StoreController } from '../utils/store.js';
import { getAvailableLocales, t } from '../i18n/index.js';
import type { Locale } from '../types.js';

class LangSelector extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    _open: { state: true },
  };

  private _open = false;
  private _store = new StoreController(this);

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onKeyDown);
  }

  private _onDocClick = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) this._open = false;
  };

  private _onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this._open = false;
  };

  render() {
    const { locale } = this._store.state;
    const locales = getAvailableLocales();
    const hasMultiple = locales.length > 1;
    const localeKey = `lang.${locale.toLowerCase().replace('-', '_')}`;

    return html`
      <div class="lang-menu-wrap ${this._open ? 'is-open' : ''}">
        <button
          class="lang-trigger"
          aria-haspopup="true"
          aria-expanded="${this._open}"
          ?disabled=${!hasMultiple}
          @click=${this._toggle}
        >
          <span>${t(localeKey)}</span>
          ${hasMultiple ? html`<span class="lang-caret" aria-hidden="true">▾</span>` : ''}
        </button>
        ${this._open ? html`
          <div class="lang-dropdown" role="menu">
            ${locales.map((loc) => html`
              <button
                class="lang-option ${loc === locale ? 'is-active' : ''}"
                role="menuitemradio"
                aria-checked="${loc === locale}"
                @click=${() => this._select(loc)}
              >
                ${t(`lang.${loc.toLowerCase().replace('-', '_')}`)}
              </button>
            `)}
          </div>
        ` : ''}
      </div>
    `;
  }

  private _toggle() {
    const locales = getAvailableLocales();
    if (locales.length > 1) this._open = !this._open;
  }

  private _select(locale: Locale) {
    appState.setState({ locale });
    this._open = false;
  }
}

customElements.define('lang-selector', LangSelector);
