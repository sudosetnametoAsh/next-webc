'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface TablePaginationFooterProps {
  currentPage: number
  pageSize: number
  totalItems: number
  itemLabel?: string
  onPageChange: (page: number) => void
  className?: string
  showJumpToPage?: boolean
  compactMobile?: boolean
}

export default function TablePaginationFooter({
  currentPage,
  pageSize,
  totalItems,
  itemLabel = 'items',
  onPageChange,
  className = '',
  showJumpToPage = true,
  compactMobile = false,
}: TablePaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const validPage = Math.min(Math.max(1, currentPage), totalPages)
  const start = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1
  const end = Math.min(validPage * pageSize, totalItems)

  const [jumpPage, setJumpPage] = useState('')

  const handleJump = () => {
    const pageNum = parseInt(jumpPage, 10)
    if (!isNaN(pageNum)) {
      const clamped = Math.min(Math.max(1, pageNum), totalPages)
      onPageChange(clamped)
      setJumpPage('')
    }
  }

  return (
    <div
      className={`flex shrink-0 flex-col sm:flex-row items-center justify-between border-t border-slate-800 bg-[#070c18] font-mono text-slate-400 ${compactMobile ? 'px-3 py-2 text-[10px] gap-1.5 md:px-5 md:py-3.5 md:text-xs md:gap-3 max-md:[&_button]:text-[10px] max-md:[&_button]:px-2 max-md:[&_input]:text-[10px] max-md:[&_input]:w-10 max-md:[&_input]:h-6' : 'px-5 py-3.5 text-xs gap-3'} ${className}`}
    >
      <span>
        Showing <strong className="text-white">{start}</strong> to{' '}
        <strong className="text-white">{end}</strong> of{' '}
        <strong className="text-white">{totalItems}</strong> {itemLabel}
      </span>

      {/* Pagination Controls */}
      <div className={`flex flex-wrap items-center justify-center sm:justify-end ${compactMobile ? 'gap-1 md:gap-2' : 'gap-2'} self-center sm:self-auto`}>
        <button
          type="button"
          onClick={() => onPageChange(validPage - 1)}
          disabled={validPage <= 1}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <span className={`${compactMobile ? 'px-1 py-0.5 text-[10px] md:px-2 md:py-1 md:text-xs' : 'px-2 py-1 text-xs'} text-slate-400`}>
          Page <strong className="text-white">{validPage}</strong> of{' '}
          <strong className="text-white">{totalPages}</strong>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(validPage + 1)}
          disabled={validPage >= totalPages}
          className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {showJumpToPage && totalPages > 1 && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-800">
            <span className="text-slate-400 text-xs hidden sm:inline">Jump to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleJump()
                }
              }}
              placeholder="#"
              aria-label="Jump to page"
              className="h-7 w-12 rounded-lg border border-slate-800 bg-slate-900/90 px-1 text-center font-mono text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleJump}
              disabled={!jumpPage.trim() || isNaN(parseInt(jumpPage, 10))}
              className="flex h-7 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 text-xs font-semibold text-slate-300 transition-colors hover:border-amber-500/40 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Go to page"
            >
              Go
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
