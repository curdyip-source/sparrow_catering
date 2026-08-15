// Вся механика приложения одним хуком: стейт, загрузки, обработчики, производные
// значения. Дизайны (src/designs/*) — чистая вёрстка поверх этого API и не знают
// ни про fetch, ни про формулы. Логика перенесена из прежнего AppShell без
// изменений в поведении.

import { useEffect, useState } from 'react'
import type React from 'react'
import { formatCurrency, formatNumber } from './format'
import {
  DEFAULT_LINE_DRAFT,
  buildOrderExpenseDraft,
  buildPricingSettingsForm,
  buildVariableItems,
  calculateQuote,
  calculateTotalHours,
  createInitialWorkRanges,
  defaultPricing,
  draftCounted,
  initialCalculatorState,
  initialCompanyForm,
  initialGuestForm,
  initialOrderCustomerForm,
  initialPreferenceForm,
  initialTobaccoForm,
  mapApiPricingConfig,
  parseApiError,
  roundQuoteTotal,
} from './pricing'
import type {
  AdminTab,
  AdminUser,
  BootstrapStatus,
  CalculatorState,
  Company,
  DocKind,
  DocLineDraft,
  EditorOverlay,
  Guest,
  GuestPreference,
  GuestPreferenceInput,
  InventoryLine,
  InventoryLineDraft,
  InventorySession,
  InventorySessionDetail,
  Order,
  OrderExpenseDraft,
  PricingConfig,
  PricingSettingsForm,
  StockBalance,
  StockDocument,
  TobaccoItem,
  WarehouseTab,
  WorkRange,
} from './types'

export type PdfCaptureOptions = {
  /** Селектор снимаемого блока — у каждого дизайна свой корень карточки расчёта. */
  selector?: string
  /** Фон холста: должен совпадать с фоном карточки, иначе по краям белая рамка. */
  background?: string
}

