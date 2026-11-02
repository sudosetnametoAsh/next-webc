import React from "react";
import {
  Building2,
  Building,
  Landmark,
  School,
  Briefcase,
  ShieldCheck,
  Scale,
  Stamp,
  FileText,
  FileCheck,
  BookOpen,
  GraduationCap,
  Award,
  FileSignature,
  FolderCheck,
  ClipboardCheck,
  Coins,
  DollarSign,
  CreditCard,
  Receipt,
  ReceiptText,
  Monitor,
  Cpu,
  Laptop,
  Server,
  Wifi,
  Code,
  Database,
  Stethoscope,
  HeartPulse,
  Activity,
  Heart,
  Users,
  UserCheck,
  Compass,
  HelpCircle,
  MessageSquare,
  Smile,
  Key,
  Lock,
  Bell,
  Calendar,
  Clock,
  Sparkles,
  MapPin,
  Link2,
  LucideIcon,
} from "lucide-react";

export type IconCategory = "All" | "General" | "Academic" | "Finance" | "Tech" | "Health" | "Services";

export interface DepartmentIconOption {
  name: string;
  label: string;
  category: "General" | "Academic" | "Finance" | "Tech" | "Health" | "Services";
  icon: LucideIcon;
}

export const AVAILABLE_DEPARTMENT_ICONS: DepartmentIconOption[] = [
  // General & Administration
  { name: "Building2", label: "Office Building", category: "General", icon: Building2 },
  { name: "Building", label: "Building", category: "General", icon: Building },
  { name: "School", label: "Campus / School", category: "General", icon: School },
  { name: "Landmark", label: "Institution", category: "General", icon: Landmark },
  { name: "Briefcase", label: "Administration", category: "General", icon: Briefcase },
  { name: "ShieldCheck", label: "Security / Compliance", category: "General", icon: ShieldCheck },
  { name: "Scale", label: "Discipline / Legal", category: "General", icon: Scale },
  { name: "Stamp", label: "Clearance / Stamp", category: "General", icon: Stamp },
  { name: "Key", label: "Property / Access", category: "General", icon: Key },
  { name: "MapPin", label: "Campus Location", category: "General", icon: MapPin },

  // Academic & Records
  { name: "FileText", label: "Registrar / Records", category: "Academic", icon: FileText },
  { name: "FileCheck", label: "Verified Documents", category: "Academic", icon: FileCheck },
  { name: "FileSignature", label: "Endorsements", category: "Academic", icon: FileSignature },
  { name: "BookOpen", label: "Library / Learning", category: "Academic", icon: BookOpen },
  { name: "GraduationCap", label: "Academics / Dean", category: "Academic", icon: GraduationCap },
  { name: "Award", label: "Honors / Awards", category: "Academic", icon: Award },
  { name: "ClipboardCheck", label: "Assessments", category: "Academic", icon: ClipboardCheck },
  { name: "FolderCheck", label: "Student Archives", category: "Academic", icon: FolderCheck },

  // Financial
  { name: "Coins", label: "Cashier / Payments", category: "Finance", icon: Coins },
  { name: "DollarSign", label: "Finance / Billing", category: "Finance", icon: DollarSign },
  { name: "CreditCard", label: "Bursar / Accounts", category: "Finance", icon: CreditCard },
  { name: "Receipt", label: "Receipts / Invoices", category: "Finance", icon: Receipt },
  { name: "ReceiptText", label: "Statements", category: "Finance", icon: ReceiptText },

  // Tech & Laboratories
  { name: "Monitor", label: "Computer Lab", category: "Tech", icon: Monitor },
  { name: "Laptop", label: "IT / Multimedia", category: "Tech", icon: Laptop },
  { name: "Cpu", label: "Engineering Lab", category: "Tech", icon: Cpu },
  { name: "Server", label: "Network / Infrastructure", category: "Tech", icon: Server },
  { name: "Database", label: "Data Center", category: "Tech", icon: Database },
  { name: "Code", label: "Software / Programming", category: "Tech", icon: Code },
  { name: "Wifi", label: "Connectivity", category: "Tech", icon: Wifi },

  // Health & Clinic
  { name: "Stethoscope", label: "Clinic / Medical", category: "Health", icon: Stethoscope },
  { name: "HeartPulse", label: "Health Services", category: "Health", icon: HeartPulse },
  { name: "Activity", label: "Physical Health", category: "Health", icon: Activity },
  { name: "Heart", label: "Wellness", category: "Health", icon: Heart },

  // Student Services & Counseling
  { name: "Users", label: "Guidance Office", category: "Services", icon: Users },
  { name: "UserCheck", label: "Admissions / Affairs", category: "Services", icon: UserCheck },
  { name: "Compass", label: "Career / Placement", category: "Services", icon: Compass },
  { name: "HelpCircle", label: "Helpdesk / Support", category: "Services", icon: HelpCircle },
  { name: "MessageSquare", label: "Student Communication", category: "Services", icon: MessageSquare },
  { name: "Smile", label: "Student Life", category: "Services", icon: Smile },
  { name: "Calendar", label: "Schedules / Events", category: "Services", icon: Calendar },
  { name: "Clock", label: "Office Hours", category: "Services", icon: Clock },
  { name: "Bell", label: "Notices", category: "Services", icon: Bell },
  { name: "Sparkles", label: "Special Programs", category: "Services", icon: Sparkles },
];

