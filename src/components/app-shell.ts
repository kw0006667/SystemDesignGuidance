import { LitElement, html } from 'lit';
import { StoreController, applyDesktopSidebarState, applyDesktopSectionsState, setMobilePanelState } from '../utils/store.js';

class AppShell extends LitElement {
  createRenderRoot() { return this; }

  private _store = new StoreController(this);

  render() {
    const { sidebarCollapsed, desktopSectionsCollapsed } = this._store.state;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const showFloatingSectionsBtn = isMobile || (sidebarCollapsed && desktopSectionsCollapsed);

    return html`
      <!-- Mobile Top Bar -->
      <header id="top-bar">
        <button
          class="hamburger-btn"
          aria-label="開啟目錄"
          @click=${() => setMobilePanelState('drawer')}
        >☰</button>
        <span class="top-bar-title">系統設計實戰手冊</span>
        <lang-selector></lang-selector>
        <theme-toggle></theme-toggle>
      </header>

      <!-- Overlay (Mobile) -->
      <div id="overlay" @click=${() => setMobilePanelState('closed')}></div>

      <!-- Mobile Drawer -->
      <aside id="mobile-drawer" aria-label="章節目錄">
        <div class="drawer-header">
          <span class="drawer-title">目錄</span>
          <button class="drawer-close-btn" aria-label="關閉目錄" @click=${() => setMobilePanelState('closed')}>×</button>
        </div>
        <drawer-nav></drawer-nav>
      </aside>

      <!-- Mobile Sections Panel -->
      <aside id="mobile-sections-panel" aria-label="本章節目">
        <div class="drawer-header">
          <span class="drawer-title">本章節目</span>
          <button class="drawer-close-btn" aria-label="關閉節目" @click=${() => setMobilePanelState('closed')}>×</button>
        </div>
        <sections-panel></sections-panel>
      </aside>

      <!-- Desktop App Grid -->
      <div id="app">

        <!-- Desktop Sidebar -->
        <aside id="sidebar">
          <div class="sidebar-header">
            <a class="sidebar-logo" href="#chapter-1">
              <div class="sidebar-logo-icon">S</div>
              <span class="sidebar-logo-text">系統設計<br>實戰手冊</span>
            </a>
            <div class="sidebar-controls">
              <theme-toggle></theme-toggle>
              <button
                class="icon-btn"
                title="${sidebarCollapsed ? '展開側欄' : '收起側欄'}"
                aria-label="${sidebarCollapsed ? '展開側欄' : '收起側欄'}"
                @click=${() => applyDesktopSidebarState(!sidebarCollapsed)}
              >
                ${sidebarCollapsed ? '→' : '←'}
              </button>
            </div>
          </div>
          <div class="sidebar-toolbar">
            <lang-selector></lang-selector>
          </div>
          <sidebar-nav></sidebar-nav>
          <div class="sidebar-footer">
            <a href="https://github.com" target="_blank" rel="noopener">
              <span>GitHub</span>
            </a>
          </div>
        </aside>

        <!-- Chapter Content -->
        <chapter-content></chapter-content>

      <!-- Desktop Sections Panel -->
        <aside id="sections-panel">
          <sections-panel></sections-panel>
        </aside>
      </div>

      <!-- Sidebar Expand Button (when collapsed on desktop) -->
      <button
        id="sidebar-expand-btn"
        aria-label="展開側欄"
        title="展開側欄"
        @click=${() => applyDesktopSidebarState(false)}
      >›</button>

      <!-- Mobile Sections Float Button -->
      <button
        id="mobile-sections-btn"
        aria-label="查看本章節目"
        title="查看本章節目"
        class="${showFloatingSectionsBtn ? 'is-visible' : ''}"
        @click=${() => this._openSectionsPanel()}
      >
        <span class="mobile-sections-btn-icon" aria-hidden="true">≡</span>
        <span class="mobile-sections-btn-label">本章節目</span>
      </button>
    `;
  }

  private _openSectionsPanel() {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setMobilePanelState('sections');
      return;
    }
    applyDesktopSectionsState(false);
  }
}

customElements.define('app-shell', AppShell);
