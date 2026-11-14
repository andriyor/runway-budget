import { Banknote, Landmark, type LucideIcon } from 'lucide-react'
import type { AccountKind } from './types'

// account-kind labels and icons shared by several components
export const kindLabels: Record<AccountKind, string> = { bank: 'Bank', cash: 'Cash' }

export const kindIcons: Record<AccountKind, LucideIcon> = { bank: Landmark, cash: Banknote }
