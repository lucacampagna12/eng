import { ChevronLeft, ChevronRight, Download, Film, ImageIcon, Trash2, X } from 'lucide-react'
import * as React from 'react'
import { toast } from '@/components/common/Toaster'
import { ConfirmDialog, Dialog, DialogClose } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Hint } from '@/components/ui/misc'
import { formatDuration, mediaMetaLine } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useData } from '@/store/data'
import type { MediaItem, MediaKind, Project } from '@/types'
import { DropArea, EmptyDropZone, SectionHeader, UploadButton, UploadProgressList } from './shared'
import { useUploads } from './useUploads'

const VISUAL_KINDS: readonly MediaKind[] = ['video', 'image']

export interface MediaSectionHandle {
  openPicker: () => void
  reveal: () => void
}

export const MediaSection = React.forwardRef<MediaSectionHandle, { project: Project }>(({ project }, ref) => {
  const allMedia = useData((s) => s.media)
  const deleteMedia = useData((s) => s.deleteMedia)
  const { uploads, upload } = useUploads(project.id, VISUAL_KINDS)
  const [open, setOpen] = React.useState(true)
  const [videosOpen, setVideosOpen] = React.useState(true)
  const [imagesOpen, setImagesOpen] = React.useState(true)
  const [viewing, setViewing] = React.useState<string>()
  const [toDelete, setToDelete] = React.useState<MediaItem>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const sectionRef = React.useRef<HTMLElement>(null)

  const videos = allMedia.filter((m) => m.projectId === project.id && m.kind === 'video')
  const images = allMedia.filter((m) => m.projectId === project.id && m.kind === 'image')
  const ordered = [...videos, ...images]

  React.useImperativeHandle(ref, () => ({
    openPicker: () => {
      setOpen(true)
      inputRef.current?.click()
    },
    reveal: () => {
      setOpen(true)
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  }))

  const group = (title: string, items: MediaItem[], isOpen: boolean, toggle: () => void) =>
    items.length > 0 && (
      <div className="pl-2.5">
        <SectionHeader level="sub" title={title} count={items.length} open={isOpen} onToggle={toggle} />
        {isOpen && (
          <div className="mt-3 mb-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            {items.map((m) => (
              <MediaCard key={m.id} item={m} onOpen={() => setViewing(m.id)} onDelete={() => setToDelete(m)} />
            ))}
          </div>
        )}
      </div>
    )

  return (
    <section id="media" ref={sectionRef} className="scroll-mt-4">
      <DropArea onFiles={upload} hint="Drop videos or images to upload">
        <SectionHeader
          title="Media"
          open={open}
          onToggle={() => setOpen((v) => !v)}
          action={<UploadButton onClick={() => inputRef.current?.click()} />}
        />
        <input
          ref={inputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          hidden
          data-testid="media-input"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        {open && (
          <div className="mt-4">
            <UploadProgressList uploads={uploads} />
            {ordered.length === 0 && uploads.length === 0 ? (
              <EmptyDropZone onBrowse={() => inputRef.current?.click()} title="No media yet" accept="Video and image files" />
            ) : (
              <div className={cn(uploads.length > 0 && 'mt-4')}>
                {group('Videos', videos, videosOpen, () => setVideosOpen((v) => !v))}
                {group('Images', images, imagesOpen, () => setImagesOpen((v) => !v))}
              </div>
            )}
          </div>
        )}
      </DropArea>

      <Lightbox items={ordered} currentId={viewing} onChange={setViewing} />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`Delete ${toDelete?.name}?`}
        description="The file will be removed from this project."
        onConfirm={async () => {
          if (!toDelete) return
          await deleteMedia(toDelete.id)
          toast('File deleted')
        }}
      />
    </section>
  )
})
MediaSection.displayName = 'MediaSection'

// ---------- Card ----------

