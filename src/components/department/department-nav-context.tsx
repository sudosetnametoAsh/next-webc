"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface DepartmentNavContextType {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const DepartmentNavContext = createContext<DepartmentNavContextType | undefined>(undefined);

export function DepartmentNavProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <DepartmentNavContext.Provider
      value={{ mobileOpen, setMobileOpen, toggleMobile, closeMobile }}
    >
      {children}
    </DepartmentNavContext.Provider>
  );
}

export function useDepartmentNav() {
  const context = useContext(DepartmentNavContext);
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
