import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../../src/lib/providers/theme-provider";
import { ThemeToggle } from "../../src/components/ui/theme-toggle";

const area = new URLSearchParams(window.location.search).get("area") || "admin";

function App() {
  return (
    <ThemeProvider>
      <div data-portal={area === "admin" || area === "department" || area === "clearance" ? area : undefined}>
        <p data-testid="resolved-area">{area}</p>
        <button type="button" data-testid="focus-target">Focus target</button>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
