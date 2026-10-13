import * as React from 'react'
import { cn } from '@/lib/utils'
import { useData } from '@/store/data'
import { useUser } from '@/store/user'
import type { Project } from '@/types'

// ---------- Inline-editable title ----------

export function EditableTitle({ project, autoEdit }: { project: Project; autoEdit?: boolean }) {
  const updateProject = useData((s) => s.updateProject)
  const me = useUser((s) => s.user)
  const [editing, setEditing] = React.useState(!!autoEdit)
  const [draft, setDraft] = React.useState(project.title)
  const cancelled = React.useRef(false)

  const start = () => {
    setDraft(project.title)
    cancelled.current = false
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (cancelled.current) return
    const title = draft.trim()
    if (title && title !== project.title) {
      void updateProject(project.id, { title }, me?.id ?? '', { field: 'Title', from: project.title, to: title })
    }
  }

  const className = '-ml-1.5 w-full rounded-md px-1.5 text-[24px] leading-8 font-bold tracking-tight md:text-[28px] md:leading-9'

  if (editing) {
    return (
      <input
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            cancelled.current = true
            e.currentTarget.blur()
          }
        }}
        aria-label="Project title"
        className={cn(className, 'bg-hover outline-none')}
      />
    )
  }
  return (
    <h1
      role="button"
      tabIndex={0}
      onClick={start}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), start())}
      title="Click to rename"
      className={cn(className, 'cursor-text transition-colors duration-150 hover:bg-hover')}
    >
      {project.title}
    </h1>
  )
}

// ---------- Script with autosave ----------

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g
const HAS_URL = /https?:\/\/\S/

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer noopener"
            onClick={(e) => e.stopPropagation()}
            className="break-all text-foreground underline decoration-subtle-foreground underline-offset-2 hover:decoration-foreground"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  )
}

type SaveState = 'idle' | 'saving' | 'saved'

export function ScriptEditor({ project }: { project: Project }) {
  const updateProject = useData((s) => s.updateProject)
  const me = useUser((s) => s.user)
  const [value, setValue] = React.useState(project.script)
  const [focused, setFocused] = React.useState(false)
  const [state, setState] = React.useState<SaveState>('idle')
  const ref = React.useRef<HTMLTextAreaElement>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = React.useRef(value)

  const persist = React.useCallback(
    async (script: string) => {
      setState('saving')
      await updateProject(project.id, { script }, me?.id ?? '')
      setState((s) => (latest.current === script ? 'saved' : s))
    },
    [project.id, updateProject, me?.id],
  )

  // Flush pending changes when leaving the page.
  React.useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void persist(latest.current)
      }
    },
    [persist],
  )

  // Grow with the content: no inner scroll.
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${el.scrollHeight}px`
  }, [value, focused])

  const onChange = (next: string) => {
    setValue(next)
    latest.current = next
    setState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = undefined
      void persist(next)
    }, 800)
  }

  const showLinks = !focused && HAS_URL.test(value)

  const textClass = 'block w-full px-1 pt-6 pb-8 md:px-8 md:pt-9 md:pb-12 text-[14px] leading-[1.7] whitespace-pre-wrap break-words text-foreground'

  return (
    <div className="relative">
      {showLinks ? (
        <div
          role="textbox"
          tabIndex={0}
          aria-label="Script"
          onClick={() => setFocused(true)}
          onFocus={() => setFocused(true)}
          className={cn(textClass, 'cursor-text rounded-lg transition-colors duration-150 hover:bg-hover/50')}
        >
          <Linkified text={value} />
        </div>
      ) : (
        <textarea
          ref={ref}
          autoFocus={focused}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Write the script…"
          aria-label="Script"
          rows={3}
          className={cn(textClass, 'resize-none overflow-hidden bg-transparent outline-none placeholder:text-subtle-foreground')}
        />
      )}
      <span className="pointer-events-none absolute right-1 bottom-1 text-2xs text-subtle-foreground" aria-live="polite">
        {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : ''}
      </span>
    </div>
  )
}
