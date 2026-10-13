import { CHANNELS, FORMATS, VIDEO_FORMATS, type Project, type ProjectStatus, type ProjectType } from '@/types'
import { createRandom, daysFromToday } from './seed'

const rand = createRandom(42)

const SAMPLE_SCRIPT = `Hook: "Three things I wish I knew before opening my first studio."

1. Your first clients come from people who already trust you. Start there.
2. Price the outcome, not the hours.
3. Film everything: the setup, the mess, the wins.

CTA: comment "STUDIO" and I'll send you the checklist.

Ref: https://www.instagram.com/reel/example-hook/`

const STATUS_WEIGHTS: [ProjectStatus, number][] = [
  ['New', 0.3],
  ['In Progress', 0.22],
  ['In Review', 0.14],
  ['Changes Requested', 0.1],
  ['Approved', 0.1],
  ['Final Video Accepted', 0.14],
]

function pickStatus(): ProjectStatus {
  let r = rand.next()
  for (const [status, w] of STATUS_WEIGHTS) {
    if ((r -= w) <= 0) return status
  }
  return 'New'
}

interface Batch {
  clientId: string
  count: number
  type: ProjectType
  service: string
  named?: string // uppercase prefix for named (non-numbered) projects
  assignees: string[]
}

const batches: Batch[] = [
  { clientId: 'c1', count: 9, type: 'Organic', service: 'Starter 15 Vids', assignees: ['u2', 'u2', 'u3'] },
  { clientId: 'c2', count: 4, type: 'Ads', service: 'Ads Pack 4', named: 'ADS BRUNO LEDESMA', assignees: ['u1'] },
  { clientId: 'c3', count: 8, type: 'Organic', service: 'Growth 30 Vids', assignees: ['u1', 'u4', 'u5'] },
  { clientId: 'c4', count: 7, type: 'UGC', service: 'Pro 60 Vids', assignees: ['u3', 'u5', 'u1'] },
  { clientId: 'c5', count: 4, type: 'Ads', service: 'Ads Pack 4', named: 'ADS CLARA BENÍTEZ', assignees: ['u4'] },
  { clientId: 'c6', count: 6, type: 'Podcast', service: 'Podcast Monthly', assignees: ['u2', 'u1'] },
  { clientId: 'c3', count: 3, type: 'Long Form', service: 'Starter 15 Vids', assignees: ['u5'] },
]

let nextNumber = 210
let seq = 0

export const projects: Project[] = batches.flatMap((b) =>
  Array.from({ length: b.count }, (_, i): Project => {
    seq += 1
    const createdDaysAgo = rand.int(3, 60)
    const hasFormat = rand.chance(0.6)
    const number = b.named ? undefined : nextNumber++
    const assigneeId = rand.pick(b.assignees)
    const approverPool = ['u1', 'u4', 'u2'].filter((id) => id !== assigneeId)
    return {
      id: `p${seq}`,
      number,
      title: b.named ? `${b.named} #${b.count - i}` : String(number),
      clientId: b.clientId,
      status: pickStatus(),
      type: b.type,
      service: b.service,
      assigneeId,
      approverId: rand.chance(0.75) ? rand.pick(approverPool) : undefined,
      ownerId: rand.pick(['u1', 'u4', 'u4', 'u2']),
      dueDate: daysFromToday(rand.int(-18, 32), 11),
      createdAt: daysFromToday(-createdDaysAgo, rand.int(8, 19)),
      updatedAt: daysFromToday(-rand.int(0, Math.min(createdDaysAgo, 5)), rand.int(8, 19)),
      archived: rand.chance(0.12),
      format: hasFormat ? rand.pick(FORMATS).value : undefined,
      videoFormat: hasFormat ? rand.pick(VIDEO_FORMATS).value : undefined,
      scheduledAt: hasFormat && rand.chance(0.5) ? daysFromToday(rand.int(1, 30), 14) : undefined,
      channels: hasFormat ? CHANNELS.filter(() => rand.chance(0.35)) : [],
      script: hasFormat && rand.chance(0.5) ? SAMPLE_SCRIPT : '',
    }
  }),
)
