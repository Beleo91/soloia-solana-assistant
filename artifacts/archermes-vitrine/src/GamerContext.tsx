import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface GamerCtx {
  isGamingMode: boolean;
  toggleGamingMode: () => void;
}

const GamerContext = createContext<GamerCtx | undefined>(undefined);

export function GamerProvider({ children }: { children: ReactNode }) {
  const [isGamingMode, setIsGamingMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('archermes_gamer_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('archermes_gamer_mode', isGamingMode.toString());
    } catch { /* ignore */ }

    if (isGamingMode) {
      document.documentElement.classList.add('gamer-mode');
    } else {
      document.documentElement.classList.remove('gamer-mode');
    }
  }, [isGamingMode]);

  const toggleGamingMode = () => setIsGamingMode((prev) => !prev);

  return (
    <GamerContext.Provider value={{ isGamingMode, toggleGamingMode }}>
      {children}
    </GamerContext.Provider>
  );
}

export function useGamer() {
  const context = useContext(GamerContext);
  if (context === undefined) {
    throw new Error('useGamer must be used within a GamerProvider');
  }
  return context;
}
