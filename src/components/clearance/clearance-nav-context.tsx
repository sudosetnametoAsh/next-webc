"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface ClearanceNavContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const ClearanceNavContext = createContext<ClearanceNavContextType | undefined>(undefined);

export function ClearanceNavProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <ClearanceNavContext.Provider
      value={{ mobileOpen, setMobileOpen, toggleMobile, closeMobile }}
    >
      {children}
    </ClearanceNavContext.Provider>
  );
}

export function useClearanceNav() {
  const context = useContext(ClearanceNavContext);
  if (!context) {
    return {
      mobileOpen: false,
      setMobileOpen: () => {},
      toggleMobile: () => {},
      closeMobile: () => {},
    };
  }
  return context;
}
