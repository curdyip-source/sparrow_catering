// Реестр дизайнов. Каждый — самостоятельная вёрстка поверх одного и того же
// headless-хука useSparrow. Чтобы добавить новый: положить папку в src/designs,
// экспортировать компонент вида ({ s }) => JSX и дописать строку сюда.

import type { ComponentType } from 'react'
import type { SparrowApi } from '../core/useSparrow'
import ClassicView from './classic/View'
import LoungeView from './lounge/View'
import EditorialView from './editorial/View'
import TerminalView from './terminal/View'

export type DesignId = 'classic' | 'lounge' | 'editorial' | 'terminal'

export type DesignEntry = {
  id: DesignId
  /** Подпись в селекте переключателя. */
  label: string
  View: ComponentType<{ s: SparrowApi }>
}

export const DESIGNS: DesignEntry[] = [
  { id: 'classic', label: 'Классика', View: ClassicView },
  { id: 'lounge', label: 'Dark Lounge', View: LoungeView },
  { id: 'editorial', label: 'Editorial', View: EditorialView },
  { id: 'terminal', label: 'Terminal', View: TerminalView },
]

export const DEFAULT_DESIGN: DesignId = 'lounge'

export const DESIGN_STORAGE_KEY = 'sparrow_design'

export function isDesignId(value: string): value is DesignId {
  return DESIGNS.some((design) => design.id === value)
}