export const DEPARTMENT_ICON_MAP: Record<string, LucideIcon> = AVAILABLE_DEPARTMENT_ICONS.reduce(
  (acc, item) => {
    acc[item.name] = item.icon;
    return acc;
  },
  { Link2 } as Record<string, LucideIcon>
);

export const DEFAULT_DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  cashier: Landmark,
  clinic: Stethoscope,
  "computer laboratory": Monitor,
  "guidance office": Users,
  library: BookOpen,
  registrar: FileText,
};

export function getDepartmentIcon(iconName?: string | null, deptName?: string | null): LucideIcon {
  if (iconName && DEPARTMENT_ICON_MAP[iconName]) {
    return DEPARTMENT_ICON_MAP[iconName];
  }
  if (deptName) {
    const normalized = deptName.toLowerCase().trim();
    if (DEFAULT_DEPARTMENT_ICONS[normalized]) {
      return DEFAULT_DEPARTMENT_ICONS[normalized];
    }
    // Keyword-based fallback
    if (normalized.includes("cashier") || normalized.includes("finance") || normalized.includes("payment")) {
      return Landmark;
    }
    if (normalized.includes("clinic") || normalized.includes("health") || normalized.includes("medical")) {
      return Stethoscope;
    }
    if (normalized.includes("library") || normalized.includes("book")) {
      return BookOpen;
    }
    if (normalized.includes("lab") || normalized.includes("computer") || normalized.includes("tech")) {
      return Monitor;
    }
    if (normalized.includes("guidance") || normalized.includes("counseling") || normalized.includes("student")) {
      return Users;
    }
    if (normalized.includes("registrar") || normalized.includes("record")) {
      return FileText;
    }
    if (normalized.includes("dean") || normalized.includes("academic")) {
      return GraduationCap;
    }
  }
  return Building2;
}

/**
 * Returns a recommended icon name for a given department title
 */
export function suggestIconForDepartment(deptName: string): string {
  const normalized = deptName.toLowerCase().trim();
  if (normalized.includes("cashier") || normalized.includes("bursar") || normalized.includes("finance") || normalized.includes("payment")) {
    return "Landmark";
  }
  if (normalized.includes("clinic") || normalized.includes("health") || normalized.includes("medical") || normalized.includes("nurse")) {
    return "Stethoscope";
  }
  if (normalized.includes("library") || normalized.includes("learning")) {
    return "BookOpen";
  }
  if (normalized.includes("lab") || normalized.includes("computer") || normalized.includes("it ") || normalized.includes("tech")) {
    return "Monitor";
  }
  if (normalized.includes("guidance") || normalized.includes("counsel") || normalized.includes("affairs")) {
    return "Users";
  }
  if (normalized.includes("registrar") || normalized.includes("record") || normalized.includes("admission")) {
    return "FileText";
  }
  if (normalized.includes("dean") || normalized.includes("principal") || normalized.includes("academic")) {
    return "GraduationCap";
  }
  if (normalized.includes("discipline") || normalized.includes("prefect")) {
    return "Scale";
  }
  if (normalized.includes("security") || normalized.includes("guard")) {
    return "ShieldCheck";
  }
  return "Building2";
}