function Thumb({ item, className }: { item: MediaItem; className?: string }) {
  const src = item.thumbnailUrl ?? (item.kind === 'image' ? item.url : undefined)
  if (src) return <img src={src} alt="" draggable={false} className={cn('size-full object-cover', className)} />
  const Icon = item.kind === 'video' ? Film : ImageIcon
  return (
    <div className={cn('flex size-full items-center justify-center bg-elevated-hover', className)}>
      <Icon className="size-5 text-subtle-foreground" />
    </div>
  )
}

function MediaCard({ item, onOpen, onDelete }: { item: MediaItem; onOpen: () => void; onDelete: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group w-full cursor-pointer sm:w-[180px] overflow-hidden rounded-lg border border-border bg-surface-sunken transition-colors duration-150 hover:border-border-strong focus-visible:border-subtle-foreground focus-visible:outline-none"
    >
      <div className="relative h-[102px] overflow-hidden rounded-t-[7px]">
        <Thumb item={item} className="transition-transform duration-300 group-hover:scale-[1.03]" />
        {item.kind === 'video' && (
          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[11px] leading-4 font-semibold text-white tabular-nums">
            {formatDuration(item.durationSec)}
          </span>
        )}
        <div
          className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-lg bg-black/50 p-0.5 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Hint label="Download">
            <a
              href={item.url}
              download={item.name}
              aria-label={`Download ${item.name}`}
              className="flex size-6 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/15 hover:text-white"
            >
              <Download className="size-3.5" />
            </a>
          </Hint>
          <Hint label="Delete">
            <button
              onClick={onDelete}
              aria-label={`Delete ${item.name}`}
              className="flex size-6 items-center justify-center rounded-md text-white/85 transition-colors hover:bg-white/15 hover:text-white"
            >
              <Trash2 className="size-3.5" />
            </button>
          </Hint>
        </div>
      </div>
      <div className="px-2.5 pt-2 pb-2.5">
        <p className="truncate text-xs font-semibold" title={item.name}>
          {item.name}
        </p>
        <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{mediaMetaLine(item)}</p>
      </div>
    </div>
  )
}

// ---------- Lightbox ----------

function Lightbox({ items, currentId, onChange }: { items: MediaItem[]; currentId?: string; onChange: (id?: string) => void }) {
  const index = items.findIndex((m) => m.id === currentId)
  const item = items[index]
  const go = (delta: number) => items.length > 1 && onChange(items[(index + delta + items.length) % items.length].id)

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onChange(undefined)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
          className="fixed inset-0 z-50 flex flex-col outline-none"
        >
          {item && (
            <>
              <header className="flex h-14 shrink-0 items-center gap-3 px-5 text-white">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="truncate text-sm font-semibold">{item.name}</DialogPrimitive.Title>
                  <p className="text-2xs text-white/60">
                    {mediaMetaLine(item)}
                    {item.durationSec !== undefined && ` • ${formatDuration(item.durationSec)}`}
                  </p>
                </div>
                <span className="ml-auto text-xs text-white/60 tabular-nums">
                  {index + 1} / {items.length}
                </span>
                <a
                  href={item.url}
                  download={item.name}
                  aria-label="Download"
                  className="flex size-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <Download className="size-4" />
                </a>
                <DialogClose aria-label="Close" className="flex size-8 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white">
                  <X className="size-4" />
                </DialogClose>
              </header>
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-8" onClick={() => onChange(undefined)}>
                <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-full items-center justify-center">
                  {item.kind === 'video' ? (
                    <video key={item.id} src={item.url} controls autoPlay className="max-h-[calc(100vh-120px)] max-w-full rounded-lg bg-black" />
                  ) : (
                    <img src={item.url} alt={item.name} className="max-h-[calc(100vh-120px)] max-w-full rounded-lg object-contain" />
                  )}
                </div>
                {items.length > 1 && (
                  <>
                    <NavArrow side="left" onClick={() => go(-1)} />
                    <NavArrow side="right" onClick={() => go(1)} />
                  </>
                )}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  )
}

function NavArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={side === 'left' ? 'Previous file' : 'Next file'}
      className={cn(
        'absolute top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20',
        side === 'left' ? 'left-4' : 'right-4',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
