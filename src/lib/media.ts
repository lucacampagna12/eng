import type { MediaItem, MediaKind } from '@/types'

export interface MediaMetadata {
  width?: number
  height?: number
  durationSec?: number
  thumbnailUrl?: string
}

export function kindOf(file: File): MediaKind | undefined {
  if (file.type.startsWith('video/')) return 'video'
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('audio/')) return 'audio'
  return undefined
}

const THUMB_WIDTH = 360

function waitFor(el: HTMLMediaElement, event: string, timeoutMs = 8000) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), timeoutMs)
    el.addEventListener(event, () => (clearTimeout(t), resolve()), { once: true })
    el.addEventListener('error', () => (clearTimeout(t), reject(new Error('Could not read media'))), { once: true })
  })
}

function drawThumb(source: CanvasImageSource, w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH
  canvas.height = Math.round((THUMB_WIDTH * h) / w)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8)
}

async function videoMetadata(url: string): Promise<MediaMetadata> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  await waitFor(video, 'loadeddata')
  const durationSec = Number.isFinite(video.duration) ? video.duration : undefined
  const { videoWidth: width, videoHeight: height } = video
  let thumbnailUrl: string | undefined
  try {
    // Grab a frame a little into the clip (the first frame is often black).
    video.currentTime = Math.min(1, (durationSec ?? 0) / 4)
    await waitFor(video, 'seeked')
    if (width && height) thumbnailUrl = drawThumb(video, width, height)
  } catch {
    /* keep the item without a thumbnail */
  }
  video.removeAttribute('src')
  video.load()
  return { width, height, durationSec, thumbnailUrl }
}

async function imageMetadata(url: string): Promise<MediaMetadata> {
  const img = new Image()
  img.src = url
  await img.decode()
  return { width: img.naturalWidth, height: img.naturalHeight, thumbnailUrl: drawThumb(img, img.naturalWidth, img.naturalHeight) }
}

async function audioMetadata(url: string): Promise<MediaMetadata> {
  const audio = document.createElement('audio')
  audio.preload = 'metadata'
  audio.src = url
  await waitFor(audio, 'loadedmetadata')
  return { durationSec: Number.isFinite(audio.duration) ? audio.duration : undefined }
}

/** Reads duration / resolution and builds a thumbnail, entirely in the browser. */
export async function readMediaMetadata(file: File, kind: MediaKind): Promise<MediaMetadata> {
  const url = URL.createObjectURL(file)
  try {
    if (kind === 'video') return await videoMetadata(url)
    if (kind === 'image') return await imageMetadata(url)
    return await audioMetadata(url)
  } catch {
    return {}
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------- Formatting ----------

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${Number(v.toFixed(2))} ${units[i]}`
}

export function formatDuration(sec: number | undefined) {
  if (sec === undefined || !Number.isFinite(sec)) return '–:––'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function extensionOf(item: Pick<MediaItem, 'name' | 'mimeType'>) {
  const fromName = item.name.includes('.') ? item.name.split('.').pop() : undefined
  return (fromName || item.mimeType.split('/')[1] || '').toUpperCase()
}

export function mediaMetaLine(item: MediaItem) {
  return [formatBytes(item.sizeBytes), item.width && item.height ? `${item.width}x${item.height}` : undefined, extensionOf(item)]
    .filter(Boolean)
    .join(' • ')
}
