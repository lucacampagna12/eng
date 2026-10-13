import { format } from 'date-fns'
import { Avatar, StatusDot } from '@/components/common'
import { byId, useData } from '@/store/data'
import { FORMATS, VIDEO_FORMATS, type Project } from '@/types'

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g

/** Read-only "Project Overview" document shown when the content itself is under review. */
export function ContentStage({ project }: { project: Project }) {
  const { clients, users } = useData()
  const client = byId(clients, project.clientId)
  const assignee = byId(users, project.assigneeId)
  const fields: [string, React.ReactNode][] = [
    [
      'Status',
      <span key="s" className="inline-flex items-center gap-1.5">
        <StatusDot status={project.status} /> {project.status}
      </span>,
    ],
    ['Due', format(new Date(project.dueDate), 'dd/MM/yyyy HH:mm')],
    [
      'Client',
      client && (
        <span key="c" className="inline-flex items-center gap-1.5">
          <Avatar name={client.name} src={client.avatarUrl} size={16} /> {client.name}
        </span>
      ),
    ],
    ['Assignee', assignee?.name],
    ['Format', FORMATS.find((f) => f.value === project.format)?.label],
    ['Video format', VIDEO_FORMATS.find((f) => f.value === project.videoFormat)?.label],
    ['Scheduled at', project.scheduledAt && format(new Date(project.scheduledAt), 'dd/MM/yyyy HH:mm')],
    ['Channel', project.channels.length ? project.channels.join(', ') : undefined],
  ]

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-10">
      <article className="mx-auto max-w-[760px] rounded-2xl border border-white/10 bg-[#111820] p-8 text-white shadow-2xl max-md:p-5">
        <p className="text-2xs font-semibold tracking-wider text-white/50 uppercase">Project Overview</p>
        <h1 className="mt-1 text-[22px] leading-8 font-bold md:text-[28px] md:leading-9">{project.title}</h1>
        <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2.5 text-[13px] sm:grid-cols-3">
          {fields
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-2xs text-white/50">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="my-6 h-px bg-white/10" />
        {project.script.trim() ? (
          <p className="text-[15px] leading-[1.75] whitespace-pre-wrap text-white/90">
            {project.script.split(URL_RE).map((part, i) =>
              i % 2 ? (
                <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all underline decoration-white/40 underline-offset-2 hover:decoration-white">
                  {part}
                </a>
              ) : (
                part
              ),
            )}
          </p>
        ) : (
          <p className="text-sm text-white/50 italic">No script has been written for this project yet.</p>
        )}
      </article>
    </div>
  )
}
