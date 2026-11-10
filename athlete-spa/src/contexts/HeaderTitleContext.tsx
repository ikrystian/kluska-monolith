import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface HeaderTitleContextValue {
  customTitle: string | null;
  setCustomTitle: (title: string | null) => void;
}

const HeaderTitleContext = createContext<HeaderTitleContextValue>({
  customTitle: null,
  setCustomTitle: () => {},
});

export function HeaderTitleProvider({ children }: { children: ReactNode }) {
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const location = useLocation();

  // Reset custom title whenever pathname changes
  useEffect(() => {
    setCustomTitle(null);
  }, [location.pathname]);

  return (
    <HeaderTitleContext.Provider value={{ customTitle, setCustomTitle }}>
      {children}
    </HeaderTitleContext.Provider>
  );
}

/**
 * Hook for pages to declare a custom header title (e.g. run name, article title, etc.).
 * Cleans up when the component unmounts.
 */
export function useHeaderTitle(title?: string | null) {
  const { customTitle, setCustomTitle } = useContext(HeaderTitleContext);

  useEffect(() => {
    if (title) {
      setCustomTitle(title);
    }
    return () => {
      setCustomTitle(null);
    };
  }, [title, setCustomTitle]);

  return { customTitle, setCustomTitle };
}
