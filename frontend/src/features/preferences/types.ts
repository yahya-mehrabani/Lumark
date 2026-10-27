import { ThemePreference } from '../viewport/themeStore';
import { DirectionPreference } from '../direction/directionPreferences';

export type ThemeOption = ThemePreference;
export type DirectionOption = DirectionPreference;

export interface AppSettings {
  schemaVersion: number;
  theme: ThemeOption;
  defaultDirection: DirectionOption;
  defaultZoom: number;
  restoreOpenTabs: boolean;
  openTabs?: string[];
  maxRecentFiles: number;
  showToc?: boolean;
  showTableOfContents?: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  schemaVersion: 1,
  theme: 'system',
  defaultDirection: 'auto',
  defaultZoom: 1.0,
  restoreOpenTabs: true,
  openTabs: [],
  maxRecentFiles: 20,
  showToc: true,
  showTableOfContents: true,
};
