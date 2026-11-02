import React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Clock,
  Calendar,
  ShieldCheck,
  ClipboardList,
  Bell,
  Info,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { DEPARTMENT_ICON_MAP } from "./department-icons";

export interface NotificationVisual {
  icon: React.ReactNode;
  containerStyle: string;
  dotStyle: string;
}

const UNIFIED_UNREAD_DOT_STYLE = "bg-rose-500 shadow-xs shadow-rose-500/50";

/**
 * Returns a unified, contextual icon and color-accented styling
 * corresponding strictly to the notification type and action:
 * - Requirements Assigned: Yellow (ClipboardList)
 * - Requirements Cleared: Blue (CheckCircle2)
 * - Clearance Signed Off: Emerald (ShieldCheck)
 * - Returned / Rejected: Rose (AlertCircle)
 * - Flagged: Blue (AlertTriangle)
 * - Ready for Signing: Emerald (UserCheck)
 * - Schedule / Office Hours: Cyan (Calendar)
 *
 * All unread notification dot badges are unified to vibrant red.
 */
export function getNotificationVisual(notif: {
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  metadata?: any;
}): NotificationVisual {
  const title = (notif.title || "").toLowerCase();
  const desc = (notif.description || "").toLowerCase();
  const type = (notif.type || "").toLowerCase();
  const fullText = `${title} ${desc}`;

  // 0. Bottleneck Alerts (Admin Pipeline Priority) -> Rose/Amber AlertTriangle
  if (
    title.includes("bottleneck") ||
    notif.category === "bottleneck" ||
    fullText.includes("bottleneck detected") ||
    fullText.includes("stalled clients")
  ) {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />,
      containerStyle: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 0.5. Full Clearance Completed (Admin & Student Milestone) -> Emerald ShieldCheck
  if (
    title.includes("clearance completed") ||
    title.includes("fully cleared") ||
    notif.category === "completion" ||
    fullText.includes("completed all clearance") ||
    fullText.includes("completed all 6 clearance")
  ) {
    return {
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />,
      containerStyle: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 1. Returned or Rejected Submission (Highest urgency action) -> Rose / AlertCircle
  if (
    title.includes("return") ||
    title.includes("reject") ||
    fullText.includes("submission returned") ||
    fullText.includes("submission rejected") ||
    fullText.includes("was returned") ||
    (type === "warning" && (fullText.includes("submission") || fullText.includes("resubmit")))
  ) {
    return {
      icon: <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />,
      containerStyle: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 1.8. Client Authenticity Appeal -> Blue / HelpCircle
  if (
    title.includes("appeal") ||
    fullText.includes("appealed authenticity") ||
    fullText.includes("authenticity appeal") ||
    fullText.includes("appealed for authenticity") ||
    notif.category === "appeal"
  ) {
    return {
      icon: <HelpCircle className="h-4 w-4 text-blue-400 shrink-0" />,
      containerStyle: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 2. Flagged Submission / AI Authenticity Flag -> Blue / AlertTriangle
  if (fullText.includes("flag") || type === "flagged") {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0" />,
      containerStyle: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 2.1 AI-Verified Document for Review -> Amber / Sparkles
  if (
    title.includes("ai-verified") ||
    title.includes("ai verified") ||
    fullText.includes("ai-verified") ||
    fullText.includes("ai verified")
  ) {
    return {
      icon: <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 3. Requirement Cleared -> Blue / CheckCircle2 (requirements cleared: blue)
  if (
    title.includes("requirement cleared") ||
    title.includes("task cleared") ||
    fullText.includes("requirement cleared") ||
    fullText.includes("task cleared") ||
    fullText.includes("has been approved and cleared") ||
    fullText.includes("approved and cleared")
  ) {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />,
      containerStyle: "border-blue-500/30 bg-blue-500/10 text-blue-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 4. Clearance Signed Off -> Emerald / ShieldCheck
  if (
    title.includes("clearance signed off") ||
    title.includes("clearance signed") ||
    (title.includes("signed") && !title.includes("assigned")) ||
    fullText.includes("clearance signed off") ||
    fullText.includes("has been approved and signed") ||
    fullText.includes("approved and signed") ||
    fullText.includes("clearance cleared")
  ) {
    return {
      icon: <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />,
      containerStyle: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 5. Ready for Signing (Department Staff Alert) -> Emerald / UserCheck
  if (
    title.includes("ready for signing") ||
    type === "signing_eligible" ||
    fullText.includes("has met all prerequisites")
  ) {
    return {
      icon: <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />,
      containerStyle: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 6. Requirements Assigned -> Yellow / ClipboardList (requirements assigned: yellow)
  if (
    title.includes("requirement assigned") ||
    title.includes("new requirement") ||
    title.includes("task assigned") ||
    fullText.includes("was assigned by") ||
    fullText.includes("assigned by") ||
    fullText.includes("new requirement assigned") ||
    fullText.includes("task assigned")
  ) {
    return {
      icon: <ClipboardList className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 7. Department Office Hours & Schedules -> Cyan / Calendar
  if (
    fullText.includes("office hours") ||
    fullText.includes("schedule") ||
    fullText.includes("consultation")
  ) {
    return {
      icon: <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />,
      containerStyle: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 8. Overdue & Approaching Deadlines (< 24hrs / Due Soon) -> Red/Rose Clock
  if (
    fullText.includes("overdue") ||
    fullText.includes("past due") ||
    title.includes("task due soon") ||
    notif.category === "deadline" ||
    notif.metadata?.type === "task_due_soon" ||
    fullText.includes("due soon")
  ) {
    return {
      icon: <Clock className="h-4 w-4 text-rose-400 shrink-0" />,
      containerStyle: "border-rose-500/30 bg-rose-500/10 text-rose-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }
  if (
    fullText.includes("deadline") ||
    fullText.includes("due date") ||
    fullText.includes("due today")
  ) {
    return {
      icon: <Clock className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 9. In-Person Physical Verification
  if (
    fullText.includes("in person") ||
    fullText.includes("in-person") ||
    fullText.includes("physical") ||
    fullText.includes("onsite")
  ) {
    return {
      icon: <UserCheck className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 10. General Requirement / Task Fallback -> Yellow / ClipboardList
  if (
    fullText.includes("requirement") ||
    fullText.includes("task")
  ) {
    return {
      icon: <ClipboardList className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 11. Custom metadata icon lookup if explicitly specified
  if (notif.metadata?.iconName && DEPARTMENT_ICON_MAP[notif.metadata.iconName]) {
    const CustomIcon = DEPARTMENT_ICON_MAP[notif.metadata.iconName];
    return {
      icon: <CustomIcon className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 12. System Announcements
  if (type === "system" || fullText.includes("system") || fullText.includes("announcement")) {
    return {
      icon: <Bell className="h-4 w-4 text-amber-400 shrink-0" />,
      containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      dotStyle: UNIFIED_UNREAD_DOT_STYLE,
    };
  }

  // 13. Default Fallback
  return {
    icon: <Info className="h-4 w-4 text-amber-400 shrink-0" />,
    containerStyle: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dotStyle: UNIFIED_UNREAD_DOT_STYLE,
  };
}

/**
 * Backward-compatible helper for retrieving just the notification icon node.
 */
export function getNotifIcon(type: string, title: string, description?: string): React.ReactNode {
  return getNotificationVisual({ title, description, type }).icon;
}

/**
 * Backward-compatible helper for retrieving the container style class string.
 */
export function getIconContainerStyle(type: string, title: string, description?: string): string {
  return getNotificationVisual({ title, description, type }).containerStyle;
}
