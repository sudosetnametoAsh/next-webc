import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ClientEnrollmentModal from "@/components/admin/client-enrollment-modal";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
function App() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return <QueryClientProvider client={queryClient}>
    <button onClick={() => setOpen(true)}>Open enrollment</button>
    <p role="status">{message}</p>
    <ClientEnrollmentModal isOpen={open} onClose={() => setOpen(false)} toastSuccess={setMessage} toastError={setMessage} />
  </QueryClientProvider>;
}
createRoot(document.getElementById("root")!).render(<App />);
