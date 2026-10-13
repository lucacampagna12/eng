import { AudioLines, Eye, Film, ImageIcon } from 'lucide-react'
import * as React from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDuration, mediaMetaLine } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { MediaItem } from '@/types'

/** Small thumbnail with a sensible fallback icon per media kind. */
export function MediaThumb({ item, className, iconClassName }: { item: MediaItem; className?: string; iconClassName?: string }) {
  const src = item.thumbnailUrl ?? (item.kind === 'image' ? item.url : undefined)
  if (src) return <img src={src} alt="" draggable={false} className={cn('size-full object-cover', className)} />
  const Icon = item.kind === 'video' ? Film : item.kind === 'audio' ? AudioLines : ImageIcon
  return (
    <div className={cn('flex size-full items-center justify-center bg-elevated-hover', className)}>
      <Icon className={cn('size-6 text-muted-foreground', iconClassName)} strokeWidth={1.5} />
    </div>
  )
}

/** Quick look at a single file (used by the eye button on selectable tiles). */
export function MediaPreviewDialog({ item, onClose }: { item?: MediaItem; onClose: () => void }) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-4">
        {item && (
          <>
            <DialogTitle className="truncate pr-8 text-sm">{item.name}</DialogTitle>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {mediaMetaLine(item)}
              {item.durationSec !== undefined && ` • ${formatDuration(item.durationSec)}`}
            </p>
            <div className="mt-3 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-black">
              {item.kind === 'video' && <video src={item.url} controls autoPlay className="max-h-[70vh] max-w-full" />}
              {item.kind === 'image' && <img src={item.url} alt={item.name} className="max-h-[70vh] max-w-full object-contain" />}
              {item.kind === 'audio' && <audio src={item.url} controls autoPlay className="m-8 w-full max-w-md" />}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Eye button that pops a floating preview next to the tile ("Video Preview").
 * Hover to peek (muted, looping); click to pin it open with sound and controls.
 */
export function MediaPeekButton({ item, className }: { item: MediaItem; className?: string }) {
  const [hover, setHover] = React.useState(false)
  const [pinned, setPinned] = React.useState(false)
  const open = hover || pinned
  const label = item.kind === 'video' ? 'Video Preview' : item.kind === 'audio' ? 'Audio Preview' : 'Image Preview'

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setPinned(false)
          setHover(false)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setPinned((p) => !p)
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label={`Preview ${item.name}`}
          aria-expanded={open}
          className={cn(
            'flex size-5 items-center justify-center rounded-full bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white',
            open && 'bg-white text-black hover:bg-white hover:text-black',
            className,
          )}
        >
          <Eye className="size-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        className="w-auto overflow-hidden rounded-xl border-white/10 bg-black p-0"
      >
        <div className="relative">
          {item.kind === 'video' && (
            <video
              src={item.url}
              autoPlay
              loop
              playsInline
              muted={!pinned}
              controls={pinned}
              className="block max-h-[380px] w-[214px] bg-black object-cover"
              style={{ aspectRatio: item.width && item.height ? `${item.width} / ${item.height}` : '9 / 16' }}
            />
          )}
          {item.kind === 'image' && <img src={item.url} alt={item.name} className="block max-h-[380px] w-[260px] object-contain" />}
          {item.kind === 'audio' && (
            <div className="flex w-[260px] flex-col items-center gap-3 px-4 pt-6 pb-12 text-white">
              <AudioLines className="size-8 text-white/70" />
              <audio src={item.url} controls autoPlay className="w-full" />
            </div>
          )}
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs font-semibold text-white">{label}</span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
