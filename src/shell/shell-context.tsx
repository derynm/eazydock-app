import { createContext, useContext } from 'react';

export type ShellState = {
  isTablet: boolean;
  /** Phone overlay drawer. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  /** Tablet rail collapse. */
  collapsed: boolean;
  toggleCollapsed: () => void;
};

export const ShellContext = createContext<ShellState | null>(null);

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within the app shell');
  return ctx;
}
