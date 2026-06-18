'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type FavoritesContextType = {
  ids: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  totalItems: number;
};

const FavoritesContext = createContext<FavoritesContextType>({
  ids: [],
  add: () => {},
  remove: () => {},
  toggle: () => {},
  has: () => false,
  totalItems: 0,
});

const STORAGE_KEY = 'kaguera-favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setIds(JSON.parse(saved));
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  }, [ids, loaded]);

  const add = useCallback((productId: string) => {
    setIds((current) => (current.includes(productId) ? current : [...current, productId]));
  }, []);

  const remove = useCallback((productId: string) => {
    setIds((current) => current.filter((id) => id !== productId));
  }, []);

  const toggle = useCallback((productId: string) => {
    setIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }, []);

  const has = useCallback((productId: string) => ids.includes(productId), [ids]);

  return (
    <FavoritesContext.Provider value={{ ids, add, remove, toggle, has, totalItems: ids.length }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
