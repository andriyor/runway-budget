import { BankIcon, CashIcon } from '../components/icons'
import type { AccountKind } from './types'

// account-kind labels and icons shared by several components
export const kindLabels: Record<AccountKind, string> = { bank: 'Bank', cash: 'Cash' }

export const kindIcons: Record<AccountKind, () => React.JSX.Element> = { bank: BankIcon, cash: CashIcon }
