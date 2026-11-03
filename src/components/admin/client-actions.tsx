'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { ClientItem } from './clients-page-client'

export default function ClientActions({ client, onSuccess }: {
  client: ClientItem
  onSuccess: (message: string, result: { deleted: boolean; name: string }) => void
}) {
  const queryClient = useQueryClient()
  const [action, setAction] = useState<'edit' | 'delete' | null>(null)
  const [name, setName] = useState(client.name)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/admin/clients', {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, type: client.type, name: name.trim() }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to save changes')
      const message = action === 'delete' ? 'Client deleted successfully' : 'Client updated successfully'
      setAction(null)
      onSuccess(message, { deleted: action === 'delete', name: name.trim() })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin'] }),
        queryClient.invalidateQueries({ queryKey: ['department'] }),
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes')
    } finally { setPending(false) }
  }

  return (
    <div className="flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <button type="button" aria-label={`Edit ${client.name}`} title="Edit client" className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-amber-400" onClick={() => { setName(client.name); setError(''); setAction('edit') }}><Pencil className="h-4 w-4" /></button>
      <button type="button" aria-label={`Delete ${client.name}`} title="Delete client" className="rounded p-2 text-slate-400 hover:bg-slate-700 hover:text-rose-400" onClick={() => { setError(''); setAction('delete') }}><Trash2 className="h-4 w-4" /></button>
      <Dialog open={action !== null} onOpenChange={(open) => { if (!open && !pending) setAction(null) }}>
        <DialogContent className="border-slate-700 bg-slate-950 text-slate-100" showCloseButton={!pending} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); event.stopPropagation() }}>
          <DialogTitle>{action === 'delete' ? 'Delete client' : 'Update client'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {action === 'delete' ? `Delete ${client.name} (${client.id})? Their enrollment and clearance records will be permanently removed. Their login identity will be retained.` : `Update the name for ${client.type} ${client.id}.`}
          </DialogDescription>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
            {action === 'edit' && <div className="space-y-2"><label htmlFor={`client-name-${client.type}-${client.id}`} className="text-sm">Full name</label><input id={`client-name-${client.type}-${client.id}`} autoFocus required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} disabled={pending} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm" /></div>}
            {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={pending} onClick={() => setAction(null)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={pending || (action === 'edit' && !name.trim())} className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${action === 'delete' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'}`}>{pending ? 'Saving...' : action === 'delete' ? 'Delete client' : 'Save changes'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
