import React from "react";
import { createPortal } from "react-dom";
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
        <div className="clearance-card bg-[#091122] border border-slate-800 text-white" data-testid="clearance-card">Clearance card</div>
        <div className="clearance-panel bg-[#0b0e14]" data-testid="clearance-panel">Clearance panel</div>
        <div className="clearance-inset bg-[#10172A]" data-testid="clearance-inset">Clearance inset</div>
        <p className="bg-portal-surface text-portal-foreground" data-testid="normal-text">Normal contrast</p>
        <p className="bg-portal-accent-soft text-portal-accent" data-testid="status-text">Status contrast</p>
        <p className="bg-portal-canvas text-portal-foreground text-lg" data-testid="large-text">Large contrast</p>
        <input type="date" data-testid="department-date" />
        <button type="button" data-testid="focus-target">Focus target</button>
        <ThemeToggle />
      </div>
      {createPortal(
        <div className="bg-[#070c18] text-white" data-testid="body-overlay">Body-mounted overlay</div>,
        document.body,
      )}
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
