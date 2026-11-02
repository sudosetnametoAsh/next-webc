"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AVAILABLE_DEPARTMENT_ICONS,
  DepartmentIconOption,
  IconCategory,
  getDepartmentIcon,
  suggestIconForDepartment,
} from "@/lib/department-icons";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, X, Check, Loader2, Sparkles, MapPin, ChevronDown, Plus } from "lucide-react";

interface DepartmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    dept_id?: number;
    dept_name: string;
    icon_name?: string;
    floor?: string | null;
    room?: string | null;
  } | null;
  onSave: (data: {
    dept_id?: number;
    dept_name: string;
    icon_name: string;
    floor?: string | null;
    room?: string | null;
  }) => Promise<void>;
  isSubmitting?: boolean;
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

const DEFAULT_FLOORS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "5th Floor",
];

export default function DepartmentFormModal({
  isOpen,
  onClose,
  initialData,
  onSave,
  isSubmitting = false,
}: DepartmentFormModalProps) {
  const isEditing = Boolean(initialData?.dept_id);

  const [deptName, setDeptName] = useState("");
  const [floor, setFloor] = useState("");
  const [customFloors, setCustomFloors] = useState<string[]>([]);
  const [isCustomFloor, setIsCustomFloor] = useState(false);
  const [customFloorInput, setCustomFloorInput] = useState("");
  const [room, setRoom] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Building2");
  const [iconManuallyPicked, setIconManuallyPicked] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<IconCategory>("All");
  const [hoveredIcon, setHoveredIcon] = useState<DepartmentIconOption | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Populate form on open or when initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDeptName(initialData.dept_name || "");
        setSelectedIcon(initialData.icon_name || "Building2");
        const initialFloor = initialData.floor || "";
        setFloor(initialFloor);
        setRoom(initialData.room || "");
        setIconManuallyPicked(true);

        if (initialFloor && !DEFAULT_FLOORS.includes(initialFloor)) {
          setCustomFloors((prev) =>
            prev.includes(initialFloor) ? prev : [...prev, initialFloor]
          );
        }
        setIsCustomFloor(false);
        setCustomFloorInput("");
      } else {
        setDeptName("");
        setSelectedIcon("Building2");
        setFloor("");
        setRoom("");
        setIsCustomFloor(false);
        setCustomFloorInput("");
        setIconManuallyPicked(false);
      }
      setSearch("");
      setActiveCategory("All");
      setErrorMessage("");
    }
  }, [isOpen, initialData]);

  // Combined floor options
  const allFloorOptions = useMemo(() => {
    const list = [...DEFAULT_FLOORS];
    for (const f of customFloors) {
      if (!list.includes(f)) {
        list.push(f);
      }
    }
    return list;
  }, [customFloors]);

  // Handle floor selection from dropdown
  const handleFloorSelectChange = (value: string) => {
    if (value === "__ADD_CUSTOM__") {
      setIsCustomFloor(true);
      setCustomFloorInput("");
      setFloor("");
    } else {
      setFloor(value);
    }
  };

  // Handle custom floor addition
  const handleCustomFloorAdd = (val: string) => {
    setCustomFloorInput(val);
    setFloor(val);
    const trimmed = val.trim();
    if (trimmed && !allFloorOptions.includes(trimmed)) {
      setCustomFloors((prev) => [...prev, trimmed]);
    }
  };

  // Handle name change with auto-icon suggestion
  const handleNameChange = (val: string) => {
    setDeptName(val);
    setErrorMessage("");
    if (!iconManuallyPicked && !isEditing) {
      const suggested = suggestIconForDepartment(val);
      setSelectedIcon(suggested);
    }
  };

  const handleIconSelect = (iconName: string) => {
    setSelectedIcon(iconName);
    setIconManuallyPicked(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      setErrorMessage("Please enter a department name.");
      return;
    }

    try {
      await onSave({
        dept_id: initialData?.dept_id,
        dept_name: deptName.trim(),
        icon_name: selectedIcon,
        floor: floor.trim() || null,
        room: room.trim() || null,
      });
      onClose();
    } catch {
      // Error handled by parent toast
    }
  };

  // Filter icons
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

  const CurrentActiveIcon = getDepartmentIcon(selectedIcon);
  const activeIconDetail = AVAILABLE_DEPARTMENT_ICONS.find(
    (i) => i.name === selectedIcon
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 border border-slate-800 bg-[#0a101f] text-slate-100 shadow-2xl rounded-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#070c18]">
          <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            {isEditing ? "Edit Department" : "Add New Department"}
          </DialogTitle>
          <p className="mt-1 text-xs text-slate-400">
            {isEditing
              ? "Update campus office name, signing authority, representational icon, and physical location."
              : "Register a participating campus department with its visual clearance icon and office location."}
          </p>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Department Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Department Name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Guidance Office, Computer Laboratory, Clinic..."
              autoFocus
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 shadow-inner focus:border-amber-500/60 focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
            {errorMessage && (
              <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
            )}
          </div>

          {/* Department Location Fields (Floor & Room) */}
          <div className="space-y-3 rounded-xl border border-slate-800 bg-[#070c18]/50 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Department Location
              </span>
              <span className="text-[10px] text-slate-500 font-mono">(Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Floor Field (Dropdown up to 5th floor + Add floor option) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400">
                    Floor
                  </label>
                  {!isCustomFloor ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomFloor(true);
                        setCustomFloorInput(floor || "");
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-medium transition cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      <span>Add floor</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomFloor(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 font-medium transition cursor-pointer"
                    >
                      ← Choose preset
                    </button>
                  )}
                </div>

                {!isCustomFloor ? (
                  <div className="relative">
                    <select
                      value={floor}
                      onChange={(e) => handleFloorSelectChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 pr-9 text-xs text-white shadow-inner focus:border-amber-500/60 focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#0a101f] text-slate-500">
                        Select Floor...
                      </option>
                      {allFloorOptions.map((f) => (
                        <option key={f} value={f} className="bg-[#0a101f] text-white">
                          {f}
                        </option>
                      ))}
                      <option disabled className="bg-[#0a101f] text-slate-600">
                        ──────────
                      </option>
                      <option value="__ADD_CUSTOM__" className="bg-[#0a101f] text-amber-400 font-semibold">
                        + Add Floor...
                      </option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={customFloorInput}
                      onChange={(e) => handleCustomFloorAdd(e.target.value)}
                      placeholder="e.g. 6th Floor, Roof Deck, Annex 2nd Floor"
                      autoFocus
                      className="w-full rounded-xl border border-amber-500/50 bg-slate-900/90 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 shadow-inner focus:border-amber-500 focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Room Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400">
                  Room / Office
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. Room 101, Lab 3, Suite A"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 shadow-inner focus:border-amber-500/60 focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Selected Icon Showcase Card */}
          <div className="rounded-xl border border-slate-800 bg-[#070c18]/90 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
                <CurrentActiveIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {activeIconDetail?.label || selectedIcon}
                  </span>
                  <span className="rounded-md border border-slate-700/60 bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-300">
                    {selectedIcon}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category: <span className="text-amber-400/90 font-medium">{activeIconDetail?.category || "General"}</span>
                </p>
              </div>
            </div>

            {!iconManuallyPicked && !isEditing && deptName.trim() && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                Auto-suggested
              </span>
            )}
          </div>

          {/* Icon Selector Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Icon
              </label>
              <span className="text-xs text-slate-500">
                {filteredIcons.length} icons available
              </span>
            </div>

            {/* Icon Search & Filter */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search icon names or categories (e.g. clinic, money, book, lab)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-2 pl-9 pr-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500/50 focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-amber-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? "border border-amber-500/40 bg-amber-500/20 text-amber-300 shadow-xs"
                        : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Icons Grid */}
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-52 overflow-y-auto p-1.5 rounded-xl border border-slate-800/80 bg-[#070c18]/60">
              {filteredIcons.length === 0 ? (
                <div className="col-span-full py-8 text-center text-xs text-slate-500">
                  No icons match &quot;{search}&quot;.
                </div>
              ) : (
                filteredIcons.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedIcon === item.name;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleIconSelect(item.name)}
                      onMouseEnter={() => setHoveredIcon(item)}
                      onMouseLeave={() => setHoveredIcon(null)}
                      title={`${item.label} (${item.name})`}
                      className={`relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-amber-500/80 bg-amber-500/20 text-amber-300 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10"
                          : "border-slate-800/80 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-slate-950">
                          <Check className="h-2 w-2 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Hovered or Selected Icon Info Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              {hoveredIcon ? (
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-slate-200">
                    {hoveredIcon.label}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
                    {hoveredIcon.name}
                  </span>
                </div>
              ) : (
                <span>
                  Active: <strong className="text-amber-400">{selectedIcon}</strong>
                </span>
              )}
              <span className="text-[10px] text-slate-500">
                Click any icon to choose
              </span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#070c18] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !deptName.trim()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 text-xs font-bold shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>{isEditing ? "Save Changes" : "Create Department"}</span>
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
