// Register all custom elements
import './components/theme-toggle.js';
import './components/lang-selector.js';
import './components/sidebar-nav.js';
import './components/drawer-nav.js';
import './components/sections-panel.js';
import './components/nav-footer.js';
import './components/chapter-content.js';
import './components/callout-box.js';
import './components/diagrams/capacity-calc.js';
import './components/diagrams/arch-diagram.js';
import './components/app-shell.js';

// Bootstrap utilities
import { initTheme } from './utils/theme.js';
import { initSidebarState } from './utils/store.js';
import { initRouter } from './utils/router.js';

// initTheme must run synchronously before first paint to prevent flash
initTheme();
initSidebarState();
initRouter();
