import { appState } from './store.js';
import type { Theme } from '../types.js';

export function initTheme(): void {
  const stored = localStorage.getItem('sysdesign-theme') as Theme | null;
  const theme: Theme = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(theme);
}

export function toggleTheme(): void {
  const next: Theme = appState.state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('sysdesign-theme', next);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  appState.setState({ theme });

  // Swap Prism stylesheets
  const light = document.getElementById('prism-theme-light') as HTMLLinkElement | null;
  const dark = document.getElementById('prism-theme-dark') as HTMLLinkElement | null;
  if (light) light.disabled = theme === 'dark';
  if (dark) dark.disabled = theme !== 'dark';
}
