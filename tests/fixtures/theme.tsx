import React from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../../src/lib/providers/theme-provider";
import { ThemeToggle } from "../../src/components/ui/theme-toggle";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../src/components/ui/dialog";
import { Drawer } from "../../src/components/ui/drawer";

const area = new URLSearchParams(window.location.search).get("area") || "admin";

function App() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
        <input className="bg-portal-surface text-white placeholder:text-slate-500" placeholder="Placeholder" data-testid="variant-input" />
        <input className="border border-slate-800 focus:border-amber-500" data-testid="focus-border-input" />
        <button className="bg-rose-600 text-white" type="button" data-testid="solid-danger">Delete</button>
        <button className="hover:bg-slate-800" type="button" data-testid="hover-surface">Hover surface</button>
        <input type="date" data-testid="department-date" />
        <button type="button" data-testid="focus-target">Focus target</button>
        <ThemeToggle />
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button type="button" data-testid="real-dialog-trigger">Open real dialog</button>
          </DialogTrigger>
          <DialogContent data-testid="real-dialog">
            <DialogTitle>Real portal dialog</DialogTitle>
            <div data-testid="dialog-toggle"><ThemeToggle /></div>
          </DialogContent>
        </Dialog>
        <button type="button" data-testid="real-drawer-trigger" onClick={() => setDrawerOpen(true)}>Open real drawer</button>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Real portal drawer">
          <div data-testid="drawer-body">
            <p>Drawer content</p>
            <div data-testid="drawer-toggle"><ThemeToggle /></div>
          </div>
        </Drawer>
      </div>
      {createPortal(
        <>
          <div className="bg-[#070c18] text-white" data-testid="body-overlay">Body-mounted overlay</div>
          <div className="bg-[#131822] text-gray-200" data-testid="legacy-overlay-text">Legacy overlay text</div>
        </>,
        document.body,
      )}
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
