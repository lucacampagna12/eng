import type { Client } from '@/types'
import { gradientAvatar } from './seed'

export const clients: Client[] = [
  { id: 'c1', name: 'Peluquería Norte', avatarUrl: gradientAvatar('#7c3a5a', '#d8b4a0') },
  { id: 'c2', name: 'Bruno Ledesma' },
  { id: 'c3', name: 'Café Ostra', avatarUrl: gradientAvatar('#8a6a1f', '#3b2a12') },
  { id: 'c4', name: 'Nómada Fitness', avatarUrl: gradientAvatar('#1f4e5f', '#69b3a2') },
  { id: 'c5', name: 'Clara Benítez' },
  { id: 'c6', name: 'Clínica Lumen', avatarUrl: gradientAvatar('#3b3f8f', '#a5b4fc') },
]
