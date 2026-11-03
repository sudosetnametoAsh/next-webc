"use client";

import React, { useState, useMemo } from "react";
import {
  AVAILABLE_DEPARTMENT_ICONS,
  DEPARTMENT_ICON_MAP,
  DepartmentIconOption,
  IconCategory,
  getDepartmentIcon,
} from "@/lib/department-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X, Check, Building2, Pencil } from "lucide-react";

interface DepartmentIconPickerProps {
  selectedIcon?: string;
  onSelect: (iconName: string) => void;
  deptName?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center" | "end";
  className?: string;
  showEditBadge?: boolean;
}

const CATEGORIES: IconCategory[] = [
  "All",
  "General",
  "Academic",
  "Finance",
  "Tech",
  "Health",
  "Services",
];

export default function DepartmentIconPicker({
  selectedIcon,
  onSelect,
  deptName,
  disabled = false,
  size = "md",
  align = "start",
  className = "",
  showEditBadge = true,
}: DepartmentIconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<IconCategory>("All");
  const [hoveredIcon, setHoveredIcon] = useState<DepartmentIconOption | null>(null);

  const CurrentIcon = getDepartmentIcon(selectedIcon, deptName);
  const activeIconName = selectedIcon || "Building2";

  // Filter icons based on category and search query
  const filteredIcons = useMemo(() => {
    return AVAILABLE_DEPARTMENT_ICONS.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  }[size];

  const handleSelect = (name: string) => {
    onSelect(name);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title="Click to change department icon"
          className={`group relative flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-xs transition-ui hover:border-slate-300 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${sizeClasses} ${className}`}
        >
          <CurrentIcon className={iconSizes} />

          {showEditBadge && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900 text-[9px] text-white opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
              <Pencil className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={8}
        className="z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
      >
        <div className="space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Department Icon</h4>
              <p className="text-[11px] text-slate-400">
                Choose a Lucide icon for this department
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search icons (e.g. clinic, book, lab, finance)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-gray-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Icon Grid */}
          <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto p-1">
            {filteredIcons.length === 0 ? (
              <div className="col-span-6 py-8 text-center text-xs text-slate-400">
                No matching icons found.
              </div>
            ) : (
              filteredIcons.map((item) => {
                const IconComponent = item.icon;
                const isSelected = activeIconName === item.name;

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => handleSelect(item.name)}
                    onMouseEnter={() => setHoveredIcon(item)}
                    onMouseLeave={() => setHoveredIcon(null)}
                    title={`${item.label} (${item.name})`}
                    className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-ui cursor-pointer ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20"
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <IconComponent className="h-5 w-5" />
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] text-white">
                        <Check className="h-2 w-2 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Preview / Details */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
            {hoveredIcon ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-gray-900 truncate">
                  {hoveredIcon.label}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500">
                  {hoveredIcon.name}
                </span>
              </div>
            ) : (
              <span>
                Selected: <strong className="text-gray-900">{activeIconName}</strong>
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {filteredIcons.length} available
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
