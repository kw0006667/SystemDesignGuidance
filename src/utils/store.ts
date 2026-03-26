import type { AppStateShape, Theme, MobilePanelState, Locale } from '../types.js';
import type { ReactiveControllerHost } from 'lit';

// ============================================================
// AppState — singleton EventTarget-based state
// ============================================================
class AppStateClass extends EventTarget {
  #s: AppStateShape = {
    theme: 'light',
    locale: 'zh-TW',
    chapterId: 1,
    sectionSlug: null,
    currentSections: [],
    sidebarCollapsed: false,
    desktopSectionsCollapsed: false,
    mobilePanelState: 'closed',
  };

  get state(): Readonly<AppStateShape> {
    return { ...this.#s };
  }

  setState(patch: Partial<AppStateShape>): void {
    this.#s = { ...this.#s, ...patch };
    this.dispatchEvent(new CustomEvent('change', { detail: this.#s }));
  }
}

export const appState = new AppStateClass();

// ============================================================
// StoreController — Lit ReactiveController
// ============================================================
export class StoreController {
  private host: ReactiveControllerHost;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    appState.addEventListener('change', this._update);
  }

  hostDisconnected(): void {
    appState.removeEventListener('change', this._update);
  }

  private _update = (): void => {
    this.host.requestUpdate();
  };

  get state(): Readonly<AppStateShape> {
    return appState.state;
  }
}

// ============================================================
// Sidebar / UI State Helpers
// ============================================================
export function initSidebarState(): void {
  const collapsed = localStorage.getItem('sysdesign-sidebar-collapsed') === 'true';
  const sectionsCollapsed = localStorage.getItem('sysdesign-sections-collapsed') === 'true';
  if (collapsed) applyDesktopSidebarState(collapsed, false);
  if (sectionsCollapsed) applyDesktopSectionsState(sectionsCollapsed, false);
}

export function applyDesktopSidebarState(collapsed: boolean, save = true): void {
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  if (save) localStorage.setItem('sysdesign-sidebar-collapsed', String(collapsed));
  appState.setState({ sidebarCollapsed: collapsed });
}

export function applyDesktopSectionsState(collapsed: boolean, save = true): void {
  document.body.classList.toggle('desktop-sections-collapsed', collapsed);
  if (save) localStorage.setItem('sysdesign-sections-collapsed', String(collapsed));
  appState.setState({ desktopSectionsCollapsed: collapsed });
}

export function setMobilePanelState(state: MobilePanelState): void {
  // On desktop, always close
  if (window.matchMedia('(min-width: 768px)').matches) state = 'closed';
  appState.setState({ mobilePanelState: state });

  const overlay = document.getElementById('overlay');
  const drawer = document.getElementById('mobile-drawer');
  const sectionsPanel = document.getElementById('mobile-sections-panel');

  if (overlay) overlay.classList.toggle('active', state !== 'closed');
  if (drawer) drawer.classList.toggle('is-open', state === 'drawer');
  if (sectionsPanel) sectionsPanel.classList.toggle('is-open', state === 'sections');
}
