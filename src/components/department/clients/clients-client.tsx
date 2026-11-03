"use client";

import { useState, useMemo, useEffect, useRef, Suspense, Fragment } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useDepartmentContext } from "@/context/deparment";
import { useFetchDepartmentClients } from "@/hooks/department/fetch-department-clients";
import { useFetchCourses } from "@/hooks/department/fetch-courses";
import { useFetchPreset } from "@/hooks/department/fetch-presets";
import { DepartmentClientItem } from "@/app/api/department/clients/route";
import { createClient } from "@/lib/db/supabase-client";
import { useQueryClient } from "@tanstack/react-query";
import ClientFilterToolbar, {
  ClientType,
  ClientStatus,
  SortFilter,
} from "./client-filter-toolbar";
import TablePaginationFooter from "@/components/admin/table-pagination-footer";
import SignToggleButton from "../sign-button";
import AddTask from "../button/add-task";
import AddPreset from "../button/add-preset";
import ManagePresetButton from "../button/manage-preset-button";
import SelectAll from "../button/select-all";
import { Checkbox } from "@/components/ui/checkbox";
import TaskView from "./task-view";
import { shrinkCourseName } from "@/utils/formatters";
import { GraduationCap, Briefcase, ChevronRight, Lock, Clock } from "lucide-react";

// ———— CONSTANTS ————————————————————————————————————————————————————————————————————————————————————————————————

const PAGE_SIZE = 10;

// ———— HELPER FUNCTIONS & BADGES ——————————————————————————————————————————————————————————————————————————————

function getClientInitials(name: string): string {
  if (!name) return "CL";
  const clean = name.trim();
  if (clean.includes(",")) {
    const lastName = clean.split(",")[0].trim();
    if (lastName.length > 0) {
      return lastName.charAt(0).toUpperCase().repeat(2);
    }
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function formatTimeElapsed(timeVal?: number | string | null): string {
  if (!timeVal) return "";
  try {
    const date = new Date(timeVal);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(date.getTime()) || diffInSeconds < 0) return "just now";

    if (diffInSeconds < 60) return "just now";
    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  } catch {
    return "";
  }
}

function ClientStatusBadge({
  status,
  isLocked,
  taskCount,
}: {
  status: "cleared" | "incomplete" | "pending";
  isLocked?: boolean;
  taskCount?: number;
}) {
  if (status === "cleared") {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-emerald-500/40 bg-emerald-950/30 text-emerald-400 whitespace-nowrap shadow-xs">
        CLEARED
      </span>
    );
  }

  if (isLocked) {
    return (
      <span className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-slate-700/70 bg-slate-800/60 text-slate-300 whitespace-nowrap shadow-xs">
        {/* <Lock className="w-3 h-3 text-slate-400" /> */}
        AWAITING PREREQ
      </span>
    );
  }

  if (status === "incomplete") {
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-500/40 bg-blue-950/30 text-blue-400 whitespace-nowrap shadow-xs">
        INCOMPLETE {taskCount && taskCount > 0 ? `(${taskCount})` : ""}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-slate-700/70 bg-slate-800/60 text-slate-300 whitespace-nowrap shadow-xs">
      PENDING
    </span>
  );
}

function getClientDefaultSortRank(client: DepartmentClientItem): number {
  if (client.status === "Signed" || client.departmentStatus === "cleared") {
    return 3; // Cleared
  }
  if (client.isLocked) {
    return 4; // Awaiting Prerequisite
  }
  if (client.departmentStatus === "incomplete") {
    return 2; // Incomplete
  }
  return 1; // Pending
}

// ———— MAIN COMPONENT CONTENT ——————————————————————————————————————————————————————————————————————————————————

