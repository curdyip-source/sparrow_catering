// Доменные типы приложения. Механика (стейт, запросы, обработчики) живёт в
// useSparrow; дизайны импортируют отсюда только типы.

export type PricingConfig = {
  fuelCost: number
  consumablesCost: number
  coalPrice: number
  tobaccoPricePerGram: number
  masterHourRate: number
  hookahHourFactor: number
  coalsPerHookahSession: number
  tobaccoGramsPerHookah: number
  serviceFeeLtThreshold: number
  serviceFeeGteThreshold: number
  additionalMasterThreshold: number
}

export type PricingSettingsForm = {
  masterHourRate: string
  tobaccoPricePerGram: string
  coalPrice: string
  hookahHourFactor: string
  coalsPerHookahSession: string
  tobaccoGramsPerHookah: string
}

export type QuoteBreakdown = {
  fuelCost: number
  consumablesCost: number
  coalCost: number
  tobaccoCost: number
  masterCost: number
  extraMasterCost: number
  serviceFee: number
  total: number
}

export type CalculatorState = {
  hookahsCount: number
  location: string
}

export type WorkRange = {
  id: number
  start: Date
  end: Date
}

export type AdminUser = {
  id: number
  full_name: string
  login: string
  is_admin: boolean
}

export type BootstrapStatus = {
  needs_admin: boolean
  secret_configured: boolean
}

export type Company = {
  id: number
  name: string
  address?: string | null
  contact_name?: string | null
  phone?: string | null
  comment?: string | null
}

export type TobaccoItem = {
  id: number
  strength: string
  brand: string
  flavor_name: string
  description?: string | null
  cost_per_gram?: number | null
}

export type StockBalance = {
  tobacco_id: number
  brand: string
  flavor_name: string
  strength: string
  cost_per_gram?: number | null
  balance_grams: number
  stock_value?: number | null
}

export type InventoryLine = {
  id: number
  tobacco_id: number
  brand: string
  flavor_name: string
  strength: string
  expected_grams: number
  counted_grams?: number | null
  tare_weight?: number | null
  gross_weight?: number | null
  diff_grams?: number | null
}

export type InventorySession = {
  id: number
  status: 'draft' | 'completed'
  comment?: string | null
  created_at: string
  completed_at?: string | null
  lines_total: number
  lines_counted: number
  diff_total: number
}

export type StockDocumentLine = {
  tobacco_id: number
  brand: string
  flavor_name: string
  strength: string
  grams: number
  cost_per_gram?: number | null
}

export type StockDocument = {
  id: number
  kind: 'receipt' | 'writeoff' | 'inventory'
  inventory_session_id?: number | null
  comment?: string | null
  created_at: string
  lines: StockDocumentLine[]
}

export type InventorySessionDetail = InventorySession & {
  lines: InventoryLine[]
  documents: StockDocument[]
}

// Два способа задать факт: 'net' — вес без тары одним числом; 'gross' — вес тары
// и вес с тарой, нетто = с тарой − тара.
export type InventoryLineDraft = {
  mode: 'net' | 'gross'
  net: string
  tare: string
  gross: string
  busy: boolean
}

// Черновик документа (оприходование/списание), собираемый из инвентаризации.
export type DocKind = 'receipt' | 'writeoff'

export type DocLineDraft = {
  tobaccoId: number
  label: string
  grams: string
  cost: string
}

export type GuestPreferenceItem = {
  id: number
  percent: number
  tobacco: TobaccoItem
}

export type GuestPreference = {
  id: number
  preferred_bowl?: 'turka' | 'phunnel' | null
  preference_comment?: string | null
  is_actual: boolean
  created_at: string
  items: GuestPreferenceItem[]
}

export type Guest = {
  id: number
  company_id: number
  company_name: string
  full_name: string
  phone?: string | null
  birth_date?: string | null
  created_at: string
  preferences: GuestPreference[]
}

export type OrderExpenseDraft = {
  fuel_expense: string
  consumables_expense: string
  coal_expense: string
  tobacco_expense: string
  labor_expense: string
  extra_expense: string
  extra_expense_comment: string
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled'
}

export type Order = {
  id: number
  company_id?: number | null
  company_name: string
  company_address: string
  contact_name: string
  phone: string
  customer_comment?: string | null
  location: string
  event_date: string
  event_time: string
  hours: number
  hookahs_count: number
  quoted_total: number
  fuel_expense?: number | null
  consumables_expense?: number | null
  coal_expense?: number | null
  tobacco_expense?: number | null
  labor_expense?: number | null
  extra_expense?: number | null
  extra_expense_comment?: string | null
  actual_total?: number | null
  actual_profit?: number | null
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled'
  work_ranges: Array<{
    id: number
    starts_at: string
    ends_at: string
  }>
}

export type GuestPreferenceInput = {
  tobaccoId: string
  percent: string
}

export type AdminTab =
  | 'companies'
  | 'guests'
  | 'tobacco'
  | 'inventory'
  | 'receipts'
  | 'writeoffs'
  | 'stock'
  | 'orders'
  | 'pricing'

export type WarehouseTab = 'inventory' | 'receipts' | 'writeoffs' | 'stock'

export type EditorOverlay = null | 'company' | 'guest' | 'tobacco'
