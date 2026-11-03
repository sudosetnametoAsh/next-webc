"use client";

import React, { useState } from "react";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";
import { DailyThroughputItem } from "@/modules/staff/application/repository/dashboard-repository";

interface Props {
  dailyThroughput: DailyThroughputItem[];
  clearedToday: number;
  dailyAverage: number;
}

export default function DailyThroughputChart({
  dailyThroughput,
  clearedToday,
  dailyAverage,
}: Props) {
  const [hoveredDay, setHoveredDay] = useState<DailyThroughputItem | null>(null);

  const maxVal = Math.max(...dailyThroughput.map((d) => d.cleared), 1);
  const step = Math.ceil(maxVal / 4);
  const yAxisMax = Math.max(step * 4, 4);
  const yAxisLabels = [yAxisMax, step * 3, step * 2, step, 0];

  const paceDelta =
    dailyAverage > 0
      ? Math.round(((clearedToday - dailyAverage) / dailyAverage) * 100)
      : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0a101f] shadow-xl">
      {/* ── Card Header ── */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-800 bg-[#070c18] px-6 py-4.5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <BarChart3 className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold tracking-tight text-white">
              Daily Signing Throughput
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Clients signed per day over the last 7 calendar days
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-slate-300">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            Last 7 Days
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Cleared</span>
          </div>
        </div>
      </div>

      {/* ── Chart Canvas ── */}
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="relative flex h-56 w-full items-end justify-between px-2">
          {/* Y-Axis dashed reference lines */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-8">
            {yAxisLabels.map((val, i) => (
              <div key={i} className="flex w-full items-center">
                <span className="mr-3 w-6 text-right font-mono text-[11px] text-slate-500">
                  {val}
                </span>
                <div className="flex-1 border-b border-dashed border-slate-800/80" />
              </div>
            ))}
          </div>

          {/* Bar Columns */}
          <div className="relative z-10 flex h-[calc(100%-2rem)] w-full items-end justify-around pl-8">
            {dailyThroughput.map((d, index) => {
              const isToday = index === dailyThroughput.length - 1;
              const heightPercent =
                d.cleared > 0 ? (d.cleared / yAxisMax) * 100 : 0;

              return (
                <div
                  key={d.date}
                  className="group relative flex h-full w-full flex-col items-center justify-end"
                  onMouseEnter={() => setHoveredDay(d)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  {/* Floating tooltip */}
                  <div className="pointer-events-none absolute -top-10 z-20 hidden whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-center font-mono text-xs text-white shadow-xl group-hover:block">
                    <span className="font-bold text-amber-400">{d.cleared}</span>{" "}
                    cleared
                    <div className="text-[10px] text-slate-400">{d.date}</div>
                  </div>

                  <div className="flex h-full w-full items-end justify-center pb-8">
                    <div
                      className={`w-7 sm:w-11 rounded-t-md transition-ui duration-200 ${
                        isToday
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg shadow-emerald-500/20"
                          : "bg-emerald-500/80 hover:bg-emerald-400"
                      }`}
                      style={{
                        height: `${Math.max(heightPercent, d.cleared > 0 ? 5 : 0)}%`,
                        minHeight: d.cleared > 0 ? "8px" : "0",
                      }}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`absolute bottom-0 text-xs font-semibold ${
                      isToday ? "text-amber-400" : "text-slate-400"
                    }`}
                  >
                    {d.day}
                    {isToday && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer Velocity Metric ── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span>
              7-Day Average:{" "}
              <strong className="text-white font-mono">{dailyAverage}</strong>{" "}
              clients/day
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Today vs Pace:</span>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-bold ${
                paceDelta >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}
            >
              {paceDelta >= 0 ? `+${paceDelta}%` : `${paceDelta}%`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
