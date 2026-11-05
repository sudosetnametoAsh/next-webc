'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { ClientItem } from './clients-page-client'

export default function DeleteSelectedClients({ clients, onDeleted }: {
  clients: ClientItem[]
  onDeleted: (keys: string[]) => void
}) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [failures, setFailures] = useState<string[]>([])
  const [deletedCount, setDeletedCount] = useState(0)

  async function removeClients() {
    if (pending || !clients.length) return
    setPending(true)
    setFailures([])
    const deleted: string[] = []
    const errors: string[] = []
    try {
      for (const client of clients) {
        try {
          const response = await fetch('/api/admin/clients', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: client.id, type: client.type }),
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || 'Unable to remove client')
          deleted.push(`${client.type}:${client.id}`)
        } catch (error) {
          errors.push(`${client.name} (${client.id}): ${error instanceof Error ? error.message : 'Unable to remove client'}`)
        }
      }
      onDeleted(deleted)
      setDeletedCount((count) => count + deleted.length)
      setFailures(errors)
      if (errors.length) {
        toast.error("Some clients could not be removed", { description: `${deleted.length} removed; ${errors.length} failed. Review the details in this dialog.` })
      } else {
        toast.success(`${deleted.length} clients removed from the current term`)
      }
      if (!errors.length) setOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['department'] }),
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <button type="button" aria-label={`Remove ${clients.length} selected clients from current term`} title="Remove selected clients from current term" disabled={!clients.length} onClick={() => { setFailures([]); setDeletedCount(0); setOpen(true) }} className="fixed right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-rose-500/40 bg-rose-950/30 text-rose-400 backdrop-blur-md shadow-xl shadow-black/30 transition-colors hover:bg-rose-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 sm:right-8 sm:bottom-8">
        <Trash2 aria-hidden="true" className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value) }}>
        <DialogContent showCloseButton={!pending} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-800 bg-[#0a101f] p-0 text-slate-100 sm:max-w-lg" onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}>
          <div className="space-y-2 border-b border-slate-800 p-5 pr-10">
            <DialogTitle className="text-lg font-semibold">Remove selected clients from this term?</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed text-slate-400">Disable current-term participation for the selected clients. Accounts, enrollment history, submissions and signatures remain saved. Re-enrollment restores access. Staff with active assignments must be reassigned first.</DialogDescription>
          </div>
          <div className="min-h-0 space-y-3 overflow-y-auto p-5">
            {deletedCount > 0 && <p role="status" className="text-sm text-emerald-300">{deletedCount} clients removed from the current term.</p>}
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-slate-300">{clients.map((client) => <li key={`${client.type}:${client.id}`} className="rounded-lg border border-slate-800 bg-[#070c18] px-3 py-2"><span className="font-medium">{client.name}</span><span className="mt-1 block text-xs text-slate-500">{client.type} · {client.id}</span></li>)}</ul>
            {failures.length > 0 && <div role="alert" className="space-y-2 text-xs text-rose-300"><p className="font-semibold">Some clients could not be removed:</p>{failures.map((message, index) => <p key={index} className="whitespace-pre-line break-words">{message}</p>)}</div>}
          </div>
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 bg-[#070c18] px-5 py-4">
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={pending || !clients.length} onClick={() => void removeClients()} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin" />}{pending ? 'Removing…' : `Remove ${clients.length} clients`}</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
