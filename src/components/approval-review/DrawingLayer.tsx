import * as React from 'react'
import { cn } from '@/lib/utils'
import type { DrawingStroke } from '@/types'

export const DRAW_COLORS = ['#ef4444', '#facc15', '#00b5ca', '#ffffff'] as const
const DEFAULT_WIDTH = 0.006 // relative to the frame width

/**
 * SVG overlay that sits exactly on top of the displayed frame. Points are stored normalized (0–1)
 * so drawings line up at any player size. When `editable`, pointer strokes are captured.
 */
export function DrawingLayer({
  strokes,
  editable,
  color = DRAW_COLORS[0],
  onChange,
  className,
}: {
  strokes: DrawingStroke[]
  editable?: boolean
  color?: string
  onChange?: (strokes: DrawingStroke[]) => void
  className?: string
}) {
  const ref = React.useRef<SVGSVGElement>(null)
  const [size, setSize] = React.useState({ w: 1, h: 1 })
  const [live, setLive] = React.useState<DrawingStroke>()

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width || 1, h: entry.contentRect.height || 1 }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const point = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect()
    const clamp = (v: number) => Math.min(1, Math.max(0, v))
    return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)]
  }

  const toPath = (s: DrawingStroke) =>
    s.points.map(([x, y], i) => `${i ? 'L' : 'M'}${(x * size.w).toFixed(1)} ${(y * size.h).toFixed(1)}`).join(' ') +
    (s.points.length === 1 ? ' l0.1 0' : '')

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${size.w} ${size.h}`}
      className={cn('absolute inset-0 size-full touch-none', editable ? 'cursor-crosshair' : 'pointer-events-none', className)}
      onPointerDown={
        editable
          ? (e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              setLive({ color, width: DEFAULT_WIDTH, points: [point(e)] })
            }
          : undefined
      }
      onPointerMove={editable && live ? (e) => setLive({ ...live, points: [...live.points, point(e)] }) : undefined}
      onPointerUp={
        editable && live
          ? () => {
              onChange?.([...strokes, live])
              setLive(undefined)
            }
          : undefined
      }
    >
      {[...strokes, ...(live ? [live] : [])].map((s, i) => (
        <path
          key={i}
          d={toPath(s)}
          fill="none"
          stroke={s.color}
          strokeWidth={Math.max(2, s.width * size.w)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.5))' }}
        />
      ))}
    </svg>
  )
}
