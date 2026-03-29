import { LitElement, css, html } from 'lit';

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
  static properties = {
    type: { type: String },
    title: { type: String },
  };

  static styles = css`
    :host {
      display: block;
    }

    .callout {
      padding: 14px 18px;
      border-radius: var(--radius);
      border-left: 4px solid;
      margin: 20px 0;
    }

    .callout-title {
      font-weight: 700;
      font-size: 0.85rem;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .callout-info {
      background: var(--color-callout-info-bg);
      border-color: var(--color-callout-info-border);
    }

    .callout-warning {
      background: var(--color-callout-warning-bg);
      border-color: var(--color-callout-warning-border);
    }

    .callout-tip {
      background: var(--color-callout-tip-bg);
      border-color: var(--color-callout-tip-border);
    }

    .callout-danger {
      background: var(--color-callout-danger-bg);
      border-color: var(--color-callout-danger-border);
    }

    .callout-info .callout-title {
      color: #2563eb;
    }

    .callout-warning .callout-title {
      color: #d97706;
    }

    .callout-tip .callout-title {
      color: var(--color-accent);
    }

    .callout-danger .callout-title {
      color: #dc2626;
    }

    :host-context(html[data-theme='dark']) .callout-info .callout-title {
      color: #60a5fa;
    }

    :host-context(html[data-theme='dark']) .callout-warning .callout-title {
      color: #fbbf24;
    }

    :host-context(html[data-theme='dark']) .callout-danger .callout-title {
      color: #f87171;
    }

    ::slotted(*:first-child) {
      margin-top: 0;
    }

    ::slotted(*:last-child) {
      margin-bottom: 0;
    }
  `;

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
