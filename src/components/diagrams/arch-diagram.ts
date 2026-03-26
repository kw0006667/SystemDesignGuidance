import { LitElement, html, svg, css } from 'lit';

interface DiagramNode {
  id: string;
  label: string;
  type: 'client' | 'server' | 'database' | 'cache' | 'loadbalancer' | 'queue' | 'storage' | 'agent' | 'gateway';
  x: number;
  y: number;
  w?: number;
  h?: number;
}

interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  bidirectional?: boolean;
}

interface DiagramDef {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewBox?: string;
}

const NODE_W = 100;
const NODE_H = 44;

// Shape renderers per type
function renderNodeShape(node: DiagramNode, w: number, h: number, isHovered: boolean) {
  const fill = 'var(--color-bg-elevated)';
  const stroke = isHovered ? 'var(--color-accent)' : 'var(--color-border-strong)';
  const sw = isHovered ? '2' : '1.5';
  const s = `style="fill: ${fill}; stroke: ${stroke}; stroke-width: ${sw}"`;

  switch (node.type) {
    case 'database':
      // Cylinder: two ellipses + rect
      return `
        <rect x="0" y="${h * 0.2}" width="${w}" height="${h * 0.7}" rx="4" ${s}/>
        <ellipse cx="${w / 2}" cy="${h * 0.2}" rx="${w / 2}" ry="${h * 0.15}" ${s}/>
        <ellipse cx="${w / 2}" cy="${h * 0.9}" rx="${w / 2}" ry="${h * 0.15}" ${s} opacity="0"/>
      `;
    case 'cache':
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="8" style="fill: ${fill}; stroke: ${stroke}; stroke-width: ${sw}; stroke-dasharray: 5, 3"/>`;
    case 'loadbalancer':
      // Diamond / hexagon-ish
      return `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" ${s}/>`;
    case 'queue':
      // Parallelogram-ish
      return `<polygon points="8,0 ${w},0 ${w - 8},${h} 0,${h}" ${s}/>`;
    case 'client':
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="20" ${s}/>`;
    case 'gateway':
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="4" style="fill: var(--color-accent-soft); stroke: var(--color-accent-border); stroke-width: ${sw}"/>`;
    case 'agent':
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="4" style="fill: var(--color-callout-tip-bg); stroke: var(--color-callout-tip-border); stroke-width: ${sw}"/>`;
    default: // server, storage
      return `<rect x="0" y="0" width="${w}" height="${h}" rx="4" ${s}/>`;
  }
}

const TYPE_ICONS: Record<string, string> = {
  client: '👤',
  server: '⚙',
  database: '🗄',
  cache: '⚡',
  loadbalancer: '⚖',
  queue: '📨',
  storage: '📦',
  agent: '🤖',
  gateway: '🚪',
};

class ArchDiagram extends LitElement {
  static properties = {
    src: { type: String },
    caption: { type: String },
    _diagram: { state: true },
    _hoveredNode: { state: true },
    _loading: { state: true },
    _error: { state: true },
  };

  static styles = css`
    :host { display: block; margin: 28px 0; }

    .diagram-wrap {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .diagram-scroll {
      overflow-x: auto;
      padding: 20px;
      scrollbar-width: thin;
      background: var(--color-bg-sidebar);
    }

    svg {
      width: 100%;
      height: auto;
      min-width: 400px;
      display: block;
    }

    .node-label {
      font-family: var(--font-ui);
      font-size: 11px;
      fill: var(--color-text-primary);
      pointer-events: none;
      user-select: none;
    }

    .edge-line {
      fill: none;
      stroke: var(--color-border-strong);
      stroke-width: 1.5;
      transition: stroke 150ms ease;
    }

    .edge-line.hovered {
      stroke: var(--color-accent);
      stroke-width: 2;
    }

    .edge-line.dashed { stroke-dasharray: 5,3; }

    .edge-label {
      font-family: var(--font-ui);
      font-size: 9px;
      fill: var(--color-text-muted);
    }

    .node-group { cursor: pointer; }
    .node-group:hover .node-shape { filter: brightness(0.97); }

    figcaption {
      text-align: center;
      font-size: 0.78rem;
      color: var(--color-text-muted);
      padding: 8px 16px 12px;
      font-style: italic;
      border-top: 1px solid var(--color-border);
    }

    .diagram-loading,
    .diagram-error {
      padding: 40px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }
  `;

  src: string = '';
  caption: string = '';

  private _diagram: DiagramDef | null = null;
  private _hoveredNode: string | null = null;
  private _loading = true;
  private _error = false;

  updated(changed: Map<string, unknown>) {
    if (changed.has('src') && this.src) {
      this._fetchDiagram();
    }
  }

  private async _fetchDiagram() {
    this._loading = true;
    this._error = false;
    try {
      const url = new URL(this.src, document.baseURI).href;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this._diagram = await res.json() as DiagramDef;
    } catch (err) {
      console.error('arch-diagram: failed to load', this.src, err);
      this._error = true;
    } finally {
      this._loading = false;
    }
  }

  render() {
    if (this._loading) return html`<div class="diagram-wrap"><div class="diagram-loading">架構圖載入中…</div></div>`;
    if (this._error)   return html`<div class="diagram-wrap"><div class="diagram-error">⚠ 架構圖載入失敗：${this.src}</div></div>`;
    if (!this._diagram) return html``;

    return html`
      <figure class="diagram-wrap">
        <div class="diagram-scroll">
          ${this._renderSvg(this._diagram)}
        </div>
        ${this.caption ? html`<figcaption>${this.caption}</figcaption>` : ''}
      </figure>
    `;
  }

  private _renderSvg(def: DiagramDef) {
    const vb = def.viewBox ?? '0 0 700 300';
    const [, , vw, vh] = vb.split(' ').map(Number);
    const nodeMap = new Map(def.nodes.map((n) => [n.id, n]));

    // Arrowhead marker
    const marker = `
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" style="fill: var(--color-border-strong)" />
        </marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" style="fill: var(--color-accent)" />
        </marker>
      </defs>
    `;

    const edges = def.edges.map((edge) => this._renderEdge(edge, nodeMap));
    const nodes = def.nodes.map((node) => this._renderNode(node));

    return svg`
      <svg
        viewBox="${vb}"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="${this.caption || '系統架構圖'}"
      >
        <g .innerHTML=${marker}></g>
        <g>${edges}</g>
        <g>${nodes}</g>
      </svg>
    `;
  }

  private _renderNode(node: DiagramNode) {
    const w = node.w ?? NODE_W;
    const h = node.h ?? NODE_H;
    const isHovered = this._hoveredNode === node.id;
    const shape = renderNodeShape(node, w, h, isHovered);
    const icon = TYPE_ICONS[node.type] ?? '□';
    const cx = w / 2;
    const cy = h / 2;

    return svg`
      <g
        class="node-group"
        transform="translate(${node.x - w / 2}, ${node.y - h / 2})"
        @mouseenter=${() => { this._hoveredNode = node.id; }}
        @mouseleave=${() => { this._hoveredNode = null; }}
        role="img"
        aria-label="${node.label}"
      >
        <g class="node-shape" .innerHTML=${shape}></g>
        <text
          class="node-label"
          x="${cx}"
          y="${cy - 4}"
          text-anchor="middle"
          dominant-baseline="central"
          font-size="10"
        >${icon}</text>
        <text
          class="node-label"
          x="${cx}"
          y="${cy + 10}"
          text-anchor="middle"
          font-size="10"
        >${node.label}</text>
      </g>
    `;
  }

  private _renderEdge(edge: DiagramEdge, nodeMap: Map<string, DiagramNode>) {
    const from = nodeMap.get(edge.from);
    const to = nodeMap.get(edge.to);
    if (!from || !to) return html``;

    const isHovered =
      this._hoveredNode === edge.from || this._hoveredNode === edge.to;

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    const classes = [
      'edge-line',
      isHovered ? 'hovered' : '',
      edge.dashed ? 'dashed' : '',
    ].filter(Boolean).join(' ');

    const marker = isHovered ? 'url(#arrow-accent)' : 'url(#arrow)';

    return svg`
      <g>
        <line
          class="${classes}"
          x1="${from.x}" y1="${from.y}"
          x2="${to.x}" y2="${to.y}"
          marker-end="${marker}"
        ></line>
        ${edge.label ? svg`
          <text
            class="edge-label"
            x="${midX}"
            y="${midY - 4}"
            text-anchor="middle"
          >${edge.label}</text>
        ` : ''}
      </g>
    `;
  }
}

customElements.define('arch-diagram', ArchDiagram);