export function useSparrow() {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')
  const [pricing, setPricing] = useState<PricingConfig>(defaultPricing)
  const [calculator, setCalculator] = useState<CalculatorState>(initialCalculatorState)
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
  const [adminTab, setAdminTab] = useState<AdminTab>('companies')
  const [editorOverlay, setEditorOverlay] = useState<EditorOverlay>(null)
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
  const [lastWarehouse, setLastWarehouse] = useState<WarehouseTab>('inventory')
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
      } catch { /* backend недоступен — считаем по дефолтным коэффициентам */ }
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
      } catch { /* backend недоступен — форму входа покажем как обычную */ }
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
        await Promise.all([
          loadCompanies(companyQuery),
          loadTobacco(),
          loadStock(),
          loadInventories(),
          loadStockDocuments(),
          loadGuests(),
          loadOrders(),
        ])
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
  const variableItems = buildVariableItems(pricing, { currency: formatCurrency, number: formatNumber })
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

  const handleWorkRangeChange = (id: number, field: 'start' | 'end') => {
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

  // Снимаем только карточку расчёта (со своим фоном), а не всю страницу — иначе в
  // кадр попадают отступы #root и получаются поля другого цвета сверху/снизу.
  // Селектор и фон приходят от дизайна: у каждого своя карточка и своя подложка.
  const handleDownloadPdf = async (options: PdfCaptureOptions = {}) => {
    const selector = options.selector ?? '.quote-capture'
    const background = options.background ?? '#3a2319'
    const target = (document.querySelector(selector) as HTMLElement | null) ?? document.documentElement
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: background,
      onclone: (doc) => {
        const card = doc.querySelector(selector) as HTMLElement | null
        if (card) {
          // Убираем скруглённую светлую рамку и тень: контент ляжет в PDF впритык,
          // прямоугольником, без «бортика» другого цвета вокруг.
          card.style.borderRadius = '0'
          card.style.border = 'none'
          card.style.boxShadow = 'none'
        }
        // Чуть больше воздуха снизу в полях ввода, чтобы текст дат не подрезался.
        doc.querySelectorAll(`${selector} input`).forEach((node) => {
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

  const setLineMode = (lineId: number, mode: 'net' | 'gross') => {
    setLineDrafts((current) => ({ ...current, [lineId]: { ...(current[lineId] ?? DEFAULT_LINE_DRAFT), mode } }))
  }

  const updateLineDraft = (lineId: number, field: 'tare' | 'gross' | 'net', value: string) => {
    setLineDrafts((current) => ({ ...current, [lineId]: { ...(current[lineId] ?? DEFAULT_LINE_DRAFT), [field]: value } }))
  }

  // Одна тара на все строки: проставляем тару и переводим строки в режим «с тарой».
  const applyTareToAll = () => {
    if (!activeInventory) {
      return
    }
    setLineDrafts((current) => {
      const next = { ...current }
      for (const line of activeInventory.lines) {
        const row = next[line.id] ?? DEFAULT_LINE_DRAFT
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
      const draft = lineDrafts[line.id] ?? DEFAULT_LINE_DRAFT
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

  function closeStandaloneDoc() {
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

  const goTab = (tab: AdminTab) => {
    closeStandaloneDoc()
    if (tab === 'inventory' || tab === 'receipts' || tab === 'writeoffs' || tab === 'stock') {
      setLastWarehouse(tab)
    }
    setAdminTab(tab)
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

  // Открыть админку, а если ещё не залогинены — окно входа. Этой парой кнопка
  // «Вход/Админка» одинаково работает во всех дизайнах.
  const openAdminOrAuth = () => {
    if (adminUser) {
      setAdminPanelOpen(true)
      return
    }

    setAuthOpen(true)
  }

  const warehouseActive =
    adminTab === 'inventory' || adminTab === 'receipts' || adminTab === 'writeoffs' || adminTab === 'stock'

  return {
    // расчёт
    pricing,
    calculator,
    workRanges,
    totalHours,
    breakdown,
    roundedTotal,
    variableItems,
    handleNumberChange,
    handleLocationChange,
    handleWorkRangeChange,
    handleAddWorkRange,
    handleRemoveWorkRange,
    handleDownloadPdf,

    // уведомления
    notice,
    noticeTone,

    // авторизация
    adminUser,
    authForm,
    setAuthForm,
    bootstrapStatus,
    bootstrapForm,
    setBootstrapForm,
    authOpen,
    setAuthOpen,
    authBusy,
    authError,
    handleLogin,
    handleBootstrapAdmin,
    handleLogout,
    openAdminOrAuth,

    // админка: каркас
    adminPanelOpen,
    setAdminPanelOpen,
    adminTab,
    goTab,
    lastWarehouse,
    warehouseActive,
    editorOverlay,
    setEditorOverlay,

    // компании
    companies,
    companyQuery,
    setCompanyQuery,
    companyForm,
    setCompanyForm,
    editingCompanyId,
    companyBusy,
    loadCompanies,
    resetCompanyForm,
    openCreateCompany,
    startEditingCompany,
    handleCreateCompany,
    handleDeleteCompany,

    // каталог табака
    tobaccoCatalog,
    tobaccoQuery,
    setTobaccoQuery,
    tobaccoForm,
    setTobaccoForm,
    tobaccoBusy,
    catalogBrand,
    setCatalogBrand,
    catalogBrands,
    catalogBrandCounts,
    catalogItems,
    filteredTobacco,
    editingTobaccoId,
    setEditingTobaccoId,
    openCreateTobacco,
    startEditingTobacco,
    handleCreateTobacco,

    // остатки
    stockBrand,
    setStockBrand,
    stockStrength,
    setStockStrength,
    tobaccoBrands,
    tobaccoStrengths,
    filteredStock,
    stockValueTotal,

    // инвентаризация
    inventories,
    activeInventory,
    setActiveInventory,
    inventoryBusy,
    lineDrafts,
    tareAll,
    setTareAll,
    sessionQuery,
    setSessionQuery,
    sessionSearchResults,
    openInventory,
    startInventory,
    addInventoryPosition,
    removeInventoryLine,
    setLineMode,
    updateLineDraft,
    applyTareToAll,
    saveInventory,
    startDocFromInventory,
    removeInventory,
    draftCounted,
    DEFAULT_LINE_DRAFT,

    // документы склада
    stockDocuments,
    saKind,
    saLines,
    saQuery,
    setSaQuery,
    saBusy,
    saSessionId,
    saDocId,
    saComment,
    setSaComment,
    saCreatedAt,
    saSearchResults,
    openStandaloneDoc,
    openDocumentForEdit,
    cancelDoc,
    addStandaloneLine,
    updateStandaloneLine,
    removeStandaloneLine,
    submitStandaloneDoc,
    deleteDocument,

    // гости и предпочтения
    guests,
    filteredGuests,
    guestQuery,
    setGuestQuery,
    guestForm,
    setGuestForm,
    editingGuestId,
    guestBusy,
    resetGuestForm,
    openCreateGuest,
    startEditingGuest,
    handleCreateGuest,
    handleDeleteGuest,
    preferenceForm,
    setPreferenceForm,
    preferenceOverlayOpen,
    setPreferenceOverlayOpen,
    preferenceBusy,
    guestPreferenceTotal,
    openPreferenceOverlay,
    resetPreferenceForm,
    startEditingPreference,
    handleGuestPreferenceChange,
    addGuestPreferenceRow,
    removeGuestPreferenceRow,
    handleSavePreference,
    handleDeletePreference,

    // заказы
    orders,
    orderDrafts,
    activeOrder,
    activeOrderBreakdown,
    setActiveOrderId,
    openOrderOverlay,
    createOrderOpen,
    setCreateOrderOpen,
    orderCustomerForm,
    setOrderCustomerForm,
    orderCompanyQuery,
    setOrderCompanyQuery,
    orderCompanyResults,
    createOrderBusy,
    applyCompanyToOrder,
    openCreateOrder,
    handleCreateOrder,
    handleOrderDraftChange,
    handleSaveOrderExpenses,
    handleDeleteOrder,

    // параметры расчёта
    pricingForm,
    pricingBusy,
    handlePricingFieldChange,
    handleSavePricing,
  }
}

export type SparrowApi = ReturnType<typeof useSparrow>
