// Чистая арифметика сметы и дефолты форм. Ни одного обращения к DOM или сети —
// эти функции одинаково работают в любом дизайне и покрываются тестами напрямую.

import type {
  CalculatorState,
  InventoryLineDraft,
  Order,
  OrderExpenseDraft,
  PricingConfig,
  PricingSettingsForm,
  QuoteBreakdown,
  WorkRange,
} from './types'

export const defaultPricing: PricingConfig = {
  fuelCost: 2000,
  consumablesCost: 1600,
  coalPrice: 7.4,
  tobaccoPricePerGram: 10,
  masterHourRate: 1200,
  hookahHourFactor: 1.5,
  coalsPerHookahSession: 8,
  tobaccoGramsPerHookah: 20,
  serviceFeeLtThreshold: 7000,
  serviceFeeGteThreshold: 8000,
  additionalMasterThreshold: 5,
}

export const initialCalculatorState: CalculatorState = {
  hookahsCount: 4,
  location: '',
}

export const initialCompanyForm = {
  name: '',
  address: '',
  contactName: '',
  phone: '',
  comment: '',
}

export const initialOrderCustomerForm = {
  companyId: '',
  companyName: '',
  companyAddress: '',
  contactName: '',
  phone: '',
  customerComment: '',
}

export const initialGuestForm = {
  companyId: '',
  fullName: '',
  phone: '',
  birthDate: '',
}

export const initialPreferenceForm = {
  guestId: '',
  preferenceId: '',
  preferredBowl: '',
  preferenceComment: '',
  isActual: true,
  items: [{ tobaccoId: '', percent: '100' }] as Array<{ tobaccoId: string; percent: string }>,
}

export const initialTobaccoForm = {
  strength: '',
  brand: '',
  flavorName: '',
  description: '',
}

export const DEFAULT_LINE_DRAFT: InventoryLineDraft = { mode: 'net', net: '', tare: '', gross: '', busy: false }

export function mapApiPricingConfig(payload: {
  fuel_cost: number
  consumables_cost: number
  coal_price: number
  tobacco_price_per_gram: number
  master_hour_rate: number
  hookah_hour_factor: number
  coals_per_hookah_session: number
  tobacco_grams_per_hookah: number
  service_fee_lt_threshold: number
  service_fee_gte_threshold: number
  additional_master_threshold: number
}): PricingConfig {
  return {
    fuelCost: payload.fuel_cost,
    consumablesCost: payload.consumables_cost,
    coalPrice: payload.coal_price,
    tobaccoPricePerGram: payload.tobacco_price_per_gram,
    masterHourRate: payload.master_hour_rate,
    hookahHourFactor: payload.hookah_hour_factor,
    coalsPerHookahSession: payload.coals_per_hookah_session,
    tobaccoGramsPerHookah: payload.tobacco_grams_per_hookah,
    serviceFeeLtThreshold: payload.service_fee_lt_threshold,
    serviceFeeGteThreshold: payload.service_fee_gte_threshold,
    additionalMasterThreshold: payload.additional_master_threshold,
  }
}

export function buildPricingSettingsForm(pricing: PricingConfig): PricingSettingsForm {
  return {
    masterHourRate: pricing.masterHourRate.toString(),
    tobaccoPricePerGram: pricing.tobaccoPricePerGram.toString(),
    coalPrice: pricing.coalPrice.toString(),
    hookahHourFactor: pricing.hookahHourFactor.toString(),
    coalsPerHookahSession: pricing.coalsPerHookahSession.toString(),
    tobaccoGramsPerHookah: pricing.tobaccoGramsPerHookah.toString(),
  }
}

export function createInitialWorkRanges(): WorkRange[] {
  const start = new Date()
  start.setHours(18, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 0, 0, 0)

  return [{ id: 1, start, end }]
}

export function calculateTotalHours(workRanges: WorkRange[]) {
  return workRanges.reduce((totalHours, workRange) => {
    const durationMs = workRange.end.getTime() - workRange.start.getTime()

    if (Number.isNaN(workRange.start.getTime()) || Number.isNaN(workRange.end.getTime()) || durationMs <= 0) {
      return totalHours
    }

    return totalHours + durationMs / (1000 * 60 * 60)
  }, 0)
}

export function roundQuoteTotal(value: number) {
  return Math.round(value / 500) * 500
}

export function calculateQuote(hours: number, hookahsCount: number, pricing: PricingConfig): QuoteBreakdown {
  const extraMasterCost =
    hookahsCount > pricing.additionalMasterThreshold ? pricing.masterHourRate * hours : 0
  const serviceFee =
    hookahsCount > pricing.additionalMasterThreshold
      ? pricing.serviceFeeGteThreshold
      : pricing.serviceFeeLtThreshold
  const coalCost =
    pricing.hookahHourFactor *
    pricing.coalsPerHookahSession *
    pricing.coalPrice *
    hours *
    hookahsCount
  const tobaccoCost =
    pricing.hookahHourFactor *
    pricing.tobaccoGramsPerHookah *
    pricing.tobaccoPricePerGram *
    hours *
    hookahsCount
  const masterCost = pricing.masterHourRate * hours
  const total =
    pricing.fuelCost +
    pricing.consumablesCost +
    coalCost +
    tobaccoCost +
    masterCost +
    extraMasterCost +
    serviceFee

  return {
    fuelCost: pricing.fuelCost,
    consumablesCost: pricing.consumablesCost,
    coalCost,
    tobaccoCost,
    masterCost,
    extraMasterCost,
    serviceFee,
    total,
  }
}

export function buildOrderExpenseDraft(order: Order): OrderExpenseDraft {
  return {
    fuel_expense: order.fuel_expense?.toString() ?? '',
    consumables_expense: order.consumables_expense?.toString() ?? '',
    coal_expense: order.coal_expense?.toString() ?? '',
    tobacco_expense: order.tobacco_expense?.toString() ?? '',
    labor_expense: order.labor_expense?.toString() ?? '',
    extra_expense: order.extra_expense?.toString() ?? '',
    extra_expense_comment: order.extra_expense_comment ?? '',
    status: order.status,
  }
}

export function getOrderExpensePlaceholder(field: keyof OrderExpenseDraft, breakdown: QuoteBreakdown) {
  switch (field) {
    case 'fuel_expense':
      return Math.round(breakdown.fuelCost).toString()
    case 'consumables_expense':
      return Math.round(breakdown.consumablesCost).toString()
    case 'coal_expense':
      return Math.round(breakdown.coalCost).toString()
    case 'tobacco_expense':
      return Math.round(breakdown.tobaccoCost).toString()
    case 'labor_expense':
      return Math.round(breakdown.masterCost + breakdown.extraMasterCost).toString()
    case 'extra_expense':
      return Math.round(breakdown.serviceFee).toString()
    default:
      return ''
  }
}

// Факт из черновика: в режиме нетто — само число; в режиме тары — с тарой − тара.
export function draftCounted(draft: InventoryLineDraft | undefined): number | null {
  if (!draft) {
    return null
  }
  if (draft.mode === 'net') {
    const value = Number(draft.net)
    return draft.net.trim() !== '' && !Number.isNaN(value) ? value : null
  }
  const tare = Number(draft.tare)
  const gross = Number(draft.gross)
  if (draft.tare.trim() === '' || draft.gross.trim() === '' || Number.isNaN(tare) || Number.isNaN(gross)) {
    return null
  }
  return Math.max(gross - tare, 0)
}

export async function parseApiError(response: Response) {
  try {
    const payload = await response.json()
    if (typeof payload.detail === 'string') {
      return payload.detail
    }
  } catch { /* тело не JSON — отдаём общий текст по коду */ }

  return `Ошибка ${response.status}`
}

// Строки-подписи к переменным расчёта, которые дизайн показывает под сметой.
export function buildVariableItems(
  pricing: PricingConfig,
  format: { currency: (value: number) => string; number: (value: number) => string },
) {
  return [
    `Ставка сотрудника: ${format.currency(pricing.masterHourRate)}/ч.`,
    `Средняя стоимость табака: ${format.currency(pricing.tobaccoPricePerGram)}/гр.`,
    `Средняя стоимость угля: ${format.number(pricing.coalPrice)} ₽/шт.`,
    `Среднее количество кальянов в час: ${format.number(pricing.hookahHourFactor)} шт/ч.`,
    `Углей на кальян за сессию: ${format.number(pricing.coalsPerHookahSession)} шт.`,
    `Средний расход табака на 1 кальян: ${format.number(pricing.tobaccoGramsPerHookah)} гр.`,
  ]
}
