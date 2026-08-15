import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import { ru } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import './App.css'
import './AppShell.css'

type PricingConfig = {
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

type PricingSettingsForm = {
  masterHourRate: string
  tobaccoPricePerGram: string
  coalPrice: string
  hookahHourFactor: string
  coalsPerHookahSession: string
  tobaccoGramsPerHookah: string
}

type QuoteBreakdown = {
  fuelCost: number
  consumablesCost: number
  coalCost: number
  tobaccoCost: number
  masterCost: number
  extraMasterCost: number
  serviceFee: number
  total: number
}

type CalculatorState = {
  hookahsCount: number
  location: string
}

type WorkRange = {
  id: number
  start: Date
  end: Date
}

type AdminUser = {
  id: number
  full_name: string
  login: string
  is_admin: boolean
}

type BootstrapStatus = {
  needs_admin: boolean
  secret_configured: boolean
}

type Company = {
  id: number
  name: string
  address?: string | null
  contact_name?: string | null
  phone?: string | null
  comment?: string | null
}

type TobaccoItem = {
  id: number
  strength: string
  brand: string
  flavor_name: string
  description?: string | null
  cost_per_gram?: number | null
}

type StockBalance = {
  tobacco_id: number
  brand: string
  flavor_name: string
  strength: string
  cost_per_gram?: number | null
  balance_grams: number
  stock_value?: number | null
}

type InventoryLine = {
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

type InventorySession = {
  id: number
  status: 'draft' | 'completed'
  comment?: string | null
  created_at: string
  completed_at?: string | null
  lines_total: number
  lines_counted: number
  diff_total: number
}

type StockDocumentLine = {
  tobacco_id: number
  brand: string
  flavor_name: string
  strength: string
  grams: number
  cost_per_gram?: number | null
}

type StockDocument = {
  id: number
  kind: 'receipt' | 'writeoff' | 'inventory'
  inventory_session_id?: number | null
  comment?: string | null
  created_at: string
  lines: StockDocumentLine[]
}

type InventorySessionDetail = InventorySession & {
  lines: InventoryLine[]
  documents: StockDocument[]
}

// Два способа задать факт: 'net' — вес без тары одним числом; 'gross' — вес тары
// и вес с тарой, нетто = с тарой − тара.
type InventoryLineDraft = {
  mode: 'net' | 'gross'
  net: string
  tare: string
  gross: string
  busy: boolean
}

// Черновик документа (оприходование/списание), собираемый из инвентаризации.
type DocKind = 'receipt' | 'writeoff'
type DocLineDraft = {
  tobaccoId: number
  label: string
  grams: string
  cost: string
}

type GuestPreferenceItem = {
  id: number
  percent: number
  tobacco: TobaccoItem
}

type GuestPreference = {
  id: number
  preferred_bowl?: 'turka' | 'phunnel' | null
  preference_comment?: string | null
  is_actual: boolean
  created_at: string
  items: GuestPreferenceItem[]
}

type Guest = {
  id: number
  company_id: number
  company_name: string
  full_name: string
  phone?: string | null
  birth_date?: string | null
  created_at: string
  preferences: GuestPreference[]
}

type OrderExpenseDraft = {
  fuel_expense: string
  consumables_expense: string
  coal_expense: string
  tobacco_expense: string
  labor_expense: string
  extra_expense: string
  extra_expense_comment: string
  status: 'draft' | 'confirmed' | 'completed' | 'cancelled'
}

type Order = {
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

type GuestPreferenceInput = {
  tobaccoId: string
  percent: string
}

const defaultPricing: PricingConfig = {
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

const initialState: CalculatorState = {
  hookahsCount: 4,
  location: '',
}

const initialCompanyForm = {
  name: '',
  address: '',
  contactName: '',
  phone: '',
  comment: '',
}

const initialOrderCustomerForm = {
  companyId: '',
  companyName: '',
  companyAddress: '',
  contactName: '',
  phone: '',
  customerComment: '',
}

const initialGuestForm = {
  companyId: '',
  fullName: '',
  phone: '',
  birthDate: '',
}

const initialPreferenceForm = {
  guestId: '',
  preferenceId: '',
  preferredBowl: '',
  preferenceComment: '',
  isActual: true,
  items: [{ tobaccoId: '', percent: '100' }] as GuestPreferenceInput[],
}

const initialTobaccoForm = {
  strength: '',
  brand: '',
  flavorName: '',
  description: '',
}

function mapApiPricingConfig(payload: {
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

function buildPricingSettingsForm(pricing: PricingConfig): PricingSettingsForm {
  return {
    masterHourRate: pricing.masterHourRate.toString(),
    tobaccoPricePerGram: pricing.tobaccoPricePerGram.toString(),
    coalPrice: pricing.coalPrice.toString(),
    hookahHourFactor: pricing.hookahHourFactor.toString(),
    coalsPerHookahSession: pricing.coalsPerHookahSession.toString(),
    tobaccoGramsPerHookah: pricing.tobaccoGramsPerHookah.toString(),
  }
}

function createInitialWorkRanges(): WorkRange[] {
  const start = new Date()
  start.setHours(18, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 0, 0, 0)

  return [{ id: 1, start, end }]
}

function calculateTotalHours(workRanges: WorkRange[]) {
  return workRanges.reduce((totalHours, workRange) => {
    const durationMs = workRange.end.getTime() - workRange.start.getTime()

    if (Number.isNaN(workRange.start.getTime()) || Number.isNaN(workRange.end.getTime()) || durationMs <= 0) {
      return totalHours
    }

    return totalHours + durationMs / (1000 * 60 * 60)
  }, 0)
}

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
}

function formatPositions(count: number) {
  const tail = count % 100
  const last = count % 10
  const word = tail >= 11 && tail <= 14 ? 'позиций' : last === 1 ? 'позиция' : last >= 2 && last <= 4 ? 'позиции' : 'позиций'
  return `${count} ${word}`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatBirthDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function roundQuoteTotal(value: number) {
  return Math.round(value / 500) * 500
}

function calculateQuote(hours: number, hookahsCount: number, pricing: PricingConfig): QuoteBreakdown {
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

function buildOrderExpenseDraft(order: Order): OrderExpenseDraft {
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

function getOrderExpensePlaceholder(field: keyof OrderExpenseDraft, breakdown: QuoteBreakdown) {
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

async function parseApiError(response: Response) {
  try {
    const payload = await response.json()
    if (typeof payload.detail === 'string') {
      return payload.detail
    }
  } catch {}

  return `Ошибка ${response.status}`
}

function AppShell() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing)
  const [calculator, setCalculator] = useState<CalculatorState>(initialState)
  const [workRanges, setWorkRanges] = useState<WorkRange[]>(() => createInitialWorkRanges())
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('sparrow_admin_token') || '')
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [authForm, setAuthForm] = useState({ login: '', password: '' })
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus | null>(null)
  const [bootstrapForm, setBootstrapForm] = useState({
    fullName: '',
    login: '',
    password: '',
    adminSecret: '',
  })
  const [authOpen, setAuthOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<'neutral' | 'error'>('neutral')
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [adminTab, setAdminTab] = useState<'companies' | 'guests' | 'tobacco' | 'inventory' | 'receipts' | 'writeoffs' | 'stock' | 'orders' | 'pricing'>('companies')
  const [editorOverlay, setEditorOverlay] = useState<null | 'company' | 'guest' | 'tobacco'>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyForm, setCompanyForm] = useState(initialCompanyForm)
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null)
  const [companyBusy, setCompanyBusy] = useState(false)
  const [tobaccoCatalog, setTobaccoCatalog] = useState<TobaccoItem[]>([])
  const [tobaccoQuery, setTobaccoQuery] = useState('')
  const [tobaccoForm, setTobaccoForm] = useState(initialTobaccoForm)
  const [tobaccoBusy, setTobaccoBusy] = useState(false)
  // Выбранный бренд в меню каталога; пустая строка — «Все бренды».
  const [catalogBrand, setCatalogBrand] = useState('')
  // Оверлей каталога: null — создаём новую позицию, id — правим существующую.
  const [editingTobaccoId, setEditingTobaccoId] = useState<number | null>(null)
  const [stockBrand, setStockBrand] = useState('')
  const [stockStrength, setStockStrength] = useState('')
  const [stockRows, setStockRows] = useState<StockBalance[]>([])
  const [inventories, setInventories] = useState<InventorySession[]>([])
  const [activeInventory, setActiveInventory] = useState<InventorySessionDetail | null>(null)
  const [inventoryBusy, setInventoryBusy] = useState(false)
  const [lineDrafts, setLineDrafts] = useState<Record<number, InventoryLineDraft>>({})
  const [tareAll, setTareAll] = useState('')
  const [sessionQuery, setSessionQuery] = useState('')
  // Единый редактор документа: и standalone (из раздела Документы), и из инвента.
  const [stockDocuments, setStockDocuments] = useState<StockDocument[]>([])
  const [saKind, setSaKind] = useState<DocKind | null>(null)
  const [saLines, setSaLines] = useState<DocLineDraft[]>([])
  const [saQuery, setSaQuery] = useState('')
  const [saBusy, setSaBusy] = useState(false)
  // Если документ открыт из инвентаризации — её id (для привязки и возврата).
  const [saSessionId, setSaSessionId] = useState<number | null>(null)
  // Если правим уже созданный документ — его id (иначе создаём новый).
  const [saDocId, setSaDocId] = useState<number | null>(null)
  const [saComment, setSaComment] = useState('')
  const [saCreatedAt, setSaCreatedAt] = useState<string | null>(null)
  const [lastWarehouse, setLastWarehouse] = useState<'inventory' | 'receipts' | 'writeoffs' | 'stock'>('inventory')
  const [guests, setGuests] = useState<Guest[]>([])
  const [guestQuery, setGuestQuery] = useState('')
  const [guestForm, setGuestForm] = useState(initialGuestForm)
  const [editingGuestId, setEditingGuestId] = useState<number | null>(null)
  const [preferenceForm, setPreferenceForm] = useState(initialPreferenceForm)
  const [preferenceOverlayOpen, setPreferenceOverlayOpen] = useState(false)
  const [guestBusy, setGuestBusy] = useState(false)
  const [preferenceBusy, setPreferenceBusy] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderDrafts, setOrderDrafts] = useState<Record<number, OrderExpenseDraft>>({})
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null)
  const [createOrderOpen, setCreateOrderOpen] = useState(false)
  const [orderCustomerForm, setOrderCustomerForm] = useState(initialOrderCustomerForm)
  const [orderCompanyQuery, setOrderCompanyQuery] = useState('')
  const [orderCompanyResults, setOrderCompanyResults] = useState<Company[]>([])
  const [createOrderBusy, setCreateOrderBusy] = useState(false)
  const [pricingForm, setPricingForm] = useState<PricingSettingsForm>(() => buildPricingSettingsForm(defaultPricing))
  const [pricingBusy, setPricingBusy] = useState(false)

  useEffect(() => {
    let active = true

    const loadPricing = async () => {
      try {
        const pricingResponse = await fetch(`${apiBaseUrl}/api/v1/pricing/default`)

        if (!pricingResponse.ok) {
          return
        }

        const payload = await pricingResponse.json()
        if (!active) {
          return
        }

        setPricing(mapApiPricingConfig(payload))
      } catch {}
    }

    void loadPricing()

    return () => {
      active = false
    }
  }, [apiBaseUrl])

  useEffect(() => {
    setPricingForm(buildPricingSettingsForm(pricing))
  }, [pricing])

  useEffect(() => {
    let active = true

    const loadBootstrapStatus = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/bootstrap/status`)
        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as BootstrapStatus
        if (active) {
          setBootstrapStatus(payload)
        }
      } catch {}
    }

    void loadBootstrapStatus()

    return () => {
      active = false
    }
  }, [apiBaseUrl])

  const authorizedFetch = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers)
    headers.set('Content-Type', 'application/json')
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })

    if (!response.ok) {
      const message = await parseApiError(response)
      throw new Error(message)
    }

    return response
  }

  const loadCompanies = async (query = '') => {
    const response = await authorizedFetch(`/api/v1/admin/companies?query=${encodeURIComponent(query)}`)
    const payload = (await response.json()) as Company[]
    setCompanies(payload)
    return payload
  }

  const loadTobacco = async (query = '') => {
    const response = await authorizedFetch(`/api/v1/admin/tobacco?query=${encodeURIComponent(query)}`)
    const payload = (await response.json()) as TobaccoItem[]
    setTobaccoCatalog(payload)
    return payload
  }

  const loadStock = async () => {
    const response = await authorizedFetch('/api/v1/admin/stock')
    const payload = (await response.json()) as StockBalance[]
    setStockRows(payload)
    return payload
  }

  const loadInventories = async () => {
    const response = await authorizedFetch('/api/v1/admin/inventories')
    const payload = (await response.json()) as InventorySession[]
    setInventories(payload)
    return payload
  }

  const loadStockDocuments = async () => {
    const response = await authorizedFetch('/api/v1/admin/stock/documents')
    const payload = (await response.json()) as StockDocument[]
    setStockDocuments(payload)
    return payload
  }

  const loadGuests = async () => {
    const response = await authorizedFetch('/api/v1/admin/guests')
    setGuests((await response.json()) as Guest[])
  }

  const loadOrders = async () => {
    const response = await authorizedFetch('/api/v1/admin/orders')
    const payload = (await response.json()) as Order[]
    setOrders(payload)
    setOrderDrafts(Object.fromEntries(payload.map((order) => [order.id, buildOrderExpenseDraft(order)])))
  }

  useEffect(() => {
    if (!authToken) {
      setAdminUser(null)
      return
    }

    let active = true

    const restoreSession = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/admin/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })

        if (!response.ok) {
          throw new Error('Сессия истекла')
        }

        const payload = (await response.json()) as AdminUser
        if (active) {
          setAdminUser(payload)
        }
      } catch {
        localStorage.removeItem('sparrow_admin_token')
        if (active) {
          setAuthToken('')
          setAdminUser(null)
        }
      }
    }

    void restoreSession()

    return () => {
      active = false
    }
  }, [apiBaseUrl, authToken])

  useEffect(() => {
    if (!adminUser) {
      return
    }

    const loadAdminData = async () => {
      try {
        await Promise.all([loadCompanies(companyQuery), loadTobacco(), loadStock(), loadInventories(), loadStockDocuments(), loadGuests(), loadOrders()])
      } catch (error) {
        setNotice(error instanceof Error ? error.message : 'Не удалось загрузить админские данные')
        setNoticeTone('error')
      }
    }

    void loadAdminData()
  }, [adminUser])

  useEffect(() => {
    if (!adminUser || !createOrderOpen) {
      return
    }

    let active = true

    const loadMatches = async () => {
      try {
        const response = await authorizedFetch(`/api/v1/admin/companies?query=${encodeURIComponent(orderCompanyQuery)}`)
        const payload = (await response.json()) as Company[]
        if (active) {
          setOrderCompanyResults(payload)
        }
      } catch {
        if (active) {
          setOrderCompanyResults([])
        }
      }
    }

    void loadMatches()

    return () => {
      active = false
    }
  }, [adminUser, createOrderOpen, orderCompanyQuery])

  const totalHours = calculateTotalHours(workRanges)
  const breakdown = calculateQuote(totalHours, calculator.hookahsCount, pricing)
  const roundedTotal = roundQuoteTotal(breakdown.total)
  const variableItems = [
    `Ставка сотрудника: ${formatCurrency(pricing.masterHourRate)}/ч.`,
    `Средняя стоимость табака: ${formatCurrency(pricing.tobaccoPricePerGram)}/гр.`,
    `Средняя стоимость угля: ${formatNumber(pricing.coalPrice)} ₽/шт.`,
    `Среднее количество кальянов в час: ${formatNumber(pricing.hookahHourFactor)} шт/ч.`,
    `Углей на кальян за сессию: ${formatNumber(pricing.coalsPerHookahSession)} шт.`,
    `Средний расход табака на 1 кальян: ${formatNumber(pricing.tobaccoGramsPerHookah)} гр.`,
  ]
  const guestPreferenceTotal = preferenceForm.items.reduce((sum, item) => sum + (Number(item.percent) || 0), 0)
  const activeOrder = activeOrderId == null ? null : orders.find((order) => order.id === activeOrderId) ?? null
  const activeOrderBreakdown = activeOrder ? calculateQuote(activeOrder.hours, activeOrder.hookahs_count, pricing) : null
  const normalizedGuestQuery = guestQuery.trim().toLowerCase()
  const filteredGuests = normalizedGuestQuery
    ? guests.filter((guest) => {
        const haystack = [guest.full_name, guest.company_name, guest.phone ?? '', guest.birth_date ?? '']
          .join(' ')
          .toLowerCase()
        return haystack.includes(normalizedGuestQuery)
      })
    : guests

  const matchesTobacco = (item: TobaccoItem, query: string) => {
    const haystack = [item.brand, item.flavor_name, item.strength, item.description ?? ''].join(' ').toLowerCase()
    return haystack.includes(query)
  }

  const normalizedTobaccoQuery = tobaccoQuery.trim().toLowerCase()
  const filteredTobacco = normalizedTobaccoQuery
    ? tobaccoCatalog.filter((item) => matchesTobacco(item, normalizedTobaccoQuery))
    : tobaccoCatalog

  // Каталог: слева меню брендов (с «Все»), справа позиции выбранного бренда.
  const catalogBrandCounts = filteredTobacco.reduce((counts, item) => {
    counts.set(item.brand, (counts.get(item.brand) ?? 0) + 1)
    return counts
  }, new Map<string, number>())
  const catalogBrands = Array.from(catalogBrandCounts.keys()).sort((left, right) => left.localeCompare(right, 'ru'))
  const catalogItems = filteredTobacco
    .filter((item) => !catalogBrand || item.brand === catalogBrand)
    .sort(
      (left, right) =>
        left.brand.localeCompare(right.brand, 'ru') || left.flavor_name.localeCompare(right.flavor_name, 'ru'),
    )

  const tobaccoBrands = Array.from(new Set(tobaccoCatalog.map((item) => item.brand))).sort((a, b) => a.localeCompare(b, 'ru'))
  const tobaccoStrengths = Array.from(new Set(tobaccoCatalog.map((item) => item.strength))).sort((a, b) => a.localeCompare(b, 'ru'))
  const filteredStock = stockRows.filter(
    (item) => (!stockBrand || item.brand === stockBrand) && (!stockStrength || item.strength === stockStrength),
  )
  const stockValueTotal = filteredStock.reduce((sum, item) => sum + (item.stock_value ?? 0), 0)

  const sessionLineIds = new Set(activeInventory?.lines.map((line) => line.tobacco_id) ?? [])
  const normalizedSessionQuery = sessionQuery.trim().toLowerCase()
  const sessionSearchResults = normalizedSessionQuery
    ? tobaccoCatalog.filter((item) => !sessionLineIds.has(item.id) && matchesTobacco(item, normalizedSessionQuery)).slice(0, 12)
    : []

  const saLineIds = new Set(saLines.map((line) => line.tobaccoId))
  const normalizedSaQuery = saQuery.trim().toLowerCase()
  const saSearchResults = normalizedSaQuery
    ? tobaccoCatalog.filter((item) => !saLineIds.has(item.id) && matchesTobacco(item, normalizedSaQuery)).slice(0, 12)
    : []

  const resetCompanyForm = () => {
    setCompanyForm(initialCompanyForm)
    setEditingCompanyId(null)
  }

  const resetGuestForm = () => {
    setGuestForm(initialGuestForm)
    setEditingGuestId(null)
  }

  const resetTobaccoForm = () => {
    setTobaccoForm(initialTobaccoForm)
  }

  const resetPreferenceForm = (guestId = '') => {
    setPreferenceForm({ ...initialPreferenceForm, guestId })
  }

  const handlePricingFieldChange = (field: keyof PricingSettingsForm) => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setPricingForm((current) => ({ ...current, [field]: value }))
    }
  }

  const openPreferenceOverlay = (guestId: string) => {
    resetPreferenceForm(guestId)
    setPreferenceOverlayOpen(true)
  }

  const handleNumberChange = (field: 'hookahsCount') => {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value)
      setCalculator((current) => ({
        ...current,
        [field]: Number.isNaN(nextValue) ? current[field] : nextValue,
      }))
    }
  }

  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCalculator((current) => ({ ...current, location: event.target.value }))
  }

  const handleWorkRangeChange = (id: number, field: keyof Omit<WorkRange, 'id'>) => {
    return (nextValue: Date | null) => {
      if (!nextValue) {
        return
      }

      setWorkRanges((current) =>
        current.map((workRange) =>
          workRange.id === id
            ? {
                ...workRange,
                [field]: nextValue,
              }
            : workRange,
        ),
      )
    }
  }

  const handleAddWorkRange = () => {
    setWorkRanges((current) => {
      const lastWorkRange = current[current.length - 1]
      const nextStart = lastWorkRange ? new Date(lastWorkRange.end) : new Date()

      if (Number.isNaN(nextStart.getTime())) {
        nextStart.setHours(18, 0, 0, 0)
      }

      const nextEnd = new Date(nextStart)
      nextEnd.setHours(nextEnd.getHours() + 5)

      return [...current, { id: current.length ? Math.max(...current.map((item) => item.id)) + 1 : 1, start: nextStart, end: nextEnd }]
    })
  }

  const handleRemoveWorkRange = (id: number) => {
    setWorkRanges((current) => current.filter((workRange) => workRange.id !== id))
  }

  const handleDownloadPdf = async () => {
    // Снимаем только карточку расчёта (со своим тёмным фоном), а не всю страницу —
    // иначе в кадр попадают отступы #root и получаются белые поля сверху/снизу.
    const target = (document.querySelector('.calculator-card-wide') as HTMLElement | null) ?? document.documentElement
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#3a2319',
      onclone: (doc) => {
        const card = doc.querySelector('.calculator-card-wide') as HTMLElement | null
        if (card) {
          // Убираем скруглённую светлую рамку и тень: контент ляжет в PDF впритык,
          // прямоугольником, без «бортика» другого цвета вокруг.
          card.style.borderRadius = '0'
          card.style.border = 'none'
          card.style.boxShadow = 'none'
        }
        // Чуть больше воздуха снизу в полях ввода, чтобы текст дат не подрезался.
        doc.querySelectorAll('.calculator-card-wide input').forEach((node) => {
          const input = node as HTMLElement
          input.style.lineHeight = '1.2'
          input.style.paddingBottom = '18px'
        })
      },
    })

    const imageData = canvas.toDataURL('image/png')
    // Страница PDF ровно по размеру контента: изображение заполняет её целиком, без полей.
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height],
      compress: true,
    })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    pdf.addImage(imageData, 'PNG', 0, 0, pageWidth, pageHeight)
    pdf.save(`sparrow-catering-${formatNumber(totalHours)}h-${calculator.hookahsCount}hookahs.pdf`)
  }

  const handleSavePricing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPricingBusy(true)

    try {
      const payload = {
        master_hour_rate: Number(pricingForm.masterHourRate),
        tobacco_price_per_gram: Number(pricingForm.tobaccoPricePerGram),
        coal_price: Number(pricingForm.coalPrice),
        hookah_hour_factor: Number(pricingForm.hookahHourFactor),
        coals_per_hookah_session: Number(pricingForm.coalsPerHookahSession),
        tobacco_grams_per_hookah: Number(pricingForm.tobaccoGramsPerHookah),
      }

      if (Object.values(payload).some((value) => Number.isNaN(value) || value < 0)) {
        throw new Error('Проверьте параметры расчета')
      }

      const response = await authorizedFetch('/api/v1/admin/pricing', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })

      const updatedPricing = mapApiPricingConfig(await response.json())
      setPricing(updatedPricing)
      setNotice('Параметры расчета сохранены')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить параметры расчета')
      setNoticeTone('error')
    } finally {
      setPricingBusy(false)
    }
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      })

      if (!response.ok) {
        throw new Error(await parseApiError(response))
      }

      const payload = (await response.json()) as { token: string; user: AdminUser }
      localStorage.setItem('sparrow_admin_token', payload.token)
      setAuthToken(payload.token)
      setAdminUser(payload.user)
      setAuthOpen(false)
      setAdminPanelOpen(true)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleBootstrapAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/bootstrap/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: bootstrapForm.fullName,
          login: bootstrapForm.login,
          password: bootstrapForm.password,
          admin_secret: bootstrapForm.adminSecret,
        }),
      })

      if (!response.ok) {
        throw new Error(await parseApiError(response))
      }

      setBootstrapStatus({ needs_admin: false, secret_configured: true })
      setAuthForm({ login: bootstrapForm.login, password: bootstrapForm.password })
      setNotice('Первый администратор создан. Теперь можно войти по логину и паролю.')
      setNoticeTone('neutral')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Не удалось создать первого администратора')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('sparrow_admin_token')
    setAuthToken('')
    setAdminUser(null)
    setNotice('')
  }

  const handleCreateCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCompanyBusy(true)

    try {
      await authorizedFetch(editingCompanyId ? `/api/v1/admin/companies/${editingCompanyId}` : '/api/v1/admin/companies', {
        method: editingCompanyId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: companyForm.name,
          address: companyForm.address || null,
          contact_name: companyForm.contactName || null,
          phone: companyForm.phone || null,
          comment: companyForm.comment || null,
        }),
      })
      resetCompanyForm()
      setEditorOverlay(null)
      await loadCompanies(companyQuery)
      setNotice(editingCompanyId ? 'Компания обновлена' : 'Компания добавлена в базу заказчиков')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить компанию')
      setNoticeTone('error')
    } finally {
      setCompanyBusy(false)
    }
  }

  const handleDeleteCompany = async (companyId: number) => {
    if (!window.confirm('Удалить компанию? Гости этой компании тоже будут удалены.')) {
      return
    }

    try {
      await authorizedFetch(`/api/v1/admin/companies/${companyId}`, { method: 'DELETE' })
      if (editingCompanyId === companyId) {
        resetCompanyForm()
      }
      await Promise.all([loadCompanies(companyQuery), loadGuests(), loadOrders()])
      setNotice('Компания удалена')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить компанию')
      setNoticeTone('error')
    }
  }

  const handleCreateTobacco = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTobaccoBusy(true)

    const editingId = editingTobaccoId
    try {
      await authorizedFetch(editingId != null ? `/api/v1/admin/tobacco/${editingId}` : '/api/v1/admin/tobacco', {
        method: editingId != null ? 'PATCH' : 'POST',
        body: JSON.stringify({
          strength: tobaccoForm.strength,
          brand: tobaccoForm.brand,
          flavor_name: tobaccoForm.flavorName,
          description: tobaccoForm.description || null,
        }),
      })
      resetTobaccoForm()
      setEditingTobaccoId(null)
      setEditorOverlay(null)
      await Promise.all([loadTobacco(tobaccoQuery), loadStock()])
      setNotice(editingId != null ? 'Позиция каталога обновлена' : 'Позиция табака добавлена в каталог')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить табак')
      setNoticeTone('error')
    } finally {
      setTobaccoBusy(false)
    }
  }

  // ── Инвентаризация ───────────────────────────────────────────────
  const seedFromLine = (line: InventoryLine): InventoryLineDraft => ({
    mode: line.tare_weight != null || line.gross_weight != null ? 'gross' : 'net',
    net: line.counted_grams != null ? line.counted_grams.toString() : '',
    tare: line.tare_weight != null ? line.tare_weight.toString() : '',
    gross: line.gross_weight != null ? line.gross_weight.toString() : '',
    busy: false,
  })

  // Факт из черновика: в режиме нетто — само число; в режиме тары — с тарой − тара.
  const draftCounted = (draft: InventoryLineDraft | undefined): number | null => {
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

  // reset=true — заново (при открытии сессии); иначе мёрдж: сохраняем правки уже
  // существующих строк, добавляем черновики новым и убираем удалённые.
  const seedLineDrafts = (session: InventorySessionDetail, reset = false) => {
    setLineDrafts((current) => {
      const ids = new Set(session.lines.map((line) => line.id))
      const next: Record<number, InventoryLineDraft> = reset ? {} : { ...current }
      for (const id of Object.keys(next).map(Number)) {
        if (!ids.has(id)) {
          delete next[id]
        }
      }
      for (const line of session.lines) {
        if (!next[line.id]) {
          next[line.id] = seedFromLine(line)
        }
      }
      return next
    })
  }

  const openInventory = async (sessionId: number) => {
    setInventoryBusy(true)
    try {
      const response = await authorizedFetch(`/api/v1/admin/inventories/${sessionId}`)
      const detail = (await response.json()) as InventorySessionDetail
      setActiveInventory(detail)
      seedLineDrafts(detail, true)
      closeStandaloneDoc()
      setSessionQuery('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть инвентаризацию')
      setNoticeTone('error')
    } finally {
      setInventoryBusy(false)
    }
  }

  const startInventory = async () => {
    setInventoryBusy(true)
    try {
      const response = await authorizedFetch('/api/v1/admin/inventories', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const detail = (await response.json()) as InventorySessionDetail
      setActiveInventory(detail)
      seedLineDrafts(detail, true)
      closeStandaloneDoc()
      setSessionQuery('')
      await loadInventories()
      setNotice(`Инвентаризация #${detail.id} начата`)
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось начать инвентаризацию')
      setNoticeTone('error')
    } finally {
      setInventoryBusy(false)
    }
  }

  const addInventoryPosition = async (tobaccoId: number) => {
    if (!activeInventory) {
      return
    }
    try {
      const response = await authorizedFetch(`/api/v1/admin/inventories/${activeInventory.id}/lines`, {
        method: 'POST',
        body: JSON.stringify({ tobacco_id: tobaccoId }),
      })
      const detail = (await response.json()) as InventorySessionDetail
      setActiveInventory(detail)
      seedLineDrafts(detail)
      setSessionQuery('')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось добавить позицию')
      setNoticeTone('error')
    }
  }

  const removeInventoryLine = async (lineId: number) => {
    if (!activeInventory) {
      return
    }
    try {
      const response = await authorizedFetch(`/api/v1/admin/inventories/${activeInventory.id}/lines/${lineId}`, {
        method: 'DELETE',
      })
      const detail = (await response.json()) as InventorySessionDetail
      setActiveInventory(detail)
      seedLineDrafts(detail)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось убрать позицию')
      setNoticeTone('error')
    }
  }

  const DEFAULT_DRAFT: InventoryLineDraft = { mode: 'net', net: '', tare: '', gross: '', busy: false }

  const setLineMode = (lineId: number, mode: 'net' | 'gross') => {
    setLineDrafts((current) => ({ ...current, [lineId]: { ...(current[lineId] ?? DEFAULT_DRAFT), mode } }))
  }

  const updateLineDraft = (lineId: number, field: 'tare' | 'gross' | 'net', value: string) => {
    setLineDrafts((current) => ({ ...current, [lineId]: { ...(current[lineId] ?? DEFAULT_DRAFT), [field]: value } }))
  }

  // Одна тара на все строки: проставляем тару и переводим строки в режим «с тарой».
  const applyTareToAll = () => {
    if (!activeInventory) {
      return
    }
    setLineDrafts((current) => {
      const next = { ...current }
      for (const line of activeInventory.lines) {
        const row = next[line.id] ?? DEFAULT_DRAFT
        next[line.id] = { ...row, tare: tareAll, mode: 'gross' }
      }
      return next
    })
  }

  // Сохранить весь пересчёт разом (без построчных галочек). Возвращает свежий detail.
  const persistInventory = async (): Promise<InventorySessionDetail | null> => {
    if (!activeInventory) {
      return null
    }
    const lines = activeInventory.lines.map((line) => {
      const draft = lineDrafts[line.id] ?? DEFAULT_DRAFT
      const counted = draftCounted(draft)
      return {
        line_id: line.id,
        counted_grams: counted,
        tare_weight: draft.mode === 'gross' && draft.tare.trim() !== '' ? Number(draft.tare) : null,
        gross_weight: draft.mode === 'gross' && draft.gross.trim() !== '' ? Number(draft.gross) : null,
      }
    })
    const response = await authorizedFetch(`/api/v1/admin/inventories/${activeInventory.id}/save`, {
      method: 'POST',
      body: JSON.stringify({ lines }),
    })
    const detail = (await response.json()) as InventorySessionDetail
    setActiveInventory(detail)
    seedLineDrafts(detail)
    return detail
  }

  const saveInventory = async () => {
    setInventoryBusy(true)
    try {
      await persistInventory()
      setNotice('Пересчёт сохранён')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить пересчёт')
      setNoticeTone('error')
    } finally {
      setInventoryBusy(false)
    }
  }

  // Из инвентаризации: сохраняем пересчёт и открываем полноценную форму документа
  // (вкладка Списание/Оприходование), предзаполненную свежей разницей.
  const startDocFromInventory = async (kind: DocKind) => {
    if (!activeInventory) {
      return
    }
    setInventoryBusy(true)
    try {
      const detail = await persistInventory()
      if (!detail) {
        return
      }
      const documented = new Set(
        detail.documents.filter((doc) => doc.kind === kind).flatMap((doc) => doc.lines.map((line) => line.tobacco_id)),
      )
      const prefilled: DocLineDraft[] = detail.lines
        .map((line) => {
          const diff = line.counted_grams != null ? line.counted_grams - line.expected_grams : null
          const grams = documented.has(line.tobacco_id)
            ? 0
            : diff == null
              ? 0
              : kind === 'writeoff'
                ? (diff < 0 ? -diff : 0)
                : diff > 0
                  ? diff
                  : 0
          return { tobaccoId: line.tobacco_id, label: `${line.brand} — ${line.flavor_name}`, grams: grams > 0 ? grams.toString() : '', cost: '' }
        })
        .filter((line) => line.grams !== '')
      setSaKind(kind)
      setSaLines(prefilled)
      setSaQuery('')
      setSaSessionId(detail.id)
      setSaDocId(null)
      setSaComment('')
      setSaCreatedAt(null)
      setLastWarehouse(kind === 'receipt' ? 'receipts' : 'writeoffs')
      setAdminTab(kind === 'receipt' ? 'receipts' : 'writeoffs')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось открыть документ')
      setNoticeTone('error')
    } finally {
      setInventoryBusy(false)
    }
  }

  // ── Документы: самостоятельные проводки ──────────────────────────
  const openStandaloneDoc = (kind: DocKind) => {
    setSaKind(kind)
    setSaLines([])
    setSaQuery('')
    setSaSessionId(null)
    setSaDocId(null)
    setSaComment('')
    setSaCreatedAt(null)
  }

  // Открыть уже проведённый документ на правку: количества и себестоимость.
  const openDocumentForEdit = (doc: StockDocument) => {
    if (doc.kind !== 'receipt' && doc.kind !== 'writeoff') {
      return
    }
    setSaKind(doc.kind)
    setSaLines(
      doc.lines.map((line) => ({
        tobaccoId: line.tobacco_id,
        label: `${line.brand} — ${line.flavor_name}`,
        grams: line.grams.toString(),
        cost: line.cost_per_gram != null ? line.cost_per_gram.toString() : '',
      })),
    )
    setSaQuery('')
    setSaSessionId(null)
    setSaDocId(doc.id)
    setSaComment(doc.comment ?? '')
    setSaCreatedAt(doc.created_at)
    // Страница документа живёт во вкладке своего типа — из инвентаризации переходим туда.
    setLastWarehouse(doc.kind === 'receipt' ? 'receipts' : 'writeoffs')
    setAdminTab(doc.kind === 'receipt' ? 'receipts' : 'writeoffs')
  }

  const closeStandaloneDoc = () => {
    setSaKind(null)
    setSaLines([])
    setSaQuery('')
    setSaSessionId(null)
    setSaDocId(null)
    setSaComment('')
    setSaCreatedAt(null)
  }

  const cancelDoc = () => {
    const sessionId = saSessionId
    closeStandaloneDoc()
    if (sessionId != null) {
      setAdminTab('inventory')
    }
  }

  const goTab = (tab: typeof adminTab) => {
    closeStandaloneDoc()
    if (tab === 'inventory' || tab === 'receipts' || tab === 'writeoffs' || tab === 'stock') {
      setLastWarehouse(tab)
    }
    setAdminTab(tab)
  }

  // Строка реестра документов: только шапка и итоги, без перечня позиций —
  // состав раскрывается в редакторе по клику на строку.
  const renderDocRow = (doc: StockDocument) => {
    const label = doc.kind === 'receipt' ? 'Оприходование' : 'Списание'
    const sign = doc.kind === 'receipt' ? '+' : '−'
    const grams = doc.lines.reduce((total, line) => total + line.grams, 0)
    const priced = doc.lines.filter((line) => line.cost_per_gram != null)
    const value = priced.reduce((total, line) => total + line.grams * (line.cost_per_gram ?? 0), 0)
    const open = () => openDocumentForEdit(doc)
    return (
      <div
        key={doc.id}
        className="doc-history-item doc-history-row clickable-row"
        role="button"
        tabIndex={0}
        aria-label={`${label} #${doc.id} — открыть`}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open()
          }
        }}
      >
        <div className="doc-row-main">
          <span className={doc.kind === 'receipt' ? 'pill-inline' : 'pill-inline pill-inline-warn'}>{label} #{doc.id}</span>
          <small>{formatDateTime(doc.created_at)}</small>
          {doc.inventory_session_id != null ? <small>· из инвентаризации #{doc.inventory_session_id}</small> : null}
          {doc.comment ? <small>· {doc.comment}</small> : null}
        </div>
        <div className="doc-row-meta">
          <span className="doc-row-total">{formatPositions(doc.lines.length)} · {sign}{formatNumber(grams)} г</span>
          {doc.kind === 'receipt' ? (
            priced.length === 0 ? (
              <small className="doc-row-flag">себестоимость не заполнена</small>
            ) : (
              <small>{priced.length < doc.lines.length ? 'частично ' : ''}{formatCurrency(value)}</small>
            )
          ) : null}
          <button
            type="button"
            className="icon-button"
            aria-label="Удалить документ"
            onClick={(event) => {
              event.stopPropagation()
              deleteDocument(doc.id)
            }}
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  // Страница документа: открывается вместо реестра (проваливаемся внутрь).
  // Здесь и создание нового, и просмотр/правка уже проведённого.
  const renderDocPage = (kind: DocKind) => {
    const title = kind === 'receipt' ? 'Оприходование' : 'Списание'
    const grams = saLines.reduce((total, line) => total + (Number(line.grams) || 0), 0)
    const value = saLines.reduce((total, line) => total + (Number(line.grams) || 0) * (Number(line.cost) || 0), 0)
    const backLabel = saSessionId != null ? '← К инвентаризации' : `← К списку «${title}»`
    return (
      <div className="admin-card doc-page">
        <div className="card-header">
          <div className="header-inline-actions"><button type="button" className="ghost-button" onClick={cancelDoc}>{backLabel}</button></div>
          <div className="header-inline-actions">
            {saDocId != null ? <button type="button" className="ghost-button" onClick={() => deleteDocument(saDocId)}>Удалить документ</button> : null}
            <button type="button" className="primary-button" disabled={saBusy} onClick={submitStandaloneDoc}>{saBusy ? '...' : saDocId != null ? 'Сохранить' : 'Создать документ'}</button>
          </div>
        </div>

        <div className="doc-page-head">
          <h3>{saDocId != null ? `${title} #${saDocId}` : kind === 'receipt' ? 'Новое оприходование' : 'Новое списание'}</h3>
          <div className="doc-page-meta">
            {saCreatedAt ? <small>{formatDateTime(saCreatedAt)}</small> : null}
            {saSessionId != null ? <span className="pill-inline">из инвентаризации #{saSessionId}</span> : null}
            <span className="doc-row-total">{formatPositions(saLines.length)} · {kind === 'receipt' ? '+' : '−'}{formatNumber(grams)} г{kind === 'receipt' && value > 0 ? ` · ${formatCurrency(value)}` : ''}</span>
          </div>
        </div>

        <div className="doc-page-body">
          <div className="header-search-slot"><input className="compact-input" placeholder="Комментарий к документу (необязательно)" value={saComment} onChange={(event) => setSaComment(event.target.value)} /></div>
          <div className="header-search-slot inventory-search"><input className="compact-input" placeholder="Найдите позицию по бренду или аромату и добавьте" value={saQuery} onChange={(event) => setSaQuery(event.target.value)} /></div>
          {saSearchResults.length > 0 ? <div className="company-search-results">{saSearchResults.map((item) => <button key={item.id} type="button" className="company-result" onClick={() => addStandaloneLine(item)}><strong>{item.brand} — {item.flavor_name}</strong><span className="company-result-separator">•</span><span>{item.strength}</span></button>)}</div> : null}
          {saLines.length > 0 ? (
            <div className="doc-lines">
              <div className={kind === 'receipt' ? 'doc-line doc-line-removable doc-line-receipt doc-head' : 'doc-line doc-line-removable doc-head'}><span>Позиция</span><span>Граммы</span>{kind === 'receipt' ? <span>₽/г</span> : null}<span></span></div>
              {saLines.map((line, index) => (
                <div key={line.tobaccoId} className={kind === 'receipt' ? 'doc-line doc-line-removable doc-line-receipt' : 'doc-line doc-line-removable'}>
                  <span className="inventory-name"><strong>{line.label}</strong></span>
                  <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={line.grams} onChange={(event) => updateStandaloneLine(index, 'grams', event.target.value)} />
                  {kind === 'receipt' ? <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="₽/г" value={line.cost} onChange={(event) => updateStandaloneLine(index, 'cost', event.target.value)} /> : null}
                  <button type="button" className="icon-button" aria-label="Убрать позицию" onClick={() => removeStandaloneLine(index)}>×</button>
                </div>
              ))}
            </div>
          ) : <p className="summary-hint">Добавьте позиции через поиск выше.</p>}
        </div>
      </div>
    )
  }

  // Вкладка «Оприходование»/«Списание»: реестр документов этого типа (в т.ч.
  // рождённых из инвентаризации). Клик по строке проваливает на страницу документа.
  const renderDocTab = (kind: DocKind) => {
    if (saKind === kind) {
      return renderDocPage(kind)
    }
    const title = kind === 'receipt' ? 'Оприходование' : 'Списание'
    const list = stockDocuments.filter((doc) => doc.kind === kind)
    return (
      <div className="admin-card list-card">
        <div className="card-header"><div className="header-inline-actions"><h3>{title}</h3><button type="button" className="inline-create-button" onClick={() => openStandaloneDoc(kind)}>+ Создать</button></div></div>
        <p className="summary-hint">{kind === 'receipt' ? 'Приём товара на склад — без инвентаризации или из неё.' : 'Списание со склада — без инвентаризации или из неё.'} Себестоимость {kind === 'receipt' ? 'указывается внутри документа, при оприходовании.' : 'берётся из последнего оприходования.'} Откройте документ, чтобы увидеть состав.</p>
        {list.length > 0 ? <div className="doc-history">{list.map(renderDocRow)}</div> : <p className="summary-hint">Документов пока нет.</p>}
      </div>
    )
  }

  const addStandaloneLine = (item: TobaccoItem) => {
    setSaLines((current) =>
      current.some((line) => line.tobaccoId === item.id)
        ? current
        : [...current, { tobaccoId: item.id, label: `${item.brand} — ${item.flavor_name}`, grams: '', cost: '' }],
    )
    setSaQuery('')
  }

  const updateStandaloneLine = (index: number, field: 'grams' | 'cost', value: string) => {
    setSaLines((current) => current.map((line, idx) => (idx === index ? { ...line, [field]: value } : line)))
  }

  const removeStandaloneLine = (index: number) => {
    setSaLines((current) => current.filter((_, idx) => idx !== index))
  }

  const submitStandaloneDoc = async () => {
    if (!saKind) {
      return
    }
    const lines = saLines
      .filter((line) => Number(line.grams) > 0)
      .map((line) => ({
        tobacco_id: line.tobaccoId,
        grams: Number(line.grams),
        cost_per_gram: saKind === 'receipt' && line.cost.trim() !== '' ? Number(line.cost) : null,
      }))
    if (lines.length === 0) {
      setNotice('Добавьте позиции и укажите положительное количество')
      setNoticeTone('error')
      return
    }
    const comment = saComment.trim() === '' ? null : saComment.trim()
    const kind = saKind
    const sessionId = saSessionId
    const docId = saDocId
    setSaBusy(true)
    try {
      if (docId != null) {
        // Правка существующего документа: строки переписываются целиком.
        await authorizedFetch(`/api/v1/admin/stock/documents/${docId}`, {
          method: 'PUT',
          body: JSON.stringify({ comment, lines }),
        })
        await Promise.all([loadStockDocuments(), loadStock(), loadInventories()])
        if (activeInventory) {
          await refreshInventory()
        }
        closeStandaloneDoc()
        setNotice('Документ обновлён, остатки пересчитаны')
        setNoticeTone('neutral')
        return
      }
      if (sessionId != null) {
        // Документ из инвентаризации — привязываем и возвращаемся к сессии.
        const response = await authorizedFetch(`/api/v1/admin/inventories/${sessionId}/documents`, {
          method: 'POST',
          body: JSON.stringify({ kind, comment, lines }),
        })
        const detail = (await response.json()) as InventorySessionDetail
        setActiveInventory(detail)
        seedLineDrafts(detail)
        await Promise.all([loadStockDocuments(), loadStock(), loadInventories()])
        closeStandaloneDoc()
        setAdminTab('inventory')
      } else {
        await authorizedFetch('/api/v1/admin/stock/documents', {
          method: 'POST',
          body: JSON.stringify({ kind, comment, lines }),
        })
        await Promise.all([loadStockDocuments(), loadStock()])
        closeStandaloneDoc()
      }
      setNotice(kind === 'receipt' ? 'Оприходование создано' : 'Списание создано')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось создать документ')
      setNoticeTone('error')
    } finally {
      setSaBusy(false)
    }
  }

  const removeInventory = async (sessionId: number) => {
    try {
      await authorizedFetch(`/api/v1/admin/inventories/${sessionId}`, { method: 'DELETE' })
      if (activeInventory?.id === sessionId) {
        setActiveInventory(null)
      }
      await loadInventories()
      setNotice('Инвентаризация удалена')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить инвентаризацию')
      setNoticeTone('error')
    }
  }

  // Перечитать открытую сессию, сохранив введённые (несохранённые) правки строк.
  const refreshInventory = async () => {
    if (!activeInventory) {
      return
    }
    const response = await authorizedFetch(`/api/v1/admin/inventories/${activeInventory.id}`)
    const detail = (await response.json()) as InventorySessionDetail
    setActiveInventory(detail)
    seedLineDrafts(detail)
  }

  const deleteDocument = async (documentId: number) => {
    try {
      await authorizedFetch(`/api/v1/admin/stock/documents/${documentId}`, { method: 'DELETE' })
      // Удалили тот, что открыт на странице документа — возвращаемся к реестру.
      if (saDocId === documentId) {
        closeStandaloneDoc()
      }
      await Promise.all([loadStockDocuments(), loadStock(), loadInventories()])
      if (activeInventory) {
        await refreshInventory()
      }
      setNotice('Документ удалён, остаток восстановлен')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить документ')
      setNoticeTone('error')
    }
  }

  const startEditingCompany = (company: Company) => {
    setEditingCompanyId(company.id)
    setCompanyForm({
      name: company.name,
      address: company.address ?? '',
      contactName: company.contact_name ?? '',
      phone: company.phone ?? '',
      comment: company.comment ?? '',
    })
    setEditorOverlay('company')
  }

  const openCreateCompany = () => {
    resetCompanyForm()
    setEditorOverlay('company')
  }

  const startEditingGuest = (guest: Guest) => {
    setEditingGuestId(guest.id)
    setGuestForm({
      companyId: guest.company_id.toString(),
      fullName: guest.full_name,
      phone: guest.phone ?? '',
      birthDate: guest.birth_date ?? '',
    })
    setEditorOverlay('guest')
  }

  const openCreateGuest = () => {
    resetGuestForm()
    setEditorOverlay('guest')
  }

  const openCreateTobacco = () => {
    resetTobaccoForm()
    setEditingTobaccoId(null)
    setEditorOverlay('tobacco')
  }

  const startEditingTobacco = (item: TobaccoItem) => {
    setTobaccoForm({
      strength: item.strength,
      brand: item.brand,
      flavorName: item.flavor_name,
      description: item.description ?? '',
    })
    setEditingTobaccoId(item.id)
    setEditorOverlay('tobacco')
  }

  const handleGuestPreferenceChange = (index: number, field: keyof GuestPreferenceInput, value: string) => {
    setPreferenceForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    }))
  }

  const addGuestPreferenceRow = () => {
    setPreferenceForm((current) => ({ ...current, items: [...current.items, { tobaccoId: '', percent: '' }] }))
  }

  const removeGuestPreferenceRow = (index: number) => {
    setPreferenceForm((current) => {
      if (current.items.length <= 1) {
        return current
      }

      return { ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }
    })
  }

  const handleCreateGuest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGuestBusy(true)

    try {
      await authorizedFetch(editingGuestId ? `/api/v1/admin/guests/${editingGuestId}` : '/api/v1/admin/guests', {
        method: editingGuestId ? 'PATCH' : 'POST',
        body: JSON.stringify({
          company_id: Number(guestForm.companyId),
          full_name: guestForm.fullName,
          phone: guestForm.phone || null,
          birth_date: guestForm.birthDate || null,
        }),
      })
      resetGuestForm()
      setEditorOverlay(null)
      await loadGuests()
      setNotice(editingGuestId ? 'Данные гостя обновлены' : 'Гость сохранен')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить гостя')
      setNoticeTone('error')
    } finally {
      setGuestBusy(false)
    }
  }

  const handleDeleteGuest = async (guestId: number) => {
    if (!window.confirm('Удалить гостя вместе со всеми его предпочтениями?')) {
      return
    }

    try {
      await authorizedFetch(`/api/v1/admin/guests/${guestId}`, { method: 'DELETE' })
      if (editingGuestId === guestId) {
        resetGuestForm()
      }
      if (preferenceForm.guestId === guestId.toString()) {
        resetPreferenceForm()
        setPreferenceOverlayOpen(false)
      }
      await loadGuests()
      setNotice('Гость удален')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить гостя')
      setNoticeTone('error')
    }
  }

  const startEditingPreference = (guestId: number, preference: GuestPreference) => {
    setPreferenceForm({
      guestId: guestId.toString(),
      preferenceId: preference.id.toString(),
      preferredBowl: preference.preferred_bowl ?? '',
      preferenceComment: preference.preference_comment ?? '',
      isActual: preference.is_actual,
      items: preference.items.map((item) => ({ tobaccoId: item.tobacco.id.toString(), percent: item.percent.toString() })),
    })
    setPreferenceOverlayOpen(true)
  }

  const handleSavePreference = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPreferenceBusy(true)

    try {
      if (!preferenceForm.guestId) {
        throw new Error('Сначала выберите или создайте гостя')
      }

      await authorizedFetch(
        preferenceForm.preferenceId
          ? `/api/v1/admin/preferences/${preferenceForm.preferenceId}`
          : `/api/v1/admin/guests/${preferenceForm.guestId}/preferences`,
        {
          method: preferenceForm.preferenceId ? 'PATCH' : 'POST',
          body: JSON.stringify({
            preferred_bowl: preferenceForm.preferredBowl || null,
            preference_comment: preferenceForm.preferenceComment || null,
            is_actual: preferenceForm.isActual,
            items: preferenceForm.items.map((item) => ({
              tobacco_id: Number(item.tobaccoId),
              percent: Number(item.percent),
            })),
          }),
        },
      )

      await loadGuests()
      resetPreferenceForm(preferenceForm.guestId)
      setPreferenceOverlayOpen(false)
      setNotice('Предпочтение сохранено')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить предпочтение')
      setNoticeTone('error')
    } finally {
      setPreferenceBusy(false)
    }
  }

  const handleDeletePreference = async (preferenceId: number) => {
    if (!window.confirm('Удалить это предпочтение?')) {
      return
    }

    try {
      await authorizedFetch(`/api/v1/admin/preferences/${preferenceId}`, { method: 'DELETE' })
      await loadGuests()
      resetPreferenceForm(preferenceForm.guestId)
      setPreferenceOverlayOpen(false)
      setNotice('Предпочтение удалено')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить предпочтение')
      setNoticeTone('error')
    }
  }

  const applyCompanyToOrder = (company: Company) => {
    setOrderCustomerForm({
      companyId: company.id.toString(),
      companyName: company.name,
      companyAddress: company.address ?? '',
      contactName: company.contact_name ?? '',
      phone: company.phone ?? '',
      customerComment: company.comment ?? '',
    })
    setOrderCompanyQuery(company.name)
  }

  const openCreateOrder = () => {
    setOrderCustomerForm(initialOrderCustomerForm)
    setOrderCompanyQuery('')
    setCreateOrderOpen(true)
  }

  const handleCreateOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateOrderBusy(true)

    try {
      await authorizedFetch('/api/v1/admin/orders', {
        method: 'POST',
        body: JSON.stringify({
          company_id: orderCustomerForm.companyId ? Number(orderCustomerForm.companyId) : null,
          company_name: orderCustomerForm.companyName,
          company_address: orderCustomerForm.companyAddress,
          contact_name: orderCustomerForm.contactName,
          phone: orderCustomerForm.phone,
          customer_comment: orderCustomerForm.customerComment || null,
          location: calculator.location,
          hookahs_count: calculator.hookahsCount,
          hours: totalHours,
          work_ranges: workRanges.map((workRange) => ({ starts_at: workRange.start.toISOString(), ends_at: workRange.end.toISOString() })),
        }),
      })
      await loadOrders()
      setCreateOrderOpen(false)
      setNotice('Заказ создан и доступен в админке для учёта фактических расходов')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось создать заказ')
      setNoticeTone('error')
    } finally {
      setCreateOrderBusy(false)
    }
  }

  const handleOrderDraftChange = (orderId: number, field: keyof OrderExpenseDraft, value: string) => {
    setOrderDrafts((current) => ({ ...current, [orderId]: { ...current[orderId], [field]: value } }))
  }

  const handleSaveOrderExpenses = async (orderId: number) => {
    const draft = orderDrafts[orderId]
    if (!draft) {
      return
    }

    try {
      await authorizedFetch(`/api/v1/admin/orders/${orderId}/expenses`, {
        method: 'PATCH',
        body: JSON.stringify({
          fuel_expense: draft.fuel_expense ? Number(draft.fuel_expense) : 0,
          consumables_expense: draft.consumables_expense ? Number(draft.consumables_expense) : 0,
          coal_expense: draft.coal_expense ? Number(draft.coal_expense) : 0,
          tobacco_expense: draft.tobacco_expense ? Number(draft.tobacco_expense) : 0,
          labor_expense: draft.labor_expense ? Number(draft.labor_expense) : 0,
          extra_expense: draft.extra_expense ? Number(draft.extra_expense) : 0,
          extra_expense_comment: draft.extra_expense_comment || null,
          status: draft.status,
        }),
      })
      await loadOrders()
      setNotice(`Фактические расходы по заказу #${orderId} сохранены`)
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить расходы')
      setNoticeTone('error')
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Удалить заказ?')) {
      return
    }

    try {
      await authorizedFetch(`/api/v1/admin/orders/${orderId}`, { method: 'DELETE' })
      if (activeOrderId === orderId) {
        setActiveOrderId(null)
      }
      await loadOrders()
      setNotice('Заказ удален')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось удалить заказ')
      setNoticeTone('error')
    }
  }

  const openOrderOverlay = (orderId: number) => {
    setActiveOrderId(orderId)
  }

  return (
    <main className="page-shell">
      <section className="page-topbar no-print" data-html2canvas-ignore="true">
        <div className="page-topbar-spacer" />
        <button
          type="button"
          className="topbar-link"
          onClick={() => {
            if (adminUser) {
              setAdminPanelOpen(true)
              return
            }

            setAuthOpen(true)
          }}
        >
          {adminUser ? 'Админка' : 'Вход'}
        </button>
      </section>

      {notice ? <div className={`notice notice-${noticeTone} no-print`} data-html2canvas-ignore="true">{notice}</div> : null}

      <section className="calculator-shell">
        <div className="calculator-card calculator-card-wide">
          <div className="inline-form">
            <div className="schedule-field">
              <div className="inline-form-head">
                <span className="field-label field-label-wide">Время работы</span>
                <span className="field-label">Количество кальянов</span>
              </div>
              <div className="schedule-list">
                {workRanges.map((workRange, index) => (
                  <div key={workRange.id} className={index === 0 ? 'schedule-row schedule-row-primary' : 'schedule-row schedule-row-removable'}>
                    <label className="schedule-picker">
                      <span>Начало</span>
                      <DatePicker selected={workRange.start} onChange={handleWorkRangeChange(workRange.id, 'start')} selectsStart startDate={workRange.start} endDate={workRange.end} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" className="schedule-picker-input" calendarClassName="schedule-picker-calendar" popperClassName="schedule-picker-popper" />
                    </label>
                    <label className="schedule-picker">
                      <span>Окончание</span>
                      <DatePicker selected={workRange.end} onChange={handleWorkRangeChange(workRange.id, 'end')} selectsEnd startDate={workRange.start} endDate={workRange.end} minDate={workRange.start} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" className="schedule-picker-input" calendarClassName="schedule-picker-calendar" popperClassName="schedule-picker-popper" />
                    </label>
                    {index === 0 ? (
                      <label className="hookahs-field hookahs-field-inline">
                        <span>Кальяны</span>
                        <input aria-label="Количество кальянов" type="number" min="1" max="30" value={calculator.hookahsCount} onChange={handleNumberChange('hookahsCount')} />
                      </label>
                    ) : (
                      <button type="button" className="range-remove-button" onClick={() => handleRemoveWorkRange(workRange.id)} aria-label="Удалить дополнительную дату">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="schedule-actions">
                <button type="button" className="range-add-button" onClick={handleAddWorkRange}>
                  + Ещё дата
                </button>
                <span className="schedule-total">Итого: {formatNumber(totalHours)} ч.</span>
              </div>
            </div>
          </div>

          <div className="breakdown-list">
            <div className="breakdown-row"><div className="breakdown-main"><span>ГСМ</span><small className="breakdown-formula-placeholder" aria-hidden="true"></small><strong>{formatCurrency(breakdown.fuelCost)}</strong></div><div className="breakdown-note"><small>Затраты на бензин</small></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>Расходные материалы</span><small className="breakdown-formula-placeholder" aria-hidden="true"></small><strong>{formatCurrency(breakdown.consumablesCost)}</strong></div><div className="breakdown-note"><small>полотенца, фольга, зубочистки, скотч, тряпки и прочее</small></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>Уголь</span><small>{`${formatNumber(pricing.coalPrice)} ₽/шт. × ${formatNumber(pricing.coalsPerHookahSession)} шт. × ${formatNumber(pricing.hookahHourFactor)} шт/ч. × ${formatNumber(totalHours)} ч. × ${calculator.hookahsCount} шт.`}</small><strong>{formatCurrency(breakdown.coalCost)}</strong></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>Табак</span><small>{`${formatNumber(pricing.tobaccoPricePerGram)} ₽/гр. × ${formatNumber(pricing.tobaccoGramsPerHookah)} гр. × ${formatNumber(pricing.hookahHourFactor)} шт/ч. × ${formatNumber(totalHours)} ч. × ${calculator.hookahsCount} шт.`}</small><strong>{formatCurrency(breakdown.tobaccoCost)}</strong></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>ЗП мастера</span><small>{`${formatCurrency(pricing.masterHourRate)}/ч. × ${formatNumber(totalHours)} ч.`}</small><strong>{formatCurrency(breakdown.masterCost)}</strong></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>ЗП доп. мастера</span><small>{breakdown.extraMasterCost > 0 ? `${formatCurrency(pricing.masterHourRate)}/ч. × ${formatNumber(totalHours)} ч.` : '0 ₽, доп. мастер не требуется'}</small><strong>{formatCurrency(breakdown.extraMasterCost)}</strong></div></div>
            <div className="breakdown-row"><div className="breakdown-main"><span>Сервисный сбор</span><small>{calculator.hookahsCount > pricing.additionalMasterThreshold ? `от ${pricing.additionalMasterThreshold + 1} кальянов` : `до ${pricing.additionalMasterThreshold} кальянов`}</small><strong>{formatCurrency(breakdown.serviceFee)}</strong></div></div>
          </div>

          <div className="summary-block">
            <div className="summary-strip">
              <div className="summary-copy"><span>Предварительная стоимость</span></div>
              <div className="summary-total"><strong>{formatCurrency(breakdown.total)}</strong><div className="summary-rounded"><small>Округление</small><strong>{`ИТОГО: ${formatCurrency(roundedTotal)}`}</strong></div></div>
            </div>
            <div className="summary-meta">{variableItems.map((item) => <span key={item}>{item}</span>)}</div>
            <button type="button" className="pdf-button no-print" data-html2canvas-ignore="true" onClick={handleDownloadPdf}>Скачать PDF</button>
          </div>
        </div>
      </section>

      {adminUser && adminPanelOpen ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true">
          <div className="modal-card modal-card-admin">
            <div className="card-header card-header-admin">
              <div>
                <h3>Админка</h3>
                <p className="summary-hint">{adminUser.full_name} · {adminUser.login}</p>
              </div>
              <div className="admin-toolbar">
                <button type="button" className="primary-button" onClick={openCreateOrder}>Создать заказ из расчёта</button>
                <button type="button" className="ghost-button" onClick={handleLogout}>Выйти</button>
                <button type="button" className="ghost-button" onClick={() => setAdminPanelOpen(false)}>Закрыть</button>
              </div>
            </div>

            {(() => {
              const warehouseActive = adminTab === 'inventory' || adminTab === 'receipts' || adminTab === 'writeoffs' || adminTab === 'stock'
              return (
                <>
                  <div className="admin-tabs">
                    {([['companies', 'Компании'], ['guests', 'Гости'], ['tobacco', 'Каталог табака']] as const).map(([value, label]) => (
                      <button key={value} type="button" className={adminTab === value ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => goTab(value)}>{label}</button>
                    ))}
                    <button type="button" className={warehouseActive ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => goTab(lastWarehouse)}>Склад</button>
                    {([['orders', 'Заказы'], ['pricing', 'Параметры']] as const).map(([value, label]) => (
                      <button key={value} type="button" className={adminTab === value ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => goTab(value)}>{label}</button>
                    ))}
                  </div>
                  {warehouseActive ? (
                    <div className="admin-subtabs">
                      {([['inventory', 'Инвентаризация'], ['receipts', 'Оприходование'], ['writeoffs', 'Списание'], ['stock', 'Остатки']] as const).map(([value, label]) => (
                        <button key={value} type="button" className={adminTab === value ? 'subtab-button subtab-button-active' : 'subtab-button'} onClick={() => goTab(value)}>{label}</button>
                      ))}
                    </div>
                  ) : null}
                </>
              )
            })()}

            <div className="admin-shell">
              {adminTab === 'companies' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div className="header-inline-actions"><h3>База компаний</h3><button type="button" className="inline-create-button" onClick={openCreateCompany}>+ Новый заказчик</button></div><div className="header-search-slot"><input className="compact-input compact-input-narrow" placeholder="Поиск заказчика" value={companyQuery} onChange={async (event) => { const value = event.target.value; setCompanyQuery(value); if (adminUser) { try { await loadCompanies(value) } catch {} } }} /></div></div>
                  <div className="stack-list">{companies.map((company) => <article key={company.id} className="list-item company-card"><div className="card-header"><div><strong>{company.name}</strong><p>{company.address || 'Адрес не указан'}</p></div><button type="button" className="icon-button" aria-label="Редактировать компанию" onClick={() => startEditingCompany(company)}>✎</button></div><div><p>{company.contact_name || 'Контакт не указан'}</p><p>{company.phone || 'Телефон не указан'}</p></div><div className="list-actions"><p>{company.comment || 'Без комментария'}</p></div></article>)}</div>
                </div>
              ) : null}

              {adminTab === 'guests' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div className="header-inline-actions"><h3>Гости заказчиков</h3><button type="button" className="inline-create-button" onClick={openCreateGuest}>+ Новый гость</button></div><div className="header-search-slot"><input className="compact-input compact-input-narrow" placeholder="Поиск по гостям" value={guestQuery} onChange={(event) => setGuestQuery(event.target.value)} /></div></div>
                  <div className="stack-list">{filteredGuests.map((guest) => <article key={guest.id} className="list-item guest-card"><div className="card-header"><div><div className="header-inline-actions"><strong>{guest.full_name}</strong><button type="button" className="inline-create-button" onClick={() => openPreferenceOverlay(guest.id.toString())}>+ Новое предпочтение</button></div><p>{guest.company_name}</p></div><div className="guest-card-actions"><button type="button" className="icon-button" aria-label="Редактировать гостя" onClick={() => startEditingGuest(guest)}>✎</button></div></div><div className="guest-card-meta"><p>{guest.phone || 'Телефон не указан'}</p><p>{guest.birth_date ? formatBirthDate(guest.birth_date) : 'Дата рождения не указана'}</p><p>Создан: {formatDateTime(guest.created_at)}</p></div><div className="guest-preferences-compact">{guest.preferences.length > 0 ? guest.preferences.map((preference) => <button key={preference.id} type="button" className={preference.is_actual ? 'preference-chip preference-chip-active' : 'preference-chip'} onClick={() => startEditingPreference(guest.id, preference)}>{preference.preferred_bowl === 'turka' ? 'Турка' : preference.preferred_bowl === 'phunnel' ? 'Фанел' : 'Без чашки'} · {preference.items.map((item) => `${item.tobacco.flavor_name} ${item.percent}%`).join(', ')}</button>) : <p>Предпочтения еще не добавлены</p>}</div></article>)}</div>
                </div>
              ) : null}

              {adminTab === 'tobacco' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div className="header-inline-actions"><h3>Каталог табака</h3><button type="button" className="inline-create-button" onClick={openCreateTobacco}>+ Новая позиция каталога</button></div><div className="header-search-slot"><input className="compact-input compact-input-narrow" placeholder="Поиск по бренду или аромату" value={tobaccoQuery} onChange={(event) => setTobaccoQuery(event.target.value)} /></div></div>
                  <div className="catalog-layout">
                    <nav className="catalog-brands" aria-label="Бренды">
                      <button type="button" className={catalogBrand === '' ? 'catalog-brand catalog-brand-active' : 'catalog-brand'} onClick={() => setCatalogBrand('')}>
                        <span>Все бренды</span><small>{filteredTobacco.length}</small>
                      </button>
                      {catalogBrands.map((brand) => (
                        <button key={brand} type="button" className={catalogBrand === brand ? 'catalog-brand catalog-brand-active' : 'catalog-brand'} onClick={() => setCatalogBrand(brand)}>
                          <span>{brand}</span><small>{catalogBrandCounts.get(brand)}</small>
                        </button>
                      ))}
                    </nav>

                    <div className="catalog-items">
                      {catalogItems.length > 0 ? (
                        <div className="stack-list">{catalogItems.map((item) => (
                          <article
                            key={item.id}
                            className="list-item tobacco-card clickable-row"
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.brand} — ${item.flavor_name}: редактировать`}
                            onClick={() => startEditingTobacco(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                startEditingTobacco(item)
                              }
                            }}
                          >
                            <div className="tobacco-head"><strong>{catalogBrand ? item.flavor_name : `${item.brand} — ${item.flavor_name}`}</strong><span className="pill-inline">{item.strength}</span></div>
                            {item.description ? <p className="tobacco-description">{item.description}</p> : null}
                          </article>
                        ))}</div>
                      ) : <p className="summary-hint">Ничего не найдено.</p>}
                    </div>
                  </div>
                </div>
              ) : null}

              {adminTab === 'inventory' ? (
                <div className="admin-card list-card">
                  {activeInventory ? (
                    <>
                      <div className="card-header"><div className="header-inline-actions"><button type="button" className="ghost-button" onClick={() => setActiveInventory(null)}>← К списку</button><h3>Инвентаризация #{activeInventory.id}</h3></div><div className="header-inline-actions">{activeInventory.lines.length > 0 ? <><button type="button" className="primary-button" disabled={inventoryBusy} onClick={saveInventory}>{inventoryBusy ? '...' : 'Сохранить'}</button><button type="button" className="ghost-button" disabled={inventoryBusy} onClick={() => startDocFromInventory('writeoff')}>Создать списание →</button><button type="button" className="ghost-button" disabled={inventoryBusy} onClick={() => startDocFromInventory('receipt')}>Создать оприходование →</button></> : null}</div></div>
                      <p className="summary-hint">Впишите фактический вес — нетто либо тару и вес с тарой. Разница = факт − учётный остаток. «Создать списание/оприходование» сохранит пересчёт и откроет документ с уже подставленной разницей.</p>
                      <div className="header-search-slot inventory-search"><input className="compact-input" placeholder="Найдите позицию по бренду или аромату и добавьте в инвентаризацию" value={sessionQuery} onChange={(event) => setSessionQuery(event.target.value)} /></div>
                      {sessionSearchResults.length > 0 ? <div className="company-search-results">{sessionSearchResults.map((item) => <button key={item.id} type="button" className="company-result" onClick={() => addInventoryPosition(item.id)}><strong>{item.brand} — {item.flavor_name}</strong><span className="company-result-separator">•</span><span>{item.strength}</span></button>)}</div> : null}
                      {activeInventory.lines.length > 0 ? (
                        <div className="inventory-tare-all">
                          <label><span>Вес тары для всех строк</span><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={tareAll} onChange={(event) => setTareAll(event.target.value)} /></label>
                          <button type="button" className="ghost-button" onClick={applyTareToAll}>Применить ко всем</button>
                        </div>
                      ) : null}
                      {activeInventory.lines.length > 0 ? (
                        <div className="inventory-table">
                          <div className="inventory-row inventory-head"><span>Позиция</span><span>Учётный остаток</span><span>Способ · замер</span><span>Факт</span><span>Разница</span><span></span></div>
                          {activeInventory.lines.map((line) => {
                            const draft = lineDrafts[line.id] ?? DEFAULT_DRAFT
                            const counted = draftCounted(draft)
                            const diff = counted != null ? counted - line.expected_grams : null
                            return (
                              <div key={line.id} className="inventory-row">
                                <span className="inventory-name"><strong>{line.brand} — {line.flavor_name}</strong><small>{line.strength}</small></span>
                                <span className="inventory-expected">{formatNumber(line.expected_grams)} г</span>
                                <div className="inventory-measure">
                                  <div className="measure-mode">
                                    <button type="button" className={draft.mode === 'net' ? 'mode-btn mode-btn-active' : 'mode-btn'} onClick={() => setLineMode(line.id, 'net')}>Без тары</button>
                                    <button type="button" className={draft.mode === 'gross' ? 'mode-btn mode-btn-active' : 'mode-btn'} onClick={() => setLineMode(line.id, 'gross')}>С тарой</button>
                                  </div>
                                  {draft.mode === 'net' ? (
                                    <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="вес нетто, г" value={draft.net} onChange={(event) => updateLineDraft(line.id, 'net', event.target.value)} />
                                  ) : (
                                    <div className="measure-pair"><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="вес тары, г" value={draft.tare} onChange={(event) => updateLineDraft(line.id, 'tare', event.target.value)} /><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="вес с тарой, г" value={draft.gross} onChange={(event) => updateLineDraft(line.id, 'gross', event.target.value)} /></div>
                                  )}
                                </div>
                                <span className={counted == null ? 'stock-empty' : 'inventory-expected'}>{counted == null ? '—' : `${formatNumber(counted)} г`}</span>
                                <span className={diff == null ? 'stock-empty' : diff < 0 ? 'inventory-diff-neg' : diff > 0 ? 'inventory-diff-pos' : ''}>{diff == null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)} г`}</span>
                                <div className="inventory-actions"><button type="button" className="icon-button" aria-label="Убрать позицию" onClick={() => removeInventoryLine(line.id)}>×</button></div>
                              </div>
                            )
                          })}
                        </div>
                      ) : <p className="summary-hint">Добавьте позиции через поиск выше.</p>}

                      {activeInventory.documents.length > 0 ? (
                        <div className="doc-history">
                          <h4>Созданные документы</h4>
                          {activeInventory.documents.map(renderDocRow)}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="card-header"><div className="header-inline-actions"><h3>Инвентаризации</h3><button type="button" className="inline-create-button" disabled={inventoryBusy} onClick={startInventory}>+ Создать</button></div></div>
                      <p className="summary-hint">Начните инвентаризацию, добавьте нужные позиции через поиск (по каждой подтянется текущий остаток по базе), введите факт, а из разницы создайте документ списания или оприходования — он корректирует остатки.</p>
                      {inventories.length > 0 ? (
                        <div className="doc-history">{inventories.map((session) => (
                          <article
                            key={session.id}
                            className="doc-history-item doc-history-row clickable-row"
                            role="button"
                            tabIndex={0}
                            aria-label={`Инвентаризация #${session.id} — открыть`}
                            onClick={() => openInventory(session.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                openInventory(session.id)
                              }
                            }}
                          >
                            <div className="doc-row-main">
                              <span className="pill-inline">Инвентаризация #{session.id}</span>
                              <small>{formatDateTime(session.created_at)}</small>
                            </div>
                            <div className="doc-row-meta">
                              <span className="doc-row-total">{formatPositions(session.lines_total)} · с фактом {session.lines_counted}</span>
                              {session.lines_counted > 0 ? <small className={session.diff_total < 0 ? 'inventory-diff-neg' : session.diff_total > 0 ? 'inventory-diff-pos' : ''}>{session.diff_total > 0 ? '+' : ''}{formatNumber(session.diff_total)} г</small> : null}
                              <button type="button" className="icon-button" aria-label="Удалить инвентаризацию" onClick={(event) => { event.stopPropagation(); removeInventory(session.id) }}>×</button>
                            </div>
                          </article>
                        ))}</div>
                      ) : <p className="summary-hint">Инвентаризаций ещё не было. Нажмите «+ Создать».</p>}
                    </>
                  )}
                </div>
              ) : null}

              {adminTab === 'stock' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div><h3>Остатки</h3><p className="summary-hint">Остаток = сумма движений по журналу. Позиций: {filteredStock.length}. Оценочная стоимость: {formatCurrency(stockValueTotal)}.</p></div><div className="stock-filters"><select value={stockBrand} onChange={(event) => setStockBrand(event.target.value)}><option value="">Все бренды</option>{tobaccoBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select><select value={stockStrength} onChange={(event) => setStockStrength(event.target.value)}><option value="">Все сегменты</option>{tobaccoStrengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}</select></div></div>
                  <div className="stock-table">
                    <div className="stock-row stock-head"><span>Позиция</span><span>Остаток</span><span>₽/г</span><span>Стоимость</span></div>
                    {filteredStock.map((item) => (
                      <div key={item.tobacco_id} className="stock-row">
                        <span className="inventory-name"><strong>{item.brand} — {item.flavor_name}</strong><small>{item.strength}</small></span>
                        <span className="stock-value">{formatNumber(item.balance_grams)} г</span>
                        <span className={item.cost_per_gram != null ? '' : 'stock-empty'}>{item.cost_per_gram != null ? formatNumber(item.cost_per_gram) : '—'}</span>
                        <span className={item.stock_value != null ? '' : 'stock-empty'}>{item.stock_value != null ? formatCurrency(item.stock_value) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {adminTab === 'receipts' ? renderDocTab('receipt') : null}
              {adminTab === 'writeoffs' ? renderDocTab('writeoff') : null}

              {adminTab === 'orders' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><h3>Заказы и фактическая прибыль</h3><span className="summary-hint">Заполняйте реальные расходы по разделам, система посчитает прибыль.</span></div>
                  <div className="orders-table">
                    <div className="orders-table-row orders-table-head">
                      <span>Заказ</span>
                      <span>Дата</span>
                      <span>Бюджет мероприятия</span>
                      <span>Реальные расходы</span>
                      <span>Прибыль</span>
                    </div>
                    {orders.map((order) => <button key={order.id} type="button" className="orders-table-row orders-table-body" onClick={() => openOrderOverlay(order.id)}><span><strong>{order.company_name}</strong><small>{order.location || 'Локация не указана'}</small></span><span>{formatDateTime(order.work_ranges[0]?.starts_at || `${order.event_date}T${order.event_time}`)}</span><span>{formatCurrency(order.quoted_total)}</span><span>{order.actual_total != null ? formatCurrency(order.actual_total) : 'Не заполнено'}</span><span className={order.actual_profit != null && order.actual_profit >= 0 ? 'metric-good' : 'metric-bad'}>{order.actual_profit != null ? formatCurrency(order.actual_profit) : 'Не рассчитана'}</span></button>)}
                  </div>
                </div>
              ) : null}

              {adminTab === 'pricing' ? (
                <div className="admin-card form-card">
                  <div className="card-header"><div><h3>Параметры</h3><p className="summary-hint">Эти значения используются в главной таблице расчета.</p></div></div>
                  <form className="form-card" onSubmit={handleSavePricing}>
                    <div className="form-grid">
                      <label><span>Ставка сотрудника, ₽/ч</span><input type="number" min="0" step="100" value={pricingForm.masterHourRate} onChange={handlePricingFieldChange('masterHourRate')} /></label>
                      <label><span>Средняя стоимость табака, ₽/гр</span><input type="number" min="0" step="0.1" value={pricingForm.tobaccoPricePerGram} onChange={handlePricingFieldChange('tobaccoPricePerGram')} /></label>
                      <label><span>Средняя стоимость угля, ₽/шт</span><input type="number" min="0" step="0.1" value={pricingForm.coalPrice} onChange={handlePricingFieldChange('coalPrice')} /></label>
                      <label><span>Среднее количество кальянов в час, шт/ч</span><input type="number" min="0" step="0.1" value={pricingForm.hookahHourFactor} onChange={handlePricingFieldChange('hookahHourFactor')} /></label>
                      <label><span>Углей на кальян за сессию, шт</span><input type="number" min="0" step="1" value={pricingForm.coalsPerHookahSession} onChange={handlePricingFieldChange('coalsPerHookahSession')} /></label>
                      <label><span>Средний расход табака на 1 кальян, гр</span><input type="number" min="0" step="0.1" value={pricingForm.tobaccoGramsPerHookah} onChange={handlePricingFieldChange('tobaccoGramsPerHookah')} /></label>
                    </div>
                    <div className="admin-toolbar"><button type="submit" className="primary-button" disabled={pricingBusy}>{pricingBusy ? 'Сохраняю...' : 'Сохранить параметры'}</button></div>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {authOpen ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card"><div className="card-header"><h3>{bootstrapStatus?.needs_admin ? 'Регистрация первого администратора' : 'Вход администратора'}</h3><button type="button" className="ghost-button" onClick={() => setAuthOpen(false)}>Закрыть</button></div>{bootstrapStatus?.needs_admin ? <form className="form-grid" onSubmit={handleBootstrapAdmin}><label><span>Имя администратора</span><input value={bootstrapForm.fullName} onChange={(event) => setBootstrapForm((current) => ({ ...current, fullName: event.target.value }))} /></label><label><span>Логин</span><input value={bootstrapForm.login} onChange={(event) => setBootstrapForm((current) => ({ ...current, login: event.target.value }))} /></label><label><span>Пароль</span><input type="password" value={bootstrapForm.password} onChange={(event) => setBootstrapForm((current) => ({ ...current, password: event.target.value }))} /></label><label><span>FIRST_ADMIN_PASS</span><input type="password" value={bootstrapForm.adminSecret} onChange={(event) => setBootstrapForm((current) => ({ ...current, adminSecret: event.target.value }))} /></label>{bootstrapStatus.secret_configured ? null : <div className="error-text">FIRST_ADMIN_PASS не настроен в окружении backend.</div>}{authError ? <div className="error-text">{authError}</div> : null}<button type="submit" className="primary-button" disabled={authBusy || bootstrapStatus.secret_configured === false}>{authBusy ? 'Создаю...' : 'Создать первого администратора'}</button></form> : <form className="form-grid" onSubmit={handleLogin}><label><span>Логин</span><input value={authForm.login} onChange={(event) => setAuthForm((current) => ({ ...current, login: event.target.value }))} /></label><label><span>Пароль</span><input type="password" value={authForm.password} onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} /></label>{authError ? <div className="error-text">{authError}</div> : null}<button type="submit" className="primary-button" disabled={authBusy}>{authBusy ? 'Вхожу...' : 'Войти'}</button></form>}</div></div>
      ) : null}

      {editorOverlay === 'company' ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card modal-card-wide"><div className="card-header"><h3>{editingCompanyId ? 'Редактирование компании' : 'Новый заказчик'}</h3><div className="admin-toolbar">{editingCompanyId ? <button type="button" className="ghost-button" onClick={resetCompanyForm}>Сбросить</button> : null}<button type="button" className="ghost-button" onClick={() => setEditorOverlay(null)}>Закрыть</button></div></div><form className="form-card" onSubmit={handleCreateCompany}><div className="form-grid"><label><span>Наименование компании</span><input required value={companyForm.name} onChange={(event) => setCompanyForm((current) => ({ ...current, name: event.target.value }))} /></label><label><span>Адрес</span><input value={companyForm.address} onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))} /></label><label><span>Контактное лицо</span><input value={companyForm.contactName} onChange={(event) => setCompanyForm((current) => ({ ...current, contactName: event.target.value }))} /></label><label><span>Номер телефона</span><input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} /></label><label className="field-span-2"><span>Комментарий</span><textarea rows={4} value={companyForm.comment} onChange={(event) => setCompanyForm((current) => ({ ...current, comment: event.target.value }))} /></label></div><div className="admin-toolbar"><button type="submit" className="primary-button" disabled={companyBusy}>{companyBusy ? 'Сохраняю...' : editingCompanyId ? 'Сохранить изменения' : 'Сохранить компанию'}</button>{editingCompanyId ? <button type="button" className="ghost-button" onClick={() => { void handleDeleteCompany(editingCompanyId) }}>Удалить компанию</button> : null}</div></form></div></div>
      ) : null}

      {editorOverlay === 'guest' ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card modal-card-wide"><div className="card-header"><h3>{editingGuestId ? 'Редактирование гостя' : 'Новый гость'}</h3><div className="admin-toolbar">{editingGuestId ? <button type="button" className="ghost-button" onClick={resetGuestForm}>Сбросить</button> : null}<button type="button" className="ghost-button" onClick={() => setEditorOverlay(null)}>Закрыть</button></div></div><form className="form-card" onSubmit={handleCreateGuest}><div className="form-grid"><label><span>Компания</span><select required value={guestForm.companyId} onChange={(event) => setGuestForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Выберите компанию</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label><span>Имя гостя</span><input required value={guestForm.fullName} onChange={(event) => setGuestForm((current) => ({ ...current, fullName: event.target.value }))} /></label><label><span>Телефон</span><input value={guestForm.phone} onChange={(event) => setGuestForm((current) => ({ ...current, phone: event.target.value }))} /></label><label><span>Дата рождения</span><input type="date" value={guestForm.birthDate} onChange={(event) => setGuestForm((current) => ({ ...current, birthDate: event.target.value }))} /></label></div><div className="admin-toolbar"><button type="submit" className="primary-button" disabled={guestBusy}>{guestBusy ? 'Сохраняю...' : editingGuestId ? 'Сохранить изменения' : 'Сохранить гостя'}</button>{editingGuestId ? <button type="button" className="ghost-button" onClick={() => { void handleDeleteGuest(editingGuestId) }}>Удалить гостя</button> : null}</div></form></div></div>
      ) : null}

      {editorOverlay === 'tobacco' ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card"><div className="card-header"><h3>{editingTobaccoId != null ? 'Позиция каталога' : 'Новая позиция каталога'}</h3><button type="button" className="ghost-button" onClick={() => { setEditorOverlay(null); setEditingTobaccoId(null) }}>Закрыть</button></div><form className="form-card" onSubmit={handleCreateTobacco}><div className="form-grid"><label><span>Крепость</span><input value={tobaccoForm.strength} onChange={(event) => setTobaccoForm((current) => ({ ...current, strength: event.target.value }))} /></label><label><span>Бренд</span><input value={tobaccoForm.brand} onChange={(event) => setTobaccoForm((current) => ({ ...current, brand: event.target.value }))} /></label><label className="field-span-2"><span>Аромат</span><input value={tobaccoForm.flavorName} onChange={(event) => setTobaccoForm((current) => ({ ...current, flavorName: event.target.value }))} /></label><label className="field-span-2"><span>Описание</span><textarea value={tobaccoForm.description} onChange={(event) => setTobaccoForm((current) => ({ ...current, description: event.target.value }))} /></label></div><button type="submit" className="primary-button" disabled={tobaccoBusy}>{tobaccoBusy ? 'Сохраняю...' : editingTobaccoId != null ? 'Сохранить' : 'Добавить в каталог'}</button></form></div></div>
      ) : null}

      {createOrderOpen ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card modal-card-wide"><div className="card-header"><div><h3>Создание заказа</h3><p className="summary-hint">Данные по времени и кальянам берутся из текущего расчёта.</p></div><button type="button" className="ghost-button" onClick={() => setCreateOrderOpen(false)}>Закрыть</button></div><form className="form-grid" onSubmit={handleCreateOrder}><label className="field-span-2"><span>Поиск заказчика</span><input placeholder="Компания, контактное лицо или телефон" value={orderCompanyQuery} onChange={(event) => setOrderCompanyQuery(event.target.value)} /></label>{orderCompanyResults.length > 0 ? <div className="field-span-2 company-search-results">{orderCompanyResults.map((company) => <button key={company.id} type="button" className="company-result" onClick={() => applyCompanyToOrder(company)}><strong>{company.name}</strong><span className="company-result-separator">•</span><span>{company.contact_name || 'Контакт не указан'}</span></button>)}</div> : null}<label><span>Компания</span><input value={orderCustomerForm.companyName} onChange={(event) => setOrderCustomerForm((current) => ({ ...current, companyName: event.target.value }))} /></label><label><span>Адрес</span><input value={orderCustomerForm.companyAddress} onChange={(event) => setOrderCustomerForm((current) => ({ ...current, companyAddress: event.target.value }))} /></label><label><span>Контактное лицо</span><input value={orderCustomerForm.contactName} onChange={(event) => setOrderCustomerForm((current) => ({ ...current, contactName: event.target.value }))} /></label><label><span>Номер телефона</span><input value={orderCustomerForm.phone} onChange={(event) => setOrderCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label><label className="field-span-2"><span>Локация мероприятия</span><input type="text" placeholder="Адрес площадки или площадка" value={calculator.location} onChange={handleLocationChange} /></label><label className="field-span-2"><span>Комментарий</span><textarea rows={4} value={orderCustomerForm.customerComment} onChange={(event) => setOrderCustomerForm((current) => ({ ...current, customerComment: event.target.value }))} /></label><div className="field-span-2 metrics-grid"><div className="metric-card"><span>Локация</span><strong>{calculator.location || 'Не указана'}</strong></div><div className="metric-card"><span>Часы работы</span><strong>{formatNumber(totalHours)} ч.</strong></div><div className="metric-card"><span>Кальяны</span><strong>{calculator.hookahsCount}</strong></div><div className="metric-card"><span>Итого к заказу</span><strong>{formatCurrency(roundedTotal)}</strong></div></div><button type="submit" className="primary-button" disabled={createOrderBusy}>{createOrderBusy ? 'Создаю...' : 'Создать заказ'}</button></form></div></div>
      ) : null}

      {preferenceOverlayOpen ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true">
          <div className="modal-card modal-card-wide">
            <div className="card-header">
              <div>
                <h3>{preferenceForm.preferenceId ? 'Редактирование предпочтения' : 'Новое предпочтение'}</h3>
                <p className="summary-hint">Предпочтение сохраняется внутри выбранного гостя.</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setPreferenceOverlayOpen(false)}>Закрыть</button>
            </div>
            <form className="admin-shell preference-form" onSubmit={handleSavePreference}>
              <div className="card-header"><span className={guestPreferenceTotal === 100 ? 'metric-good' : 'metric-bad'}>Сумма: {guestPreferenceTotal}%</span><button type="button" className="ghost-button" onClick={addGuestPreferenceRow}>Добавить позицию</button></div>
              <div className="form-grid">
                <label><span>Гость</span><select required value={preferenceForm.guestId} onChange={(event) => setPreferenceForm((current) => ({ ...current, guestId: event.target.value }))}><option value="">Выберите гостя</option>{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name} · {guest.company_name}</option>)}</select></label>
                <label><span>Чашка</span><select value={preferenceForm.preferredBowl} onChange={(event) => setPreferenceForm((current) => ({ ...current, preferredBowl: event.target.value }))}><option value="">Не выбрано</option><option value="turka">Турка</option><option value="phunnel">Фанел</option></select></label>
                <label><span>Актуально</span><select value={preferenceForm.isActual ? 'yes' : 'no'} onChange={(event) => setPreferenceForm((current) => ({ ...current, isActual: event.target.value === 'yes' }))}><option value="yes">Да</option><option value="no">Нет</option></select></label>
                <label className="field-span-2"><span>Комментарий</span><textarea rows={3} value={preferenceForm.preferenceComment} onChange={(event) => setPreferenceForm((current) => ({ ...current, preferenceComment: event.target.value }))} /></label>
              </div>
              <div className="preference-list">{preferenceForm.items.map((item, index) => <div key={`pref-${index}`} className="preference-row"><select value={item.tobaccoId} onChange={(event) => handleGuestPreferenceChange(index, 'tobaccoId', event.target.value)}><option value="">Выберите табак</option>{tobaccoCatalog.map((tobacco) => <option key={tobacco.id} value={tobacco.id}>{tobacco.brand} · {tobacco.flavor_name} · {tobacco.strength}</option>)}</select><input type="number" min="1" max="100" placeholder="%" value={item.percent} onChange={(event) => handleGuestPreferenceChange(index, 'percent', event.target.value)} /><button type="button" className="ghost-button" onClick={() => removeGuestPreferenceRow(index)}>Удалить</button></div>)}</div>
              <div className="admin-toolbar"><button type="submit" className="primary-button" disabled={preferenceBusy || guestPreferenceTotal !== 100}>{preferenceBusy ? 'Сохраняю...' : preferenceForm.preferenceId ? 'Сохранить предпочтение' : 'Добавить предпочтение'}</button><button type="button" className="ghost-button" onClick={() => resetPreferenceForm(preferenceForm.guestId)}>Очистить форму</button>{preferenceForm.preferenceId ? <button type="button" className="ghost-button" onClick={() => { void handleDeletePreference(Number(preferenceForm.preferenceId)) }}>Удалить предпочтение</button> : null}</div>
            </form>
          </div>
        </div>
      ) : null}

      {activeOrder ? (
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true">
          <div className="modal-card modal-card-wide">
            <div className="card-header">
              <div>
                <h3>{activeOrder.company_name}</h3>
                <p className="summary-hint">{formatDateTime(activeOrder.work_ranges[0]?.starts_at || `${activeOrder.event_date}T${activeOrder.event_time}`)} · {activeOrder.location || 'Локация не указана'}</p>
              </div>
              <button type="button" className="ghost-button" onClick={() => setActiveOrderId(null)}>Закрыть</button>
            </div>
            <div className="metrics-grid">
              <div className="metric-card"><span>Бюджет мероприятия</span><strong>{formatCurrency(activeOrder.quoted_total)}</strong></div>
              <div className="metric-card"><span>Реальные расходы</span><strong>{activeOrder.actual_total != null ? formatCurrency(activeOrder.actual_total) : 'Не заполнено'}</strong></div>
              <div className="metric-card"><span>Прибыль</span><strong>{activeOrder.actual_profit != null ? formatCurrency(activeOrder.actual_profit) : 'Не рассчитана'}</strong></div>
              <div className="metric-card"><span>Статус</span><strong>{orderDrafts[activeOrder.id]?.status === 'draft' ? 'Черновик' : orderDrafts[activeOrder.id]?.status === 'confirmed' ? 'Подтверждён' : orderDrafts[activeOrder.id]?.status === 'completed' ? 'Завершён' : 'Отменён'}</strong></div>
            </div>
            {orderDrafts[activeOrder.id] ? <div className="admin-shell"><div className="expense-grid">{([['fuel_expense', 'ГСМ'], ['consumables_expense', 'Расходные материалы'], ['coal_expense', 'Уголь'], ['tobacco_expense', 'Табак'], ['labor_expense', 'ЗП'], ['extra_expense', 'Доп. расходы']] as const).map(([field, label]) => <label key={field}><span>{activeOrderBreakdown ? `${label} · смета ${formatCurrency(Number(getOrderExpensePlaceholder(field, activeOrderBreakdown)))}` : label}</span><input type="number" min="0" placeholder={activeOrderBreakdown ? getOrderExpensePlaceholder(field, activeOrderBreakdown) : ''} value={orderDrafts[activeOrder.id][field]} onChange={(event) => handleOrderDraftChange(activeOrder.id, field, event.target.value)} /></label>)}<label className="field-span-2"><span>Комментарий к доп. расходам</span><textarea rows={3} placeholder="Например: доставка, парковка, срочная закупка" value={orderDrafts[activeOrder.id].extra_expense_comment} onChange={(event) => handleOrderDraftChange(activeOrder.id, 'extra_expense_comment', event.target.value)} /></label><label><span>Статус</span><select value={orderDrafts[activeOrder.id].status} onChange={(event) => handleOrderDraftChange(activeOrder.id, 'status', event.target.value as OrderExpenseDraft['status'])}><option value="draft">Черновик</option><option value="confirmed">Подтверждён</option><option value="completed">Завершён</option><option value="cancelled">Отменён</option></select></label></div><div className="admin-toolbar"><button type="button" className="primary-button" onClick={() => handleSaveOrderExpenses(activeOrder.id)}>Сохранить расходы</button><button type="button" className="ghost-button" onClick={() => { void handleDeleteOrder(activeOrder.id) }}>Удалить заказ</button></div></div> : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default AppShell