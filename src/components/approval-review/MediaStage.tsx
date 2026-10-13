import { AudioLines, Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import * as React from 'react'
import { formatDuration } from '@/lib/media'
import { cn } from '@/lib/utils'
import type { DrawingStroke, MediaItem } from '@/types'
import { DrawingLayer } from './DrawingLayer'

export interface StageHandle {
  seek: (t: number) => void
  pause: () => void
  getTime: () => number
}

export interface Marker {
  id: string
  t: number
  label: string
}

const SPEEDS = [1, 1.5, 2, 0.5]

/** Largest box with the given aspect ratio that fits inside the container. */
function useContainBox(containerRef: React.RefObject<HTMLElement | null>, aspect: number) {
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      const w = Math.min(width, height * aspect)
      setBox({ w: Math.floor(w), h: Math.floor(w / aspect) })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, aspect])
  return box
}

export const MediaStage = React.forwardRef<
  StageHandle,
  {
    item: MediaItem
    drawing: { editable: boolean; strokes: DrawingStroke[]; color: string; onChange: (s: DrawingStroke[]) => void } | null
    shownStrokes?: DrawingStroke[]
    onPlaybackStart?: () => void
    markers: Marker[]
    onMarkerClick: (id: string) => void
    fullscreenTarget: React.RefObject<HTMLElement | null>
  }
>(({ item, drawing, shownStrokes, onPlaybackStart, markers, onMarkerClick, fullscreenTarget }, ref) => {
  const areaRef = React.useRef<HTMLDivElement>(null)
  const mediaRef = React.useRef<HTMLVideoElement & HTMLAudioElement>(null)
  const [aspect, setAspect] = React.useState(item.width && item.height ? item.width / item.height : 16 / 9)
  const box = useContainBox(areaRef, aspect)
  const [playing, setPlaying] = React.useState(false)
  const [time, setTime] = React.useState(0)
  const [duration, setDuration] = React.useState(item.durationSec ?? 0)
  const [speed, setSpeed] = React.useState(1)
  const [muted, setMuted] = React.useState(false)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const playable = item.kind !== 'image'

  React.useImperativeHandle(ref, () => ({
    seek: (t) => {
      const m = mediaRef.current
      if (m) {
        m.currentTime = t
        setTime(t)
      }
    },
    pause: () => mediaRef.current?.pause(),
    getTime: () => mediaRef.current?.currentTime ?? 0,
  }))

  React.useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Space / arrows control playback unless the user is typing.
  React.useEffect(() => {
    if (!playable) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, [contenteditable], [role=dialog], [role=menu]')) return
      const m = mediaRef.current
      if (!m) return
      if (e.key === ' ') {
        e.preventDefault()
        void (m.paused ? m.play() : m.pause())
      } else if (e.key === 'ArrowRight') m.currentTime = Math.min(m.duration || 0, m.currentTime + 5)
      else if (e.key === 'ArrowLeft') m.currentTime = Math.max(0, m.currentTime - 5)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playable])

  const toggle = () => {
    const m = mediaRef.current
    if (!m) return
    void (m.paused ? m.play() : m.pause())
  }

  const seekTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (duration || 0)
    if (mediaRef.current) mediaRef.current.currentTime = t
    setTime(t)
  }

  const progress = duration ? Math.min(1, time / duration) : 0
  const overlayStrokes = drawing ? drawing.strokes : (shownStrokes ?? [])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        {item.kind === 'audio' ? (
          <div className="flex flex-col items-center gap-4 text-white/80">
            <span className="flex size-28 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">
              <AudioLines className="size-12" strokeWidth={1.25} />
            </span>
            <p className="max-w-md truncate text-sm font-semibold">{item.name}</p>
            <audio
              ref={mediaRef}
              src={item.url}
              onPlay={() => (setPlaying(true), onPlaybackStart?.())}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
            />
          </div>
        ) : (
          <div className="relative" style={{ width: box.w, height: box.h }}>
            {item.kind === 'video' ? (
              <video
                ref={mediaRef}
                src={item.url}
                playsInline
                muted={muted}
                className="size-full bg-black"
                onClick={drawing?.editable ? undefined : toggle}
                onPlay={() => (setPlaying(true), onPlaybackStart?.())}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget
                  if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight)
                  if (Number.isFinite(v.duration)) setDuration(v.duration)
                  v.playbackRate = speed
                }}
              />
            ) : (
              <img src={item.url} alt={item.name} draggable={false} className="size-full object-contain" onLoad={(e) => {
                const i = e.currentTarget
                if (i.naturalWidth && i.naturalHeight) setAspect(i.naturalWidth / i.naturalHeight)
              }} />
            )}
            {(drawing || overlayStrokes.length > 0) && (
              <DrawingLayer strokes={overlayStrokes} editable={drawing?.editable} color={drawing?.color} onChange={drawing?.onChange} />
            )}
            {item.kind === 'video' && !playing && !drawing?.editable && (
              <button
                onClick={toggle}
                aria-label="Play"
                className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 md:size-20 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform duration-150 hover:scale-105"
              >
                <Play className="ml-1 size-6 fill-current md:size-9" />
              </button>
            )}
          </div>
        )}
      </div>

      {playable && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-2 md:bottom-3 md:px-4">
          <div className="pointer-events-auto flex h-11 w-full max-w-[572px] items-center gap-2.5 rounded-full border border-white/10 bg-black/55 px-3.5 md:h-[50px] md:gap-4 md:px-5 text-white shadow-lg backdrop-blur-md">
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="shrink-0 transition-opacity hover:opacity-80">
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </button>
            <div
              role="slider"
              tabIndex={0}
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-valuenow={Math.round(time)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                seekTo(e)
              }}
              onPointerMove={(e) => e.buttons === 1 && seekTo(e)}
              className="group relative flex h-6 flex-1 cursor-pointer items-center"
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full bg-white/50" style={{ width: `${progress * 100}%` }} />
              </div>
              {markers.map((m) => (
                <button
                  key={m.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkerClick(m.id)
                  }}
                  title={`${formatDuration(m.t)} · ${m.label}`}
                  aria-label={`Comment at ${formatDuration(m.t)}`}
                  className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-black/60 transition-transform hover:scale-150"
                  style={{ left: `${duration ? (m.t / duration) * 100 : 0}%` }}
                />
              ))}
              <span
                className="pointer-events-none absolute top-1/2 size-[22px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums md:text-[13px]">
              {formatDuration(time)} <span className="text-white/50">/ {formatDuration(duration)}</span>
            </span>
            <button
              onClick={() => {
                const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
                setSpeed(next)
                if (mediaRef.current) mediaRef.current.playbackRate = next
              }}
              aria-label="Playback speed"
              className="w-7 shrink-0 text-xs font-semibold transition-opacity hover:opacity-80"
            >
              {speed}x
            </button>
            <button
              onClick={() => {
                setMuted((m) => !m)
                if (mediaRef.current) mediaRef.current.muted = !muted
              }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <button
              onClick={() => (document.fullscreenElement ? document.exitFullscreen() : fullscreenTarget.current?.requestFullscreen())}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className={cn('shrink-0 transition-opacity hover:opacity-80')}
            >
              {isFullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})
MediaStage.displayName = 'MediaStage'