export default function StudentsClient() {
  const { departmentName } = useDepartmentContext();
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  // Queries
  const { data: clientsData = [], isLoading: isLoadingClients } = useFetchDepartmentClients();
  const { data: coursesData = [] } = useFetchCourses();
  const { data: preset } = useFetchPreset();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialStatus = (searchParams?.get("status")?.toLowerCase() as ClientStatus) || "all";
  const initialType = (searchParams?.get("type")?.toLowerCase() as ClientType) || "all";
  const initialCourse = searchParams?.get("course") || "all";
  const initialSection = searchParams?.get("section") || "all";
  const initialTaskIdVal = searchParams?.get("taskId");

  // Filter States
  const [clientType, setClientType] = useState<ClientType>(() =>
    initialType === "students" || initialType === "staff" ? initialType : "all"
  );
  const [search, setSearch] = useState("");
  const [selectedSort, setSelectedSort] = useState<SortFilter>("default");
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>(() =>
    ["submissions", "pending", "incomplete", "cleared"].includes(initialStatus) ? initialStatus : "all"
  );
  const [courseFilter, setCourseFilter] = useState<string>(initialCourse);
  const [sectionFilter, setSectionFilter] = useState<string>(initialSection);
  const [currentPage, setCurrentPage] = useState(1);
  const [targetTaskId, setTargetTaskId] = useState<number | null>(() => {
    return initialTaskIdVal && !isNaN(Number(initialTaskIdVal)) ? Number(initialTaskIdVal) : null;
  });
  const [selectedClient, setSelectedClient] = useState<DepartmentClientItem | null>(null);

  const lastAppliedQueryRef = useRef<string>(searchParams?.toString() || "");
  const autoOpenedClientRef = useRef<string | null>(null);

  // Close the slide-out inspection drawer and clean up deep-link query params from URL
  const handleCloseDrawer = () => {
    setSelectedClient(null);
    setTargetTaskId(null);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      let changed = false;
      if (url.searchParams.has("clientId")) {
        url.searchParams.delete("clientId");
        changed = true;
      }
      if (url.searchParams.has("studentId")) {
        url.searchParams.delete("studentId");
        changed = true;
      }
      if (url.searchParams.has("taskId")) {
        url.searchParams.delete("taskId");
        changed = true;
      }
      if (changed) {
        lastAppliedQueryRef.current = url.searchParams.toString();
        const newPath = `${pathname}${url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""}`;
        router.replace(newPath, { scroll: false });
      }
    }
  };

  // Synchronize when URL searchParams change dynamically (e.g. user clicks another notification)
  useEffect(() => {
    if (!searchParams) return;
    const currentQuery = searchParams.toString();
    if (currentQuery === lastAppliedQueryRef.current) return;
    lastAppliedQueryRef.current = currentQuery;

    const statusParam = searchParams.get("status")?.toLowerCase();
    const typeParam = searchParams.get("type")?.toLowerCase();
    const courseParam = searchParams.get("course");
    const sectionParam = searchParams.get("section");
    const taskIdParam = searchParams.get("taskId");
    const clientIdParam = searchParams.get("clientId") || searchParams.get("studentId");

    if (statusParam && ["submissions", "pending", "incomplete", "cleared", "all"].includes(statusParam)) {
      setSelectedStatus((prev) => (prev !== statusParam ? (statusParam as ClientStatus) : prev));
    }

    if (typeParam && ["students", "staff", "all"].includes(typeParam)) {
      setClientType((prev) => (prev !== typeParam ? (typeParam as ClientType) : prev));
    }

    if (courseParam) {
      setCourseFilter((prev) => (prev !== courseParam ? courseParam : prev));
    }

    if (sectionParam) {
      setSectionFilter((prev) => (prev !== sectionParam ? sectionParam : prev));
    }

    if (taskIdParam && !isNaN(Number(taskIdParam))) {
      setTargetTaskId(Number(taskIdParam));
    }

    if (clientIdParam && clientsData.length > 0) {
      const match = clientsData.find(
        (c) => c.id === clientIdParam || c.clearanceId === clientIdParam
      );
      if (match) {
        autoOpenedClientRef.current = clientIdParam;
        setSelectedClient(match);
      }
    }
  }, [searchParams, clientsData]);

  // Deep-link client selection: open TaskView once clientsData loads on initial page load / deep link
  const deepLinkClientId = searchParams?.get("clientId") || searchParams?.get("studentId");
  useEffect(() => {
    if (!deepLinkClientId || clientsData.length === 0) return;
    if (autoOpenedClientRef.current === deepLinkClientId) return;

    const match = clientsData.find(
      (c) => c.id === deepLinkClientId || c.clearanceId === deepLinkClientId
    );
    if (match) {
      autoOpenedClientRef.current = deepLinkClientId;
      setSelectedClient(match);
    }
  }, [deepLinkClientId, clientsData]);

  // Listen for open_department_submission custom event to open flagged / new submissions
  useEffect(() => {
    const handleOpenSubmissionEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ clientId?: string; taskId?: number | string }>;
      const { clientId, taskId } = customEvent.detail || {};

      setSelectedStatus("submissions");

      if (taskId && !isNaN(Number(taskId))) {
        setTargetTaskId(Number(taskId));
      }

      if (clientId && clientsData.length > 0) {
        const match = clientsData.find(
          (c) => c.id === clientId || c.clearanceId === clientId
        );
        if (match) {
          autoOpenedClientRef.current = clientId;
          setSelectedClient(match);
        }
      }
    };

    window.addEventListener("open_department_submission", handleOpenSubmissionEvent);
    return () => {
      window.removeEventListener("open_department_submission", handleOpenSubmissionEvent);
    };
  }, [clientsData]);

  // Helper to generate a unique key for each task submission attempt (including appeals)
  const getTaskSubmissionKey = (task: {
    assigned_task_id: number;
    uploaded_at?: string | null;
    assigned_at?: string | null;
    ai_audit_report?: any;
  }) => {
    let appealSuffix = "";
    if (task.ai_audit_report) {
      let rep = task.ai_audit_report;
      if (typeof rep === "string") {
        try {
          rep = JSON.parse(rep);
        } catch {}
      }
      if (rep && typeof rep === "object" && rep.appeal) {
        appealSuffix = `_appeal_${rep.appeal.appealed_at || "pending"}`;
      }
    }
    return `${task.assigned_task_id}_${task.uploaded_at || task.assigned_at || "sub"}${appealSuffix}`;
  };

  // Viewed submissions persistence (controls the RED BADGE on client status pill and task view)
  const storageKey = `dept_viewed_submissions_v2_${(departmentName || "default").trim().toLowerCase()}`;
  const [viewedSubmissionKeys, setViewedSubmissionKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Visited eligible clients & staff persistence (controls the ELIGIBILITY BADGES)
  const visitedEligibleClientsKey = `dept_visited_eligible_clients_v2_${(departmentName || "default").trim().toLowerCase()}`;
  const visitedStaffKey = `dept_visited_staff_${(departmentName || "default").trim().toLowerCase()}`;

  const [visitedEligibleClientIds, setVisitedEligibleClientIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored =
        localStorage.getItem(visitedEligibleClientsKey) ||
        sessionStorage.getItem(visitedEligibleClientsKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [visitedStaff, setVisitedStaff] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        (localStorage.getItem(visitedStaffKey) ||
          sessionStorage.getItem(visitedStaffKey)) === "true"
      );
    } catch {
      return false;
    }
  });

  // Acknowledged submission keys (controls temporary elevation to the top of the list)
  const ackSessionStorageKey = `dept_ack_submissions_v2_${(departmentName || "default").trim().toLowerCase()}`;
  const [sessionAcknowledgedKeys, setSessionAcknowledgedKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored =
        localStorage.getItem(ackSessionStorageKey) ||
        sessionStorage.getItem(ackSessionStorageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const mountedAtRef = useRef<number>(Date.now());
  const currentElevatedKeysRef = useRef<string[]>([]);

  // Listen to visited and viewed updates across components/windows
  useEffect(() => {
    const handleVisitedUpdate = () => {
      try {
        const storedEligibleClients =
          localStorage.getItem(visitedEligibleClientsKey) ||
          sessionStorage.getItem(visitedEligibleClientsKey);
        if (storedEligibleClients) {
          setVisitedEligibleClientIds(new Set(JSON.parse(storedEligibleClients)));
        }
        const storedStaff =
          (localStorage.getItem(visitedStaffKey) ||
            sessionStorage.getItem(visitedStaffKey)) === "true";
        setVisitedStaff(storedStaff);
      } catch {}
    };

    const handleViewedUpdate = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          setViewedSubmissionKeys(new Set(JSON.parse(stored)));
        }
      } catch {}
    };

    const handleStorageChange = () => {
      handleVisitedUpdate();
      handleViewedUpdate();
    };

    window.addEventListener("dept_clients_visited_updated", handleVisitedUpdate);
    window.addEventListener("dept_clients_viewed_updated", handleViewedUpdate);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("dept_clients_visited_updated", handleVisitedUpdate);
      window.removeEventListener("dept_clients_viewed_updated", handleViewedUpdate);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [visitedEligibleClientsKey, visitedStaffKey, storageKey]);

  const markSectionVisited = (secIdOrCode: string) => {
    const newlyVisitedIds: string[] = [];
    for (const cl of clientsData) {
      if (cl.type === "student" && !cl.isLocked && cl.status !== "Signed") {
        const matchesId = String(cl.sectionId) === String(secIdOrCode);
        const matchesCode = cl.sectionCode === secIdOrCode;
        if (matchesId || matchesCode) {
          if (courseFilter && courseFilter !== "all") {
            const courseMatch =
              cl.courseName?.toLowerCase().trim() === courseFilter.toLowerCase().trim() ||
              shrinkCourseName(cl.courseName || "").toLowerCase().trim() === courseFilter.toLowerCase().trim() ||
              String(cl.courseId) === courseFilter;
            if (!courseMatch) continue;
          }
          newlyVisitedIds.push(cl.id);
        }
      }
    }

    if (newlyVisitedIds.length === 0) return;

    setVisitedEligibleClientIds((prev) => {
      const next = new Set(prev);
      newlyVisitedIds.forEach((id) => next.add(id));
      try {
        localStorage.setItem(visitedEligibleClientsKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new Event("dept_clients_visited_updated"));
      }, 0);
    }
  };

  const markStaffVisited = () => {
    setVisitedStaff(true);
    try {
      localStorage.setItem(visitedStaffKey, "true");
    } catch (e) {
      console.error(e);
    }
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new Event("dept_clients_visited_updated"));
      }, 0);
    }
  };

  const handleMarkSubmissionViewed = (taskId: number, taskOrKey?: any) => {
    let keyToMark: string;
    if (typeof taskOrKey === "string" && taskOrKey.includes("_")) {
      keyToMark = taskOrKey;
    } else {
      let foundTask: any = null;
      for (const c of clientsData) {
        const t = c.tasks.find((item) => item.assigned_task_id === taskId);
        if (t) {
          foundTask = t;
          break;
        }
      }
      keyToMark = foundTask ? getTaskSubmissionKey(foundTask) : `${taskId}_sub`;
    }

    setViewedSubmissionKeys((prev) => {
      if (prev.has(keyToMark)) return prev;
      const next = new Set(prev).add(keyToMark);
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new Event("dept_clients_viewed_updated"));
      }, 0);
    }
  };

  const handleRejectTask = (taskId: number) => {
    const prefix = `${taskId}_`;

    setViewedSubmissionKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const k of next) {
        if (k.startsWith(prefix) || k === String(taskId)) {
          next.delete(k);
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error(e);
        }
      }
      return changed ? next : prev;
    });

    setSessionAcknowledgedKeys((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const k of next) {
        if (k.startsWith(prefix) || k === String(taskId)) {
          next.delete(k);
          changed = true;
        }
      }
      if (changed) {
        try {
          localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error(e);
        }
      }
      return changed ? next : prev;
    });

    if (typeof window !== "undefined") {
      setTimeout(() => {
        window.dispatchEvent(new Event("dept_clients_viewed_updated"));
      }, 0);
    }
  };

  const getUnviewedSubmissions = (client: DepartmentClientItem) => {
    return client.tasks.filter((t) => {
      if (t.status !== "Submitted" && t.status !== "Verified" && t.status !== "Flagged") {
        return false;
      }
      const key = getTaskSubmissionKey(t);
      return !viewedSubmissionKeys.has(key);
    });
  };

  const getLatestSubmissionTime = (client: DepartmentClientItem): number => {
    const submittedTasks = client.tasks.filter(
      (t) => t.status === "Submitted" || t.status === "Verified" || t.status === "Flagged"
    );
    const times = submittedTasks
      .map((t) => {
        if (t.uploaded_at) {
          const time = new Date(t.uploaded_at).getTime();
          if (!isNaN(time) && time > 0) return time;
        }
        if (t.assigned_at) {
          const time = new Date(t.assigned_at).getTime();
          if (!isNaN(time) && time > 0) return time;
        }
        return 0;
      })
      .filter((time) => time > 0);
    return times.length > 0 ? Math.max(...times) : 0;
  };

  const isClientElevated = (client: DepartmentClientItem) => {
    const unviewed = getUnviewedSubmissions(client);
    if (unviewed.length === 0) return false;
    return unviewed.some((t) => {
      const key = getTaskSubmissionKey(t);
      return !sessionAcknowledgedKeys.has(key);
    });
  };

  // Keep current elevated submission keys synchronized in a ref
  useEffect(() => {
    const keys: string[] = [];
    for (const client of clientsData) {
      const unviewed = getUnviewedSubmissions(client);
      for (const t of unviewed) {
        const key = getTaskSubmissionKey(t);
        if (!sessionAcknowledgedKeys.has(key)) {
          keys.push(key);
        }
      }
    }
    currentElevatedKeysRef.current = keys;
  }, [clientsData, viewedSubmissionKeys, sessionAcknowledgedKeys]);

  // One-time section navigation eligible clients acknowledgment
  const ackEligibleSessionStorageKey = `dept_ack_eligible_v2_${(departmentName || "default").trim().toLowerCase()}`;
  const [sessionAcknowledgedEligibleIds, setSessionAcknowledgedEligibleIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored =
        localStorage.getItem(ackEligibleSessionStorageKey) ||
        sessionStorage.getItem(ackEligibleSessionStorageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const currentlyHighlightedEligibleIdsRef = useRef<string[]>([]);
  const prevClientStateMapRef = useRef<
    Map<string, { isLocked: boolean; status: string; signedDepartments: number }>
  >(new Map());

  // Dynamic eligibility transition & acknowledgment lifecycle:
  // Whenever a client transitions to eligible (e.g. prerequisite signed in DB, or reopened from signed),
  // OR when a client is not eligible (locked or signed), we automatically prune their ID from
  // sessionAcknowledgedEligibleIds and visitedEligibleClientIds so testing and repeated eligibility
  // consistently triggers notification badges and the one-time section yellow highlight!
  useEffect(() => {
    if (clientsData.length === 0) return;

    const prevMap = prevClientStateMapRef.current;
    const newlyEligibleClientIds: string[] = [];
    const nonEligibleClientIds: string[] = [];

    for (const c of clientsData) {
      const prev = prevMap.get(c.id);

      if (c.isLocked || c.status === "Signed") {
        nonEligibleClientIds.push(c.id);
      } else {
        // Client is currently eligible
        if (prev) {
          const wasLocked = prev.isLocked && !c.isLocked;
          const wasSigned = prev.status === "Signed" && c.status === "Pending";
          const deptSignedChanged = prev.signedDepartments !== c.signedDepartments;

          if (wasLocked || wasSigned || deptSignedChanged) {
            newlyEligibleClientIds.push(c.id);
          }
        }
      }

      // Update state ref
      prevMap.set(c.id, {
        isLocked: c.isLocked,
        status: c.status,
        signedDepartments: c.signedDepartments,
      });
    }

    const idsToPrune = Array.from(new Set([...nonEligibleClientIds, ...newlyEligibleClientIds]));

    if (idsToPrune.length > 0) {
      setSessionAcknowledgedEligibleIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of idsToPrune) {
          if (next.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        if (changed) {
          try {
            localStorage.setItem(ackEligibleSessionStorageKey, JSON.stringify(Array.from(next)));
          } catch (e) {
            console.error(e);
          }
          return next;
        }
        return prev;
      });

      setVisitedEligibleClientIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const id of idsToPrune) {
          if (next.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        if (changed) {
          try {
            localStorage.setItem(visitedEligibleClientsKey, JSON.stringify(Array.from(next)));
          } catch (e) {
            console.error(e);
          }
          setTimeout(() => {
            window.dispatchEvent(new Event("dept_clients_visited_updated"));
          }, 0);
          return next;
        }
        return prev;
      });
    }
  }, [clientsData, ackEligibleSessionStorageKey, visitedEligibleClientsKey]);

  const prevTaskStateMapRef = useRef<
    Map<number, { status: string; uploaded_at?: string | null; dropbox?: string | null }>
  >(new Map());

  // Dynamic task transition tracking:
  // Detects when tasks are rejected, resubmitted, or updated with new documents,
  // and automatically purges old viewed keys and session acknowledgment keys
  // so resubmissions reliably trigger elevation and notification badges!
  useEffect(() => {
    if (clientsData.length === 0) return;

    const prevMap = prevTaskStateMapRef.current;
    const taskIdsToReset: number[] = [];

    for (const client of clientsData) {
      for (const task of client.tasks) {
        const prev = prevMap.get(task.assigned_task_id);
        const isCurrentSubmitted =
          task.status === "Submitted" || task.status === "Verified" || task.status === "Flagged";

        if (prev) {
          const wasRejected = prev.status === "Rejected";
          const resubmittedAfterReject = wasRejected && isCurrentSubmitted;
          const uploadTimestampChanged =
            Boolean(prev.uploaded_at && task.uploaded_at && prev.uploaded_at !== task.uploaded_at);
          const dropboxChanged =
            Boolean(prev.dropbox && task.dropbox && prev.dropbox !== task.dropbox);
          const newlyRejected = task.status === "Rejected" && prev.status !== "Rejected";

          if (resubmittedAfterReject || uploadTimestampChanged || dropboxChanged || newlyRejected) {
            taskIdsToReset.push(task.assigned_task_id);
          }
        }

        prevMap.set(task.assigned_task_id, {
          status: task.status,
          uploaded_at: task.uploaded_at,
          dropbox: task.dropbox,
        });
      }
    }

    if (taskIdsToReset.length > 0) {
      const resetSet = new Set(taskIdsToReset);

      setViewedSubmissionKeys((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const k of next) {
          const taskIdFromKey = parseInt(k.split("_")[0], 10);
          if (resetSet.has(taskIdFromKey) || resetSet.has(Number(k))) {
            next.delete(k);
            changed = true;
          }
        }
        if (changed) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
          } catch (e) {
            console.error(e);
          }
        }
        return changed ? next : prev;
      });

      setSessionAcknowledgedKeys((prev) => {
        const next = new Set(prev);
        let changed = false;
        for (const k of next) {
          const taskIdFromKey = parseInt(k.split("_")[0], 10);
          if (resetSet.has(taskIdFromKey) || resetSet.has(Number(k))) {
            next.delete(k);
            changed = true;
          }
        }
        if (changed) {
          try {
            localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
          } catch (e) {
            console.error(e);
          }
        }
        return changed ? next : prev;
      });

      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.dispatchEvent(new Event("dept_clients_viewed_updated"));
        }, 0);
      }
    }
  }, [clientsData, storageKey, ackSessionStorageKey]);

  // Check if a client is eligible to be highlighted in yellow (one-time on navigating to section)
  const isClientEligibleHighlighted = (client: DepartmentClientItem) => {
    // 1. Must be eligible to sign and not signed
    if (client.isLocked || client.status === "Signed") return false;

    // 2. Do not apply to clients who submitted
    const hasSubmitted = client.tasks.some(
      (t) => t.status === "Submitted" || t.status === "Verified" || t.status === "Flagged"
    );
    if (hasSubmitted) return false;

    // 3. Must not have already been acknowledged in session
    if (sessionAcknowledgedEligibleIds.has(client.id)) return false;

    // 4. ONLY when the department staff has navigated to the said section
    if (client.type === "student") {
      if (!sectionFilter || sectionFilter === "all" || sectionFilter.trim() === "") {
        return false;
      }
      return (
        String(client.sectionId) === sectionFilter || client.sectionCode === sectionFilter
      );
    }

    if (client.type === "staff") {
      return clientType === "staff";
    }

    return false;
  };

  // Keep currently highlighted eligible client IDs synchronized in a ref
  useEffect(() => {
    const ids: string[] = [];
    for (const client of clientsData) {
      if (isClientEligibleHighlighted(client)) {
        ids.push(client.id);
      }
    }
    currentlyHighlightedEligibleIdsRef.current = ids;
  });

  // Acknowledge elevated submissions on filter/tab changes
  const acknowledgeElevatedSubmissions = () => {
    if (currentElevatedKeysRef.current.length === 0) return;
    setSessionAcknowledgedKeys((prev) => {
      const next = new Set(prev);
      currentElevatedKeysRef.current.forEach((k) => next.add(k));
      try {
        localStorage.setItem(ackSessionStorageKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Acknowledge highlighted eligible clients on filter/tab changes
  const acknowledgeHighlightedEligibleClients = () => {
    if (currentlyHighlightedEligibleIdsRef.current.length === 0) return;
    setSessionAcknowledgedEligibleIds((prev) => {
      const next = new Set(prev);
      currentlyHighlightedEligibleIdsRef.current.forEach((id) => next.add(id));
      try {
        localStorage.setItem(ackEligibleSessionStorageKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const acknowledgeSessionHighlights = () => {
    acknowledgeElevatedSubmissions();
    acknowledgeHighlightedEligibleClients();
    if (sectionFilter && sectionFilter !== "all" && sectionFilter.trim() !== "") {
      markSectionVisited(sectionFilter);
    }
  };

  // On genuine unmount (navigating away to other pages / navs), persist acknowledgment so return visit reverts to default
  useEffect(() => {
    return () => {
      // Guard against React 18 StrictMode instant unmount (< 1000ms)
      if (Date.now() - mountedAtRef.current > 1000) {
        if (currentElevatedKeysRef.current.length > 0) {
          try {
            const stored =
              localStorage.getItem(ackSessionStorageKey) ||
              sessionStorage.getItem(ackSessionStorageKey);
            const existing: string[] = stored ? JSON.parse(stored) : [];
            const merged = Array.from(new Set([...existing, ...currentElevatedKeysRef.current]));
            localStorage.setItem(ackSessionStorageKey, JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }
        }
        if (currentlyHighlightedEligibleIdsRef.current.length > 0) {
          try {
            const stored =
              localStorage.getItem(ackEligibleSessionStorageKey) ||
              sessionStorage.getItem(ackEligibleSessionStorageKey);
            const existing: string[] = stored ? JSON.parse(stored) : [];
            const merged = Array.from(new Set([...existing, ...currentlyHighlightedEligibleIdsRef.current]));
            localStorage.setItem(ackEligibleSessionStorageKey, JSON.stringify(merged));
          } catch (e) {
            console.error(e);
          }
        }
      }
    };
  }, [ackSessionStorageKey, ackEligibleSessionStorageKey]);

  // Also catch window unload/page refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Date.now() - mountedAtRef.current > 1000) {
        if (currentElevatedKeysRef.current.length > 0) {
          try {
            const stored =
              localStorage.getItem(ackSessionStorageKey) ||
              sessionStorage.getItem(ackSessionStorageKey);
            const existing: string[] = stored ? JSON.parse(stored) : [];
            const merged = Array.from(new Set([...existing, ...currentElevatedKeysRef.current]));
            localStorage.setItem(ackSessionStorageKey, JSON.stringify(merged));
          } catch {}
        }
        if (currentlyHighlightedEligibleIdsRef.current.length > 0) {
          try {
            const stored =
              localStorage.getItem(ackEligibleSessionStorageKey) ||
              sessionStorage.getItem(ackEligibleSessionStorageKey);
            const existing: string[] = stored ? JSON.parse(stored) : [];
            const merged = Array.from(new Set([...existing, ...currentlyHighlightedEligibleIdsRef.current]));
            localStorage.setItem(ackEligibleSessionStorageKey, JSON.stringify(merged));
          } catch {}
        }
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [ackSessionStorageKey, ackEligibleSessionStorageKey]);

  const totalUnviewedSubmissions = useMemo(() => {
    return clientsData.reduce((acc, c) => acc + getUnviewedSubmissions(c).length, 0);
  }, [clientsData, viewedSubmissionKeys]);

  const totalSubmittedClients = useMemo(() => {
    return clientsData.filter((c) => {
      if (clientType === "students" && c.type !== "student") return false;
      if (clientType === "staff" && c.type !== "staff") return false;
      return c.tasks.some(
        (t) => t.status === "Submitted" || t.status === "Verified" || t.status === "Flagged"
      );
    }).length;
  }, [clientsData, clientType]);

  // Eligible sections that haven't been visited yet (for student eligibility badges)
  const eligibleSectionsSet = useMemo(() => {
    const set = new Set<string>();
    for (const client of clientsData) {
      if (client.type === "student" && !client.isLocked && client.status !== "Signed") {
        if (!visitedEligibleClientIds.has(client.id)) {
          if (client.sectionId) {
            set.add(String(client.sectionId));
          }
          if (client.sectionCode) {
            if (client.courseName) {
              set.add(`${client.courseName.toLowerCase().trim()}::${client.sectionCode}`);
              set.add(`${shrinkCourseName(client.courseName).toLowerCase().trim()}::${client.sectionCode}`);
            }
            if (client.courseId) {
              set.add(`${client.courseId}::${client.sectionCode}`);
            }
          }
        }
      }
    }
    return set;
  }, [clientsData, visitedEligibleClientIds]);

  // Eligible courses that have at least one unvisited eligible section
  const eligibleCoursesSet = useMemo(() => {
    const set = new Set<string>();
    for (const client of clientsData) {
      if (client.type === "student" && !client.isLocked && client.status !== "Signed") {
        if (!visitedEligibleClientIds.has(client.id)) {
          if (client.courseName) {
            set.add(client.courseName.toLowerCase().trim());
            set.add(shrinkCourseName(client.courseName).toLowerCase().trim());
          }
          if (client.courseId) {
            set.add(String(client.courseId));
          }
        }
      }
    }
    return set;
  }, [clientsData, visitedEligibleClientIds]);

  const hasEligibleStudents = eligibleSectionsSet.size > 0;
  const hasEligibleStaff =
    !visitedStaff &&
    clientsData.some((c) => c.type === "staff" && !c.isLocked && c.status !== "Signed");

  const hasUnviewedSubmissions = useMemo(() => {
    return clientsData.some((c) => {
      if (clientType === "students" && c.type !== "student") return false;
      if (clientType === "staff" && c.type !== "staff") return false;
      return getUnviewedSubmissions(c).length > 0;
    });
  }, [clientsData, clientType, viewedSubmissionKeys]);

  // When submissions status is active, only show courses that have clients with submissions
  const displayedCourses = useMemo(() => {
    if (selectedStatus === "submissions") {
      const submittedCourseNames = new Set<string>();
      clientsData.forEach((client) => {
        if (client.type === "student" && client.courseName) {
          const hasSubmission = client.tasks.some(
            (t) => t.status === "Submitted" || t.status === "Verified" || t.status === "Flagged"
          );
          if (hasSubmission) {
            submittedCourseNames.add(client.courseName.toLowerCase().trim());
          }
        }
      });

      return coursesData.filter((course) => {
        const cName = course.course_name.toLowerCase().trim();
        const sName = shrinkCourseName(course.course_name).toLowerCase().trim();
        return (
          submittedCourseNames.has(cName) ||
          submittedCourseNames.has(sName) ||
          Array.from(submittedCourseNames).some((sub) => sub.includes(cName) || cName.includes(sub))
        );
      });
    }
    return coursesData;
  }, [coursesData, clientsData, selectedStatus]);

  useEffect(() => {
    if (
      !isLoadingClients &&
      coursesData.length > 0 &&
      selectedStatus === "submissions" &&
      courseFilter !== "all"
    ) {
      const isAvailable = displayedCourses.some(
        (c) =>
          c.course_name.toLowerCase() === courseFilter.toLowerCase() ||
          shrinkCourseName(c.course_name).toLowerCase() === courseFilter.toLowerCase()
      );
      if (!isAvailable) {
        setCourseFilter("all");
        setSectionFilter("all");
      }
    }
  }, [selectedStatus, courseFilter, displayedCourses, isLoadingClients, coursesData.length]);

  useEffect(() => {
    if (
      !isLoadingClients &&
      selectedStatus === "submissions" &&
      totalSubmittedClients === 0 &&
      !searchParams?.get("status")
    ) {
      setSelectedStatus("all");
    }
  }, [selectedStatus, totalSubmittedClients, isLoadingClients, searchParams]);

  // Selection & Detail Overlay States
  const [clearanceId, setClearanceId] = useState<string[]>([]);

  // Task Creation States for AddTask Dialog
  const [taskId, setTaskId] = useState<string[]>([]);
  const [description, setDescription] = useState<string>("");
  const [title, setTitle] = useState<string>("");

  const selectedClientsTasks = useMemo(() => {
    if (clearanceId.length === 0) return [];
    const selected = clientsData.filter((c) => clearanceId.includes(c.clearanceId));
    return selected.flatMap((c) => c.tasks);
  }, [clearanceId, clientsData]);

  // Realtime Supabase Sync
  useEffect(() => {
    const channelId = `dept-clients-sync-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_records" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["department-clients"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["staff-clearance"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clearance_tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["department-clients"] });
          queryClient.invalidateQueries({ queryKey: ["students"] });
          queryClient.invalidateQueries({ queryKey: ["staff-clearance"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, supabase]);

  // Sync selectedClient with live query data updates (e.g. after approving a task)
  useEffect(() => {
    if (selectedClient && clientsData.length > 0) {
      const updated = clientsData.find((c) => c.id === selectedClient.id);
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clientsData, selectedClient?.id]);

  // Table container scroll refs for resetting scroll position on page change
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Lock main layout scroll on clients page to keep layout fixed and non-scrollable
  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      const originalOverflow = mainEl.style.overflowY;
      mainEl.scrollTop = 0;
      mainEl.style.overflowY = "hidden";
      return () => {
        mainEl.style.overflowY = originalOverflow;
      };
    }
  }, []);

  // Master Filter & Sort Pipeline
  const filteredClients = useMemo(() => {
    const list = clientsData.filter((client) => {
      // 1. Client Type filter
      if (clientType === "students" && client.type !== "student") return false;
      if (clientType === "staff" && client.type !== "staff") return false;

      // 2. Course filter (active only for students)
      if (clientType === "students" && courseFilter !== "all") {
        if (!client.courseName) return false;
        const matchesName =
          client.courseName.toLowerCase() === courseFilter.toLowerCase() ||
          shrinkCourseName(client.courseName).toLowerCase() === courseFilter.toLowerCase() ||
          String(client.courseId) === courseFilter;
        if (!matchesName) return false;
      }

      // 3. Section filter (active only for students when a course is selected)
      if (clientType === "students" && courseFilter !== "all" && sectionFilter !== "all") {
        const cleanSectionFilter = sectionFilter.includes(" ")
          ? sectionFilter.split(" ").slice(1).join(" ").trim()
          : sectionFilter.trim();

        const matchesSection =
          String(client.sectionId) === sectionFilter ||
          String(client.sectionId) === cleanSectionFilter ||
          client.sectionCode === sectionFilter ||
          client.sectionCode === cleanSectionFilter ||
          (client.sectionCode ? sectionFilter.endsWith(client.sectionCode) : false);

        if (!matchesSection) return false;
      }

      // 4. Status filter: submissions, pending, incomplete, cleared
      if (selectedStatus === "submissions") {
        const hasSubmission = client.tasks.some(
          (t) => t.status === "Submitted" || t.status === "Verified" || t.status === "Flagged"
        );
        if (!hasSubmission) return false;
      } else if (selectedStatus === "pending") {
        if (client.isLocked && client.status !== "Signed") return false;
        const isPending = client.departmentStatus === "pending";
        const isElevatedSubmission = isClientElevated(client);
        if (!isPending && !isElevatedSubmission) return false;
      } else if (selectedStatus !== "all") {
        if (client.departmentStatus !== selectedStatus) return false;
      }

      // 5. Search Query
      if (search.trim() !== "") {
        const query = search.trim().toLowerCase();
        const matchesName = client.name.toLowerCase().includes(query);
        const matchesId = client.id.toLowerCase().includes(query);
        const matchesCourse = client.courseName?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesId && !matchesCourse) return false;
      }

      return true;
    });

    const sortSubmissionsList = (items: DepartmentClientItem[]) => {
      const isOld = selectedSort === "old";
      return [...items].sort((a, b) => {
        const timeA = getLatestSubmissionTime(a);
        const timeB = getLatestSubmissionTime(b);
        if (timeB !== timeA) {
          return isOld ? timeA - timeB : timeB - timeA;
        }
        const comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        if (comp !== 0) return comp;
        return a.id.localeCompare(b.id);
      });
    };

    const sortStandardList = (items: DepartmentClientItem[]) => {
      return [...items].sort((a, b) => {
        if (selectedSort === "a-z") {
          const comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
          if (comp !== 0) return comp;
          return a.id.localeCompare(b.id);
        }

        if (selectedSort === "z-a") {
          const comp = b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
          if (comp !== 0) return comp;
          return b.id.localeCompare(a.id);
        }

        // Default: pending -> incomplete -> cleared -> awaiting prerequisite (all ascending by name within group)
        const rankA = getClientDefaultSortRank(a);
        const rankB = getClientDefaultSortRank(b);

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        const comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        if (comp !== 0) return comp;
        return a.id.localeCompare(b.id);
      });
    };

    // When viewing "all", "pending", or "submissions" and there are unviewed submissions:
    // elevate those clients to the very top (sorted by latest submission time descending)
    const isElevationEligibleStatus =
      selectedStatus === "all" || selectedStatus === "pending" || selectedStatus === "submissions";

    if (isElevationEligibleStatus) {
      const elevated: DepartmentClientItem[] = [];
      const regular: DepartmentClientItem[] = [];

      for (const client of list) {
        if (isClientElevated(client)) {
          elevated.push(client);
        } else {
          regular.push(client);
        }
      }

      if (elevated.length > 0) {
        elevated.sort((a, b) => {
          const timeA = getLatestSubmissionTime(a);
          const timeB = getLatestSubmissionTime(b);
          if (timeB !== timeA) return timeB - timeA;
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        });

        const sortedRegular =
          selectedStatus === "submissions"
            ? sortSubmissionsList(regular)
            : sortStandardList(regular);

        return [...elevated, ...sortedRegular];
      }

      return selectedStatus === "submissions"
        ? sortSubmissionsList(regular)
        : sortStandardList(regular);
    }

    return sortStandardList(list);
  }, [
    clientsData,
    clientType,
    courseFilter,
    sectionFilter,
    selectedStatus,
    search,
    selectedSort,
    sessionAcknowledgedKeys,
    viewedSubmissionKeys,
  ]);

  // Set of client IDs that are temporarily elevated to the top of the list
  const elevatedClientIds = useMemo(() => {
    const isElevationEligibleStatus =
      selectedStatus === "all" || selectedStatus === "pending" || selectedStatus === "submissions";
    if (!isElevationEligibleStatus) return new Set<string>();

    const set = new Set<string>();
    for (const client of filteredClients) {
      if (isClientElevated(client)) {
        set.add(client.id);
      }
    }
    return set;
  }, [selectedStatus, filteredClients, sessionAcknowledgedKeys, viewedSubmissionKeys]);

  // First non-elevated client ID to delineate the separation boundary
  const firstRegularClientId = useMemo(() => {
    if (elevatedClientIds.size === 0) return null;
    const firstRegular = filteredClients.find((c) => !elevatedClientIds.has(c.id));
    return firstRegular ? firstRegular.id : null;
  }, [filteredClients, elevatedClientIds]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    return filteredClients.slice(
      (currentPage - 1) * PAGE_SIZE,
      currentPage * PAGE_SIZE
    );
  }, [filteredClients, currentPage]);

  // Determine active section id for adding tasks
  const activeSectionId = useMemo(() => {
    if (sectionFilter !== "all" && sectionFilter.trim() !== "") {
      return sectionFilter;
    }
    const firstStudent = filteredClients.find((c) => c.type === "student" && c.sectionId);
    return firstStudent?.sectionId ? String(firstStudent.sectionId) : null;
  }, [sectionFilter, filteredClients]);

  // Selected Clients for Batch Actions
  const selectedIds = useMemo(() => new Set(clearanceId), [clearanceId]);
  const selectedClients = useMemo(
    () => clientsData.filter((client) => selectedIds.has(client.clearanceId)),
    [clientsData, selectedIds]
  );

  // Group status calculation for sign toggle
  const effectiveStatus = useMemo(() => {
    if (selectedClients.length === 0) return "";
    return selectedClients.every((s) => s.status === "Signed") ? "Signed" : "Pending";
  }, [selectedClients]);

  // Signable IDs (filter out clients that are locked due to prerequisite phase)
  const signableClearanceIds = useMemo(() => {
    return selectedClients
      .filter((c) => !c.isLocked || c.status === "Signed")
      .map((c) => c.clearanceId);
  }, [selectedClients]);

  const batchHasPendingTasks = useMemo(() => {
    return selectedClients.some(
      (c) =>
        c.status !== "Signed" &&
        c.tasks &&
        c.tasks.some((t) => t.status !== "Cleared")
    );
  }, [selectedClients]);

  const batchPendingTasksCount = useMemo(() => {
    return selectedClients.reduce(
      (acc, c) =>
        c.status !== "Signed" && c.tasks
          ? acc +
            c.tasks.filter((t) => t.status !== "Cleared").length
          : acc,
      0
    );
  }, [selectedClients]);

  const handleCheckboxToggle = (cId: string, checked: boolean) => {
    setClearanceId((prev) =>
      checked ? [...prev, cId] : prev.filter((id) => id !== cId)
    );
  };

  if (isLoadingClients) {
    return (
      <div className="flex h-[calc(100vh-112px)] items-center justify-center text-sm text-slate-400">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span>Loading client directory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-h-[calc(100vh-112px)] overflow-hidden gap-4">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
            Clients
          </h1>
          <p className="text-sm text-slate-400">
            Review and sign off on clearance requirements for students and staff
          </p>
        </div>

        {/* ── Batch Action Operations ── */}
        <div className="flex flex-wrap items-center gap-2.5">
          <SignToggleButton
            clearanceId={signableClearanceIds}
            currentStatus={effectiveStatus}
            hasPendingTasks={batchHasPendingTasks}
            pendingTasksCount={batchPendingTasksCount}
            clientName={
              selectedClients.length === 1 ? selectedClients[0]?.name : undefined
            }
          />

          {preset && (
            <div className="flex items-center rounded-xl border border-slate-800 bg-[#0a101f] p-1 shadow-sm gap-1">
              <AddTask
                preset={preset}
                clearanceId={clearanceId}
                taskId={taskId}
                description={description}
                setDescription={setDescription}
                title={title}
                setTitle={setTitle}
                sectionId={activeSectionId}
                existingTasks={selectedClientsTasks}
                buttonClassName="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              />
              <div className="mx-0.5 h-3.5 w-px bg-slate-800" />
              <AddPreset
                preset={preset}
                taskId={taskId}
                setTaskId={setTaskId}
                clearanceId={clearanceId}
                description={description}
                sectionId={activeSectionId}
                existingTasks={selectedClientsTasks}
                buttonClassName="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              />
              <div className="mx-0.5 h-3.5 w-px bg-slate-800" />
              <ManagePresetButton
                preset={preset}
                buttonClassName="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Client Filter Toolbar ── */}
      <div className="shrink-0">
        <ClientFilterToolbar
          allCount={clientsData.length}
          studentsCount={clientsData.filter((c) => c.type === "student").length}
          staffCount={clientsData.filter((c) => c.type === "staff").length}
          filteredCount={filteredClients.length}
          submissionsCount={totalSubmittedClients}
          hasEligibleStudents={hasEligibleStudents}
          hasEligibleStaff={hasEligibleStaff}
          eligibleCourses={eligibleCoursesSet}
          eligibleSections={eligibleSectionsSet}
          hasUnviewedSubmissions={hasUnviewedSubmissions}
          clientType={clientType}
          onClientTypeChange={(type) => {
            acknowledgeSessionHighlights();
            setClientType(type);
            if (type === "staff") {
              markStaffVisited();
            }
            if (type !== "students") {
              setCourseFilter("all");
              setSectionFilter("all");
            }
            setCurrentPage(1);
          }}
          searchQuery={search}
          onSearchChange={(query) => {
            setSearch(query);
            setCurrentPage(1);
          }}
          selectedSort={selectedSort}
          onSortChange={(sort) => {
            acknowledgeSessionHighlights();
            setSelectedSort(sort);
            setCurrentPage(1);
          }}
          selectedStatus={selectedStatus}
          onStatusChange={(status) => {
            acknowledgeSessionHighlights();
            setSelectedStatus(status);
            if (status === "submissions") {
              if (selectedSort !== "old") {
                setSelectedSort("latest");
              }
            } else {
              if (selectedSort === "latest" || selectedSort === "old") {
                setSelectedSort("default");
              }
            }
            setCurrentPage(1);
          }}
          courses={displayedCourses}
          selectedCourse={courseFilter}
          onCourseChange={(course) => {
            acknowledgeSessionHighlights();
            setCourseFilter(course);
            setSectionFilter("all");
            setCurrentPage(1);
          }}
          selectedSection={sectionFilter}
          onSectionChange={(section) => {
            acknowledgeSessionHighlights();
            setSectionFilter(section);
            if (section !== "all" && section.trim() !== "") {
              markSectionVisited(section);
            }
            setCurrentPage(1);
          }}
        />
      </div>

      {/* ── Selection Feedback Banner ── */}
      {clearanceId.length > 0 && (
        <div className="shrink-0 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {clearanceId.length} {clearanceId.length === 1 ? "client" : "clients"} selected
            </span>
            <span className="text-amber-400/60">•</span>
            <span className="text-amber-400/80">
              {signableClearanceIds.length} eligible for signing
            </span>
          </div>
          <button
            type="button"
            onClick={() => setClearanceId([])}
            className="font-medium text-amber-400 underline hover:text-amber-200 transition-colors cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Clients Table Card (Dark Theme) ── */}
      <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-800 bg-[#0a101f] shadow-2xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:flex md:flex-col flex-1 min-h-0 overflow-hidden">
          <div ref={tableScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[52%]" />
                <col className="w-[24%]" />
                <col className="w-[20%]" />
                <col className="w-[4%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[#070c18] border-b border-slate-800 shadow-xs">
                <tr className="border-b border-slate-800 bg-[#070c18]">
                <th className="px-6 py-4 text-left text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  <div className="flex items-center gap-3">
                    <SelectAll
                      students={filteredClients as any}
                      clearanceId={clearanceId}
                      setClearanceId={setClearanceId}
                      effectiveStatus={effectiveStatus}
                    />
                    <span>CLIENT</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  TYPE / PROGRAM
                </th>
                <th className="px-6 py-4 text-center text-[11px] font-bold tracking-wider uppercase text-slate-400">
                  STATUS
                </th>
                <th className="w-12 px-4 py-4 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-sm text-slate-400">
                    No clients match your selected filters.
                  </td>
                </tr>
              ) : (
                paginated.map((client, index) => {
                  const isElevated = elevatedClientIds.has(client.id);
                  const showNewSubmissionsHeader = currentPage === 1 && index === 0 && isElevated;
                  const showRegularDivider = client.id === firstRegularClientId;

                  const isEligibleYellow = isClientEligibleHighlighted(client);

                  const isChecked = clearanceId.includes(client.clearanceId);
                  const unviewedSubmissionsCount = getUnviewedSubmissions(client).length;

                  const isSelectedGroupSigned = effectiveStatus === "Signed";
                  const isThisClientSigned = client.status === "Signed";
                  const isCheckboxDisabled =
                    selectedClients.length > 0 &&
                    isSelectedGroupSigned !== isThisClientSigned;

                  return (
                    <Fragment key={`${client.type}-${client.id}`}>
                      {showNewSubmissionsHeader && (
                        <tr key="header-new-submissions" className="border-b border-amber-500/25 bg-amber-500/10">
                          <td colSpan={4} className="px-6 py-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                                  New Submissions
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {showRegularDivider && (
                        <tr key="header-all-clients" className="border-y border-slate-800 bg-[#070c18]">
                          <td colSpan={4} className="px-6 py-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                {selectedStatus === "submissions"
                                  ? "All Submissions"
                                  : selectedStatus === "pending"
                                  ? "Pending Clients"
                                  : "All Clients"}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Standard directory
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr
                        onClick={() => setSelectedClient(client)}
                        className={`group border-b transition-colors cursor-pointer ${
                          isElevated
                            ? "border-amber-500/20 bg-amber-500/[0.03] hover:bg-amber-500/[0.08]"
                            : isEligibleYellow
                            ? "border-yellow-500/30 bg-yellow-500/15 hover:bg-yellow-500/20"
                            : "border-slate-800/60 hover:bg-slate-800/40"
                        }`}
                      >
                      {/* CLIENT Column - Left aligned */}
                      <td className="px-6 py-4 text-left overflow-hidden">
                        <div className="flex items-center gap-3.5 min-w-0 max-w-full">
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <Checkbox
                              checked={isChecked}
                              disabled={isCheckboxDisabled}
                              onCheckedChange={(checked) =>
                                handleCheckboxToggle(client.clearanceId, Boolean(checked))
                              }
                              className="cursor-pointer border-slate-700 bg-slate-900/80 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950"
                            />
                          </div>

                          <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                            {getClientInitials(client.name)}
                          </div>

                          <div className="min-w-0 text-left overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-semibold text-slate-100 text-sm truncate max-w-[170px] lg:max-w-[240px] xl:max-w-[300px]"
                                title={client.name}
                              >
                                {client.name}
                              </span>
                            </div>
                            <div className="font-mono text-xs text-slate-500 truncate flex items-center gap-1.5">
                              <span>{client.id}</span>
                              {selectedStatus === "submissions" && (() => {
                                const subTime = getLatestSubmissionTime(client);
                                if (!subTime) return null;
                                return (
                                  <>
                                    <span className="text-slate-600">·</span>
                                    <span
                                      title={`Submitted: ${new Date(subTime).toLocaleString()}`}
                                      className="text-slate-500 font-normal"
                                    >
                                      {formatTimeElapsed(subTime)}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TYPE / PROGRAM Column - Centered */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {client.type === "student" ? (
                          <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-950/40 text-blue-400">
                            <GraduationCap className="w-3.5 h-3.5" />
                            {shrinkCourseName(client.courseName || "") || "STUDENT"}
                            {client.sectionCode && ` · ${client.sectionCode}`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                            STAFF
                          </span>
                        )}
                      </td>

                      {/* STATUS Column - Centered */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="relative inline-flex items-center justify-center">
                          <ClientStatusBadge
                            status={client.departmentStatus}
                            isLocked={client.isLocked}
                            taskCount={client.taskCount}
                          />
                          {unviewedSubmissionsCount > 0 && (
                            <span
                              title={`${unviewedSubmissionsCount} new ${
                                unviewedSubmissionsCount === 1 ? "submission" : "submissions"
                              }`}
                              className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-[#0a101f] animate-in zoom-in duration-150"
                            >
                              {unviewedSubmissionsCount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Chevron Column - Centered */}
                      <td className="w-12 px-4 py-4 text-center">
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors inline-block" />
                      </td>
                    </tr>
                  </Fragment>
                );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Mobile View */}
        <div ref={mobileScrollRef} className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-slate-800/60">
          {paginated.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-400">
              No clients match your selected filters.
            </div>
          ) : (
            paginated.map((client, index) => {
              const isElevated = elevatedClientIds.has(client.id);
              const showNewSubmissionsHeader = currentPage === 1 && index === 0 && isElevated;
              const showRegularDivider = client.id === firstRegularClientId;

              const isEligibleYellow = isClientEligibleHighlighted(client);

              const isChecked = clearanceId.includes(client.clearanceId);
              const unviewedSubmissionsCount = getUnviewedSubmissions(client).length;

              const isSelectedGroupSigned = effectiveStatus === "Signed";
              const isThisClientSigned = client.status === "Signed";
              const isCheckboxDisabled =
                selectedClients.length > 0 &&
                isSelectedGroupSigned !== isThisClientSigned;

              return (
                <Fragment key={`${client.type}-${client.id}`}>
                  {showNewSubmissionsHeader && (
                    <div key="mobile-header-new-submissions" className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/25 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                          New Submissions ({elevatedClientIds.size})
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-400/80">Prioritized on top</span>
                    </div>
                  )}

                  {showRegularDivider && (
                    <div key="mobile-header-all-clients" className="px-4 py-2 bg-[#070c18] border-y border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {selectedStatus === "submissions"
                          ? "All Submissions"
                          : selectedStatus === "pending"
                          ? "Pending Clients"
                          : "All Clients"}
                      </span>
                      <span className="text-[10px] text-slate-500">Standard directory</span>
                    </div>
                  )}

                  <div
                    onClick={() => setSelectedClient(client)}
                    className={`px-4 py-4 space-y-3 transition-colors cursor-pointer ${
                      isElevated
                        ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.07]"
                        : isEligibleYellow
                        ? "bg-yellow-500/15 hover:bg-yellow-500/20 border-y border-yellow-500/30"
                        : "hover:bg-slate-800/30"
                    }`}
                  >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <Checkbox
                          checked={isChecked}
                          disabled={isCheckboxDisabled}
                          onCheckedChange={(checked) =>
                            handleCheckboxToggle(client.clearanceId, Boolean(checked))
                          }
                          className="cursor-pointer border-slate-700 bg-slate-900/80 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 data-[state=checked]:text-slate-950"
                        />
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                        {getClientInitials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">
                          {client.name}
                        </p>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                          <span>{client.id}</span>
                          {selectedStatus === "submissions" && (() => {
                            const subTime = getLatestSubmissionTime(client);
                            if (!subTime) return null;
                            return (
                              <>
                                <span className="text-slate-600">·</span>
                                <span
                                  title={`Submitted: ${new Date(subTime).toLocaleString()}`}
                                  className="text-slate-500 font-normal"
                                >
                                  {formatTimeElapsed(subTime)}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="relative inline-flex items-center justify-center">
                      <ClientStatusBadge
                        status={client.departmentStatus}
                        isLocked={client.isLocked}
                        taskCount={client.taskCount}
                      />
                      {unviewedSubmissionsCount > 0 && (
                        <span
                          title={`${unviewedSubmissionsCount} new ${
                            unviewedSubmissionsCount === 1 ? "submission" : "submissions"
                          }`}
                          className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs ring-2 ring-[#0a101f] animate-in zoom-in duration-150"
                        >
                          {unviewedSubmissionsCount}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {client.type === "student" ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-blue-500/30 bg-blue-950/40 text-blue-400">
                        <GraduationCap className="w-3 h-3" />
                        {shrinkCourseName(client.courseName || "") || "STUDENT"}
                        {client.sectionCode && ` · ${client.sectionCode}`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-500/30 bg-emerald-950/40 text-emerald-400">
                        <Briefcase className="w-3 h-3 text-emerald-400" />
                        STAFF
                      </span>
                    )}
                  </div>
                </div>
              </Fragment>
            );
            })
          )}
        </div>

        {/* Pagination Footer */}
        <TablePaginationFooter
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
          totalItems={filteredClients.length}
          itemLabel={filteredClients.length === 1 ? "client" : "clients"}
          onPageChange={setCurrentPage}
          showJumpToPage={true}
        />
      </div>

      {/* ── Slide-out Client Review Drawer (Dark Theme) ── */}
      {selectedClient !== null && (() => {
        const clientIndex = filteredClients.findIndex((c) => c.id === selectedClient.id);
        const hasPrev = clientIndex > 0;
        const prevClientObj = hasPrev ? filteredClients[clientIndex - 1] : null;
        const hasNext = clientIndex >= 0 && clientIndex < filteredClients.length - 1;
        const nextClientObj = hasNext ? filteredClients[clientIndex + 1] : null;

        return (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={handleCloseDrawer}
            />
            <div className="fixed top-0 right-0 z-50 flex h-full w-[480px] max-w-full min-w-0 flex-col border-l border-slate-800 bg-[#0a101f] shadow-2xl animate-in slide-in-from-right duration-200">
              <TaskView
                studentTasks={selectedClient.tasks as any}
                studentId={selectedClient.id}
                studentName={selectedClient.name}
                clearanceId={selectedClient.clearanceId}
                clientStatus={selectedClient.status}
                selectedStatus={selectedStatus}
                isLocked={selectedClient.isLocked}
                sectionId={selectedClient.sectionId ? String(selectedClient.sectionId) : null}
                preset={preset}
                currentDepartment={departmentName}
                viewType={selectedClient.type === "student" ? "students" : "staff"}
                viewedSubmissionKeys={viewedSubmissionKeys}
                onViewSubmission={handleMarkSubmissionViewed}
                onRejectTask={handleRejectTask}
                initialTaskId={targetTaskId}
                onBack={handleCloseDrawer}
                hasPrevClient={hasPrev}
                prevClientName={prevClientObj?.name}
                onPrevClient={() => {
                  if (prevClientObj) {
                    setSelectedClient(prevClientObj);
                    setTargetTaskId(null);
                  }
                }}
                hasNextClient={hasNext}
                nextClientName={nextClientObj?.name}
                onNextClient={() => {
                  if (nextClientObj) {
                    setSelectedClient(nextClientObj);
                    setTargetTaskId(null);
                  }
                }}
              />
            </div>
          </>
        );
      })()}
    </div>
  );
}
