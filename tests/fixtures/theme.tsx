import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../../src/lib/providers/theme-provider";
import { ThemeToggle } from "../../src/components/ui/theme-toggle";

const area = new URLSearchParams(window.location.search).get("area") || "admin";

function App() {
  return (
    <ThemeProvider>
      <div
        data-portal={area === "admin" || area === "department" || area === "clearance" ? area : undefined}
        className="portal-shell bg-portal-canvas text-portal-foreground"
      >
        <p data-testid="resolved-area">{area}</p>
        <div className="theme-card bg-portal-surface" data-testid="theme-card">Themed surface</div>
        <div className="admin-card bg-[#0c1427] border border-slate-800 text-white" data-testid="admin-card">Admin card</div>
        <div className="department-card bg-[#101726] border border-slate-800 text-white" data-testid="department-card">Department card</div>
        <input type="date" data-testid="department-date" />
        <button type="button" data-testid="focus-target">Focus target</button>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
