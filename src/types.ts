export interface Section {
  slug: string;
  title: string;
}

export interface Chapter {
  id: number | string;
  slug: string;
  title: string;
  part: number;
  sections: Section[];
  isAppendix?: boolean;
  difficulty?: 'entry' | 'junior-mid' | 'mid-senior' | 'senior' | 'senior-staff' | 'staff';
}

export interface Part {
  id: number;
  title: string;
  chapters: (number | string)[];
  difficulty: string;
}

export interface ChapterContent {
  title: string;
  intro?: string;
  content: string;
}

export type Theme = 'light' | 'dark';
export type Locale = 'zh-TW';
export type MobilePanelState = 'closed' | 'drawer' | 'sections';

export interface AppStateShape {
  theme: Theme;
  locale: Locale;
  chapterId: number | string;
  sectionSlug: string | null;
  currentSections: Section[];
  sidebarCollapsed: boolean;
  desktopSectionsCollapsed: boolean;
  mobilePanelState: MobilePanelState;
}
