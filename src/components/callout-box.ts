import { LitElement, html } from 'lit';

const ICONS: Record<string, string> = {
  info: 'ℹ',
  warning: '⚠',
  tip: '💡',
  danger: '🚨',
};

const LABELS: Record<string, string> = {
  info: '資訊',
  warning: '注意',
  tip: '提示',
  danger: '危險',
};

class CalloutBox extends LitElement {
  createRenderRoot() { return this; }

  static properties = {
    type: { type: String },
    title: { type: String },
  };

  type: string = 'info';
  title: string = '';

  render() {
    const label = this.title || LABELS[this.type] || '';
    const icon = ICONS[this.type] ?? 'ℹ';

    return html`
      <div class="callout callout-${this.type}">
        <div class="callout-title">
          <span aria-hidden="true">${icon}</span>
          ${label}
        </div>
        <slot></slot>
      </div>
    `;
  }
}

customElements.define('callout-box', CalloutBox);
