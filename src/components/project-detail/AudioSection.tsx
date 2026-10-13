import { Download, Pause, Play, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from '@/components/common/Toaster'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Hint } from '@/components/ui/misc'
import { formatBytes, formatDuration } from '@/lib/media'
import { cn } from '@/lib/utils'
import { useData } from '@/store/data'
import type { MediaItem, MediaKind, Project } from '@/types'
import { DropArea, EmptyDropZone, SectionHeader, UploadButton, UploadProgressList } from './shared'
import { useUploads } from './useUploads'

const AUDIO_KINDS: readonly MediaKind[] = ['audio']

export interface AudioSectionHandle {
  openPicker: () => void
}

export const AudioSection = React.forwardRef<AudioSectionHandle, { project: Project }>(({ project }, ref) => {
  const allMedia = useData((s) => s.media)
  const deleteMedia = useData((s) => s.deleteMedia)
  const { uploads, upload } = useUploads(project.id, AUDIO_KINDS)
  const [open, setOpen] = React.useState(true)
  const [toDelete, setToDelete] = React.useState<MediaItem>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const sectionRef = React.useRef<HTMLElement>(null)

  // A single <audio> element guarantees only one track plays at a time.
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [currentId, setCurrentId] = React.useState<string>()
  const [playing, setPlaying] = React.useState(false)
  const [time, setTime] = React.useState(0)

  const tracks = allMedia.filter((m) => m.projectId === project.id && m.kind === 'audio')

  React.useImperativeHandle(ref, () => ({
    openPicker: () => {
      setOpen(true)
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      inputRef.current?.click()
    },
  }))

  const load = (item: MediaItem) => {
    const audio = audioRef.current!
    if (currentId !== item.id) {
      audio.src = item.url
      setCurrentId(item.id)
      setTime(0)
    }
    return audio
  }

  const toggle = (item: MediaItem) => {
    const audio = load(item)
    if (currentId === item.id && playing) audio.pause()
    else void audio.play().catch(() => toast("Couldn't play this file"))
  }

  const seek = (item: MediaItem, ratio: number) => {
    const audio = load(item)
    const duration = item.durationSec ?? audio.duration
    if (!Number.isFinite(duration)) return
    audio.currentTime = ratio * duration
    setTime(audio.currentTime)
  }

  return (
    <section id="audio" ref={sectionRef} className="scroll-mt-4">
      <DropArea onFiles={upload} hint="Drop audio files to upload">
        <SectionHeader
          title="Audio"
          count={tracks.length}
          open={open}
          onToggle={() => setOpen((v) => !v)}
          action={<UploadButton onClick={() => inputRef.current?.click()} />}
        />
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a"
          multiple
          hidden
          data-testid="audio-input"
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        {open && (
          <div className="mt-3">
            <UploadProgressList uploads={uploads} />
            {tracks.length === 0 && uploads.length === 0 ? (
              <EmptyDropZone onBrowse={() => inputRef.current?.click()} title="No audio yet" accept="MP3, WAV or M4A" />
            ) : (
              <ul className={cn('flex flex-col gap-1.5', uploads.length > 0 && 'mt-3')}>
                {tracks.map((t) => (
                  <AudioRow
                    key={t.id}
                    item={t}
                    active={t.id === currentId}
                    playing={t.id === currentId && playing}
                    time={t.id === currentId ? time : 0}
                    onToggle={() => toggle(t)}
                    onSeek={(r) => seek(t, r)}
                    onDelete={() => setToDelete(t)}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </DropArea>
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        hidden
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`Delete ${toDelete?.name}?`}
        description="The audio file will be removed from this project."
        onConfirm={async () => {
          if (!toDelete) return
          if (toDelete.id === currentId) {
            audioRef.current?.pause()
            setCurrentId(undefined)
          }
          await deleteMedia(toDelete.id)
          toast('Audio deleted')
        }}
      />
    </section>
  )
})
AudioSection.displayName = 'AudioSection'

function AudioRow({
  item,
  active,
  playing,
  time,
  onToggle,
  onSeek,
  onDelete,
}: {
  item: MediaItem
  active: boolean
  playing: boolean
  time: number
  onToggle: () => void
  onSeek: (ratio: number) => void
  onDelete: () => void
}) {
  const duration = item.durationSec ?? 0
  const ratio = duration ? Math.min(1, time / duration) : 0
  const onBar = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onSeek(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
  }

  return (
    <li
      className={cn(
        'group flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-sunken py-1.5 pr-2 pl-2 transition-colors duration-150 hover:border-border-strong sm:flex-nowrap sm:py-0',
        active && 'border-border-strong',
      )}
    >
      <button
        onClick={onToggle}
        aria-label={playing ? `Pause ${item.name}` : `Play ${item.name}`}
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-85"
      >
        {playing ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
      </button>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:w-48 sm:flex-none sm:shrink-0" title={item.name}>
        {item.name}
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Seek ${item.name}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        onClick={onBar}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') onSeek(Math.min(1, ratio + 0.05))
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, ratio - 0.05))
        }}
        className="group/bar order-last flex h-6 min-w-16 basis-full cursor-pointer items-center px-1 outline-none sm:order-none sm:basis-auto sm:flex-1 sm:px-0"
      >
        <div className="relative h-1 w-full rounded-full bg-border group-focus-visible/bar:ring-2 group-focus-visible/bar:ring-border-strong">
          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: `${ratio * 100}%` }} />
          <div
            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground opacity-0 transition-opacity group-hover/bar:opacity-100"
            style={{ left: `${ratio * 100}%` }}
          />
        </div>
      </div>
      <span className="w-[76px] shrink-0 text-right text-2xs text-muted-foreground tabular-nums">
        {active ? `${formatDuration(time)} / ` : ''}
        {formatDuration(item.durationSec)}
      </span>
      <span className="w-16 shrink-0 text-right text-2xs text-muted-foreground max-sm:hidden">{formatBytes(item.sizeBytes)}</span>
      <div className="flex shrink-0 items-center">
        <Hint label="Download">
          <a
            href={item.url}
            download={item.name}
            aria-label={`Download ${item.name}`}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <Download className="size-3.5" />
          </a>
        </Hint>
        <Hint label="Delete">
          <button
            onClick={onDelete}
            aria-label={`Delete ${item.name}`}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-danger"
          >
            <Trash2 className="size-3.5" />
          </button>
        </Hint>
      </div>
    </li>
  )
}
