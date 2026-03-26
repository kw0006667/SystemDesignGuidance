import { LitElement, html, css } from 'lit';

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3)  return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes.toFixed(0)} B`;
}

function formatNum(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(0);
}

class CapacityCalc extends LitElement {
  static properties = {
    label:         { type: String, attribute: 'data-label' },
    dau:           { type: Number, attribute: 'data-default-dau' },
    writesPerUser: { type: Number, attribute: 'data-write-per-user' },
    readsPerUser:  { type: Number, attribute: 'data-read-per-user' },
    avgBytes:      { type: Number, attribute: 'data-avg-record-bytes' },
    _dau:          { state: true },
    _writes:       { state: true },
    _reads:        { state: true },
    _bytes:        { state: true },
  };

  static styles = css`
    :host { display: block; margin: 24px 0; }

    .calc-wrap {
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .calc-header {
      background: var(--color-accent-soft);
      border-bottom: 1px solid var(--color-accent-border);
      padding: 10px 16px;
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--color-accent);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .calc-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }

    @media (max-width: 600px) {
      .calc-body { grid-template-columns: 1fr; }
    }

    .calc-inputs {
      padding: 16px;
      border-right: 1px solid var(--color-border);
    }

    @media (max-width: 600px) {
      .calc-inputs { border-right: none; border-bottom: 1px solid var(--color-border); }
    }

    .calc-outputs {
      padding: 16px;
    }

    .field {
      margin-bottom: 14px;
    }

    .field label {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--color-text-secondary);
      margin-bottom: 4px;
      font-family: var(--font-ui);
    }

    .field .val {
      font-weight: 700;
      color: var(--color-accent);
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--color-accent);
      cursor: pointer;
    }

    .result-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .result-item {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 10px 12px;
    }

    .result-label {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      font-family: var(--font-ui);
    }

    .result-value {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--color-accent);
      font-family: var(--font-mono);
    }
  `;

  label: string = '容量估算計算器';
  dau: number = 10_000_000;
  writesPerUser: number = 2;
  readsPerUser: number = 10;
  avgBytes: number = 500;

  private _dau: number = 10_000_000;
  private _writes: number = 2;
  private _reads: number = 10;
  private _bytes: number = 500;

  connectedCallback() {
    super.connectedCallback();
    this._dau = this.dau || 10_000_000;
    this._writes = this.writesPerUser || 2;
    this._reads = this.readsPerUser || 10;
    this._bytes = this.avgBytes || 500;
  }

  render() {
    const writeQps = (this._dau * this._writes) / 86400;
    const readQps  = (this._dau * this._reads)  / 86400;
    const storageDay  = this._dau * this._writes * this._bytes;
    const storageYear = storageDay * 365;

    return html`
      <div class="calc-wrap">
        <div class="calc-header">
          <span>📊</span>
          <span>${this.label || '容量估算計算器'}</span>
        </div>
        <div class="calc-body">
          <div class="calc-inputs">
            ${this._slider('日活躍用戶（DAU）', this._dau, 100_000, 1_000_000_000,
              formatNum(this._dau),
              (v) => { this._dau = v; this.requestUpdate(); })}
            ${this._slider('每用戶每日寫入次數', this._writes, 1, 100,
              String(this._writes),
              (v) => { this._writes = v; this.requestUpdate(); })}
            ${this._slider('每用戶每日讀取次數', this._reads, 1, 1000,
              String(this._reads),
              (v) => { this._reads = v; this.requestUpdate(); })}
            ${this._slider('平均記錄大小（Bytes）', this._bytes, 100, 100_000,
              formatBytes(this._bytes),
              (v) => { this._bytes = v; this.requestUpdate(); })}
          </div>
          <div class="calc-outputs">
            <div class="result-grid">
              ${this._result('Write QPS', writeQps.toFixed(0))}
              ${this._result('Read QPS', readQps.toFixed(0))}
              ${this._result('每日儲存量', formatBytes(storageDay))}
              ${this._result('每年儲存量', formatBytes(storageYear))}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private _slider(
    label: string,
    value: number,
    min: number,
    max: number,
    display: string,
    onChange: (v: number) => void
  ) {
    return html`
      <div class="field">
        <label>
          <span>${label}</span>
          <span class="val">${display}</span>
        </label>
        <input
          type="range"
          .value=${String(value)}
          min=${min}
          max=${max}
          step=${Math.max(1, Math.floor((max - min) / 100))}
          @input=${(e: Event) => onChange(Number((e.target as HTMLInputElement).value))}
        />
      </div>
    `;
  }

  private _result(label: string, value: string) {
    return html`
      <div class="result-item">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
  }
}

customElements.define('capacity-calc', CapacityCalc);
