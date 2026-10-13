import { useCallback, useState } from 'react'
import { toast } from '@/components/common/Toaster'
import { kindOf, readMediaMetadata } from '@/lib/media'
import { useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { MediaKind } from '@/types'

export interface Upload {
  id: string
  name: string
  progress: number // 0–1
  stage: 'processing' | 'uploading'
  error?: string
}

/**
 * Handles reading metadata + uploading a batch of files, exposing per-file progress.
 * Pass `accepted` as a module-level constant so the callback stays stable.
 */
export function useUploads(projectId: string, accepted: readonly MediaKind[]) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const uploadMedia = useData((s) => s.uploadMedia)
  const me = useUser((s) => s.user)

  const patch = (id: string, p: Partial<Upload>) => setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...p } : u)))
  const remove = (id: string, delay = 0) => setTimeout(() => setUploads((list) => list.filter((u) => u.id !== id)), delay)

  const upload = useCallback(
    (files: File[]) => {
      const valid = files.filter((f) => {
        const kind = kindOf(f)
        return kind && accepted.includes(kind)
      })
      const rejected = files.length - valid.length
      if (rejected > 0) toast(`${rejected} file${rejected === 1 ? '' : 's'} skipped: unsupported type`)

      valid.forEach(async (file) => {
        const id = crypto.randomUUID()
        const kind = kindOf(file)!
        setUploads((list) => [...list, { id, name: file.name, progress: 0, stage: 'processing' }])
        try {
          const meta = await readMediaMetadata(file, kind)
          patch(id, { stage: 'uploading' })
          await uploadMedia({ projectId, file, kind, uploadedBy: me?.id ?? '', ...meta }, (progress) => patch(id, { progress }))
          remove(id, 400)
        } catch {
          patch(id, { error: 'Failed' })
          remove(id, 4000)
        }
      })
    },
    [projectId, accepted, uploadMedia, me?.id],
  )

  return { uploads, upload }
}
