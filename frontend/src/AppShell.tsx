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
  tare_weight?: number | null
  gross_weight?: number | null
  net_weight?: number | null
  stock_updated_at?: string | null
}

type InventoryRow = {
  tobaccoId: number
  brand: string
  flavorName: string
  strength: string
  tare: string
  gross: string
  net: string
  netManual: boolean
  busy: boolean
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
  const [adminTab, setAdminTab] = useState<'companies' | 'guests' | 'tobacco' | 'inventory' | 'stock' | 'orders' | 'pricing'>('companies')
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
  const [inventoryQuery, setInventoryQuery] = useState('')
  const [inventoryRows, setInventoryRows] = useState<InventoryRow[]>([])
  const [stockBrand, setStockBrand] = useState('')
  const [stockStrength, setStockStrength] = useState('')
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
        await Promise.all([loadCompanies(companyQuery), loadTobacco(), loadGuests(), loadOrders()])
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

  const normalizedInventoryQuery = inventoryQuery.trim().toLowerCase()
  const inventoryRowIds = new Set(inventoryRows.map((row) => row.tobaccoId))
  const inventorySearchResults = normalizedInventoryQuery
    ? tobaccoCatalog.filter((item) => !inventoryRowIds.has(item.id) && matchesTobacco(item, normalizedInventoryQuery)).slice(0, 12)
    : []

  const tobaccoBrands = Array.from(new Set(tobaccoCatalog.map((item) => item.brand))).sort((a, b) => a.localeCompare(b, 'ru'))
  const tobaccoStrengths = Array.from(new Set(tobaccoCatalog.map((item) => item.strength))).sort((a, b) => a.localeCompare(b, 'ru'))
  const filteredStock = tobaccoCatalog.filter(
    (item) => (!stockBrand || item.brand === stockBrand) && (!stockStrength || item.strength === stockStrength),
  )

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

    try {
      await authorizedFetch('/api/v1/admin/tobacco', {
        method: 'POST',
        body: JSON.stringify({ strength: tobaccoForm.strength, brand: tobaccoForm.brand, flavor_name: tobaccoForm.flavorName, description: tobaccoForm.description || null }),
      })
      resetTobaccoForm()
      setEditorOverlay(null)
      await loadTobacco(tobaccoQuery)
      setNotice('Позиция табака добавлена в каталог')
      setNoticeTone('neutral')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить табак')
      setNoticeTone('error')
    } finally {
      setTobaccoBusy(false)
    }
  }

  const addInventoryRow = (item: TobaccoItem) => {
    setInventoryRows((current) => {
      if (current.some((row) => row.tobaccoId === item.id)) {
        return current
      }
      const nextRow: InventoryRow = {
        tobaccoId: item.id,
        brand: item.brand,
        flavorName: item.flavor_name,
        strength: item.strength,
        tare: item.tare_weight != null ? item.tare_weight.toString() : '',
        gross: item.gross_weight != null ? item.gross_weight.toString() : '',
        net: item.net_weight != null ? item.net_weight.toString() : '',
        netManual: item.net_weight != null,
        busy: false,
      }
      return [...current, nextRow]
    })
    setInventoryQuery('')
  }

  const removeInventoryRow = (tobaccoId: number) => {
    setInventoryRows((current) => current.filter((row) => row.tobaccoId !== tobaccoId))
  }

  const updateInventoryRow = (tobaccoId: number, field: 'tare' | 'gross' | 'net', value: string) => {
    setInventoryRows((current) =>
      current.map((row) => {
        if (row.tobaccoId !== tobaccoId) {
          return row
        }
        const next = { ...row, [field]: value }
        if (field === 'net') {
          next.netManual = value.trim() !== ''
        } else if (!next.netManual) {
          const tare = Number(field === 'tare' ? value : next.tare)
          const gross = Number(field === 'gross' ? value : next.gross)
          next.net = next.tare !== '' && next.gross !== '' && !Number.isNaN(tare) && !Number.isNaN(gross)
            ? (gross - tare).toString()
            : ''
        }
        return next
      }),
    )
  }

  const saveInventoryRow = async (tobaccoId: number) => {
    const row = inventoryRows.find((item) => item.tobaccoId === tobaccoId)
    if (!row) {
      return
    }

    if (row.net.trim() === '' && (row.tare.trim() === '' || row.gross.trim() === '')) {
      setNotice('Укажите вес без тары или пару «вес тары + вес с тарой»')
      setNoticeTone('error')
      return
    }

    setInventoryRows((current) => current.map((item) => (item.tobaccoId === tobaccoId ? { ...item, busy: true } : item)))

    try {
      await authorizedFetch(`/api/v1/admin/tobacco/${tobaccoId}/inventory`, {
        method: 'PATCH',
        body: JSON.stringify({
          tare_weight: row.tare.trim() !== '' ? Number(row.tare) : null,
          gross_weight: row.gross.trim() !== '' ? Number(row.gross) : null,
          net_weight: row.net.trim() !== '' ? Number(row.net) : null,
        }),
      })
      await loadTobacco()
      setInventoryRows((current) => current.filter((item) => item.tobaccoId !== tobaccoId))
      setNotice(`Остаток «${row.brand} — ${row.flavorName}» обновлён`)
      setNoticeTone('neutral')
    } catch (error) {
      setInventoryRows((current) => current.map((item) => (item.tobaccoId === tobaccoId ? { ...item, busy: false } : item)))
      setNotice(error instanceof Error ? error.message : 'Не удалось сохранить остаток')
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

            <div className="admin-tabs">
              {([['companies', 'Компании'], ['guests', 'Гости'], ['tobacco', 'Каталог табака'], ['inventory', 'Инвентаризация'], ['stock', 'Остатки'], ['orders', 'Заказы'], ['pricing', 'Параметры']] as const).map(([value, label]) => (
                <button key={value} type="button" className={adminTab === value ? 'tab-button tab-button-active' : 'tab-button'} onClick={() => setAdminTab(value)}>{label}</button>
              ))}
            </div>

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
                  <div className="stack-list">{filteredTobacco.map((item) => <article key={item.id} className="list-item tobacco-card"><div className="tobacco-head"><strong>{item.brand} — {item.flavor_name}</strong><span className="pill-inline">{item.strength}</span></div>{item.description ? <p className="tobacco-description">{item.description}</p> : null}</article>)}</div>
                </div>
              ) : null}

              {adminTab === 'inventory' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div><h3>Инвентаризация</h3><p className="summary-hint">Найдите позицию, впишите вес тары и вес с тарой — чистый остаток посчитается сам. Либо укажите вес без тары напрямую.</p></div></div>
                  <div className="header-search-slot inventory-search"><input className="compact-input" placeholder="Поиск позиции по бренду или аромату" value={inventoryQuery} onChange={(event) => setInventoryQuery(event.target.value)} /></div>
                  {inventorySearchResults.length > 0 ? <div className="company-search-results">{inventorySearchResults.map((item) => <button key={item.id} type="button" className="company-result" onClick={() => addInventoryRow(item)}><strong>{item.brand} — {item.flavor_name}</strong><span className="company-result-separator">•</span><span>{item.strength}</span></button>)}</div> : null}
                  {inventoryRows.length > 0 ? (
                    <div className="inventory-table">
                      <div className="inventory-row inventory-head"><span>Позиция</span><span>Вес тары</span><span>Вес с тарой</span><span>Чистый остаток</span><span></span></div>
                      {inventoryRows.map((row) => <div key={row.tobaccoId} className="inventory-row"><span className="inventory-name"><strong>{row.brand} — {row.flavorName}</strong><small>{row.strength}</small></span><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={row.tare} onChange={(event) => updateInventoryRow(row.tobaccoId, 'tare', event.target.value)} /><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={row.gross} onChange={(event) => updateInventoryRow(row.tobaccoId, 'gross', event.target.value)} /><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={row.net} onChange={(event) => updateInventoryRow(row.tobaccoId, 'net', event.target.value)} /><div className="inventory-actions"><button type="button" className="primary-button" disabled={row.busy} onClick={() => saveInventoryRow(row.tobaccoId)}>{row.busy ? '...' : 'Сохранить'}</button><button type="button" className="icon-button" aria-label="Убрать из списка" onClick={() => removeInventoryRow(row.tobaccoId)}>×</button></div></div>)}
                    </div>
                  ) : <p className="summary-hint">Пока ничего не добавлено. Найдите позицию через поиск выше.</p>}
                </div>
              ) : null}

              {adminTab === 'stock' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div><h3>Остатки</h3><p className="summary-hint">Текущий чистый остаток по всему каталогу. Всего позиций: {filteredStock.length}.</p></div><div className="stock-filters"><select value={stockBrand} onChange={(event) => setStockBrand(event.target.value)}><option value="">Все бренды</option>{tobaccoBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select><select value={stockStrength} onChange={(event) => setStockStrength(event.target.value)}><option value="">Все сегменты</option>{tobaccoStrengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}</select></div></div>
                  <div className="stock-table">
                    <div className="stock-row stock-head"><span>Бренд</span><span>Наименование</span><span>Сегмент</span><span>Чистый остаток</span></div>
                    {filteredStock.map((item) => <div key={item.id} className="stock-row"><span>{item.brand}</span><span>{item.flavor_name}</span><span>{item.strength}</span><span className={item.net_weight != null ? 'stock-value' : 'stock-empty'}>{item.net_weight != null ? `${formatNumber(item.net_weight)} г` : '—'}</span></div>)}
                  </div>
                </div>
              ) : null}

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
        <div className="modal-backdrop no-print" data-html2canvas-ignore="true"><div className="modal-card"><div className="card-header"><h3>Новая позиция каталога</h3><button type="button" className="ghost-button" onClick={() => setEditorOverlay(null)}>Закрыть</button></div><form className="form-card" onSubmit={handleCreateTobacco}><div className="form-grid"><label><span>Крепость</span><input value={tobaccoForm.strength} onChange={(event) => setTobaccoForm((current) => ({ ...current, strength: event.target.value }))} /></label><label><span>Бренд</span><input value={tobaccoForm.brand} onChange={(event) => setTobaccoForm((current) => ({ ...current, brand: event.target.value }))} /></label><label className="field-span-2"><span>Аромат</span><input value={tobaccoForm.flavorName} onChange={(event) => setTobaccoForm((current) => ({ ...current, flavorName: event.target.value }))} /></label><label className="field-span-2"><span>Описание</span><textarea value={tobaccoForm.description} onChange={(event) => setTobaccoForm((current) => ({ ...current, description: event.target.value }))} /></label></div><button type="submit" className="primary-button" disabled={tobaccoBusy}>{tobaccoBusy ? 'Сохраняю...' : 'Добавить в каталог'}</button></form></div></div>
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