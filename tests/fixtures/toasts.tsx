import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, useTheme } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { Toaster } from "../../src/components/ui/sonner";
import { useToast } from "../../src/hooks/use-toast";
import { useSignClient } from "../../src/hooks/department/sign-client";
import { useAddClientTasks } from "../../src/hooks/department/add-client-tasks";
import SubmissionModal from "../../src/components/department/clients/sumission-modal";

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

function Actions() {
  const { success, error } = useToast();
  const sign = useSignClient();
  const assign = useAddClientTasks("1");
  return <>
    <button onClick={() => success("The report is ready to download.", "Report exported")}>Export report</button>
    <button onClick={() => error("Please try again.", "Export failed")}>Fail export</button>
    <button onClick={() => sign.mutate({ ids: ["1"], status: "Signed", signed_at: new Date().toISOString() })}>Sign</button>
    <button onClick={() => sign.mutate({ ids: ["1"], status: "Pending", signed_at: null })}>Reopen</button>
    <button onClick={() => assign.mutate([{ clearance_id: "1", task_id: null, title: "Document", description: "Upload document", staff_id: "staff", dropbox: "pending" }])}>Assign tasks</button>
    <button onClick={() => toast.warning("Document needs staff review")}>Warning</button>
    <button onClick={() => toast.info("x".repeat(300))}>Long message</button>
    <button onClick={() => toast.promise(new Promise(resolve => setTimeout(resolve, 3000)), { loading: "Uploading document", success: "Upload complete" })}>Upload document</button>
    <button onClick={() => toast.dismiss()}>Dismiss all</button>
  </>;
}

function App() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  return <QueryClientProvider client={queryClient}>
    <main style={{ padding: 24, display: "grid", gap: 12 }}>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setMounted(false)}>Leave page</button>
      <button onClick={() => setReviewOpen(true)}>Review submission</button>
      {mounted && <Actions />}
    </main>
    <SubmissionModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} studentName="Test Client" taskTitle="Library receipt" lastUpdated="Today" files={[]} status="Submitted" onUpdateStatus={async () => {
      const response = await fetch("/api/review", { method: "PATCH" });
      if (!response.ok) throw new Error("Save failed");
    }} onRejectWithResubmit={async () => {
      const response = await fetch("/api/review", { method: "POST" });
      if (!response.ok) throw new Error("Save failed");
    }} />
    <Toaster />
  </QueryClientProvider>;
}

createRoot(document.getElementById("root")!).render(<ThemeProvider attribute="class" defaultTheme="light"><App /></ThemeProvider>);
