// Дизайн «Dark Lounge»: тёмная дымная подложка, панели из матового стекла,
// неоновый акцент на итоговой сумме. Смета — две колонки: слева ввод, справа
// липкая карточка итога. Админка — полноэкранный оверлей с боковым меню.

import DatePicker from 'react-datepicker'
import { ru } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import './lounge.css'
import type { AdminTab, DocKind, StockDocument } from '../../core/types'
import type { SparrowApi } from '../../core/useSparrow'
import { getOrderExpensePlaceholder } from '../../core/pricing'
import {
  formatBirthDate,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatOrderStatus,
  formatPositions,
} from '../../core/format'

const NAV: Array<[AdminTab, string]> = [
  ['companies', 'Компании'],
  ['guests', 'Гости'],
  ['tobacco', 'Каталог'],
  ['orders', 'Заказы'],
  ['pricing', 'Параметры'],
]

const WAREHOUSE_NAV: Array<[AdminTab, string]> = [
  ['inventory', 'Инвентаризация'],
  ['receipts', 'Оприходование'],
  ['writeoffs', 'Списание'],
  ['stock', 'Остатки'],
]

const EXPENSE_FIELDS = [
  ['fuel_expense', 'ГСМ'],
  ['consumables_expense', 'Расходники'],
  ['coal_expense', 'Уголь'],
  ['tobacco_expense', 'Табак'],
  ['labor_expense', 'ЗП'],
  ['extra_expense', 'Доп. расходы'],
] as const

function Sheet({ title, subtitle, onClose, wide, children }: {
  title: string
  subtitle?: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="lg-backdrop no-print" data-html2canvas-ignore="true">
      <div className={wide ? 'lg-sheet lg-sheet-wide' : 'lg-sheet'}>
        <header className="lg-sheet-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="lg-ghost" onClick={onClose}>Закрыть</button>
        </header>
        <div className="lg-sheet-body">{children}</div>
      </div>
    </div>
  )
}

export default function LoungeView({ s }: { s: SparrowApi }) {
  const breakdownRows: Array<[string, string, number]> = [
    ['ГСМ', 'бензин до площадки и обратно', s.breakdown.fuelCost],
    ['Расходные материалы', 'полотенца, фольга, зубочистки, скотч', s.breakdown.consumablesCost],
    [
      'Уголь',
      `${formatNumber(s.pricing.coalPrice)} ₽/шт × ${formatNumber(s.pricing.coalsPerHookahSession)} шт × ${formatNumber(s.pricing.hookahHourFactor)} шт/ч × ${formatNumber(s.totalHours)} ч × ${s.calculator.hookahsCount}`,
      s.breakdown.coalCost,
    ],
    [
      'Табак',
      `${formatNumber(s.pricing.tobaccoPricePerGram)} ₽/г × ${formatNumber(s.pricing.tobaccoGramsPerHookah)} г × ${formatNumber(s.pricing.hookahHourFactor)} шт/ч × ${formatNumber(s.totalHours)} ч × ${s.calculator.hookahsCount}`,
      s.breakdown.tobaccoCost,
    ],
    ['ЗП мастера', `${formatCurrency(s.pricing.masterHourRate)}/ч × ${formatNumber(s.totalHours)} ч`, s.breakdown.masterCost],
    [
      'ЗП доп. мастера',
      s.breakdown.extraMasterCost > 0
        ? `${formatCurrency(s.pricing.masterHourRate)}/ч × ${formatNumber(s.totalHours)} ч`
        : 'доп. мастер не требуется',
      s.breakdown.extraMasterCost,
    ],
    [
      'Сервисный сбор',
      s.calculator.hookahsCount > s.pricing.additionalMasterThreshold
        ? `от ${s.pricing.additionalMasterThreshold + 1} кальянов`
        : `до ${s.pricing.additionalMasterThreshold} кальянов`,
      s.breakdown.serviceFee,
    ],
  ]

  const renderDocRow = (doc: StockDocument) => {
    const label = doc.kind === 'receipt' ? 'Оприходование' : 'Списание'
    const grams = doc.lines.reduce((total, line) => total + line.grams, 0)
    const priced = doc.lines.filter((line) => line.cost_per_gram != null)
    const value = priced.reduce((total, line) => total + line.grams * (line.cost_per_gram ?? 0), 0)
    return (
      <button key={doc.id} type="button" className="lg-row lg-row-click" onClick={() => s.openDocumentForEdit(doc)}>
        <span className="lg-row-lead">
          <span className={doc.kind === 'receipt' ? 'lg-tag lg-tag-in' : 'lg-tag lg-tag-out'}>{label} #{doc.id}</span>
          <small>{formatDateTime(doc.created_at)}</small>
          {doc.inventory_session_id != null ? <small>· инвент. #{doc.inventory_session_id}</small> : null}
          {doc.comment ? <small>· {doc.comment}</small> : null}
        </span>
        <span className="lg-row-tail">
          <b>{formatPositions(doc.lines.length)} · {doc.kind === 'receipt' ? '+' : '−'}{formatNumber(grams)} г</b>
          {doc.kind === 'receipt' ? (
            priced.length === 0
              ? <small className="lg-warn">себестоимость не заполнена</small>
              : <small>{priced.length < doc.lines.length ? 'частично ' : ''}{formatCurrency(value)}</small>
          ) : null}
          <span
            role="button"
            tabIndex={0}
            className="lg-x"
            aria-label="Удалить документ"
            onClick={(event) => { event.stopPropagation(); s.deleteDocument(doc.id) }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); s.deleteDocument(doc.id) } }}
          >
            ×
          </span>
        </span>
      </button>
    )
  }

  const renderDocPage = (kind: DocKind) => {
    const title = kind === 'receipt' ? 'Оприходование' : 'Списание'
    const grams = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0), 0)
    const value = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0) * (Number(line.cost) || 0), 0)
    return (
      <section className="lg-panel lg-doc">
        <header className="lg-panel-head">
          <button type="button" className="lg-ghost" onClick={s.cancelDoc}>
            {s.saSessionId != null ? '← К инвентаризации' : `← К списку «${title}»`}
          </button>
          <div className="lg-actions">
            {s.saDocId != null ? <button type="button" className="lg-ghost" onClick={() => s.deleteDocument(s.saDocId!)}>Удалить</button> : null}
            <button type="button" className="lg-primary" disabled={s.saBusy} onClick={s.submitStandaloneDoc}>
              {s.saBusy ? '...' : s.saDocId != null ? 'Сохранить' : 'Создать документ'}
            </button>
          </div>
        </header>

        <div className="lg-doc-title">
          <h3>{s.saDocId != null ? `${title} #${s.saDocId}` : kind === 'receipt' ? 'Новое оприходование' : 'Новое списание'}</h3>
          <div className="lg-doc-meta">
            {s.saCreatedAt ? <small>{formatDateTime(s.saCreatedAt)}</small> : null}
            {s.saSessionId != null ? <span className="lg-tag">из инвентаризации #{s.saSessionId}</span> : null}
            <b>{formatPositions(s.saLines.length)} · {kind === 'receipt' ? '+' : '−'}{formatNumber(grams)} г{kind === 'receipt' && value > 0 ? ` · ${formatCurrency(value)}` : ''}</b>
          </div>
        </div>

        <input className="lg-input" placeholder="Комментарий к документу (необязательно)" value={s.saComment} onChange={(event) => s.setSaComment(event.target.value)} />
        <input className="lg-input" placeholder="Найдите позицию по бренду или аромату" value={s.saQuery} onChange={(event) => s.setSaQuery(event.target.value)} />
        {s.saSearchResults.length > 0 ? (
          <div className="lg-suggest">
            {s.saSearchResults.map((item) => (
              <button key={item.id} type="button" onClick={() => s.addStandaloneLine(item)}>
                <strong>{item.brand} — {item.flavor_name}</strong><small>{item.strength}</small>
              </button>
            ))}
          </div>
        ) : null}

        {s.saLines.length > 0 ? (
          <div className={kind === 'receipt' ? 'lg-lines lg-lines-cost' : 'lg-lines'}>
            <div className="lg-line lg-line-head"><span>Позиция</span><span>Граммы</span>{kind === 'receipt' ? <span>₽/г</span> : null}<span /></div>
            {s.saLines.map((line, index) => (
              <div key={line.tobaccoId} className="lg-line">
                <span><strong>{line.label}</strong></span>
                <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={line.grams} onChange={(event) => s.updateStandaloneLine(index, 'grams', event.target.value)} />
                {kind === 'receipt' ? <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="₽/г" value={line.cost} onChange={(event) => s.updateStandaloneLine(index, 'cost', event.target.value)} /> : null}
                <button type="button" className="lg-x" aria-label="Убрать позицию" onClick={() => s.removeStandaloneLine(index)}>×</button>
              </div>
            ))}
          </div>
        ) : <p className="lg-hint">Добавьте позиции через поиск выше.</p>}
      </section>
    )
  }

  const renderDocTab = (kind: DocKind) => {
    if (s.saKind === kind) {
      return renderDocPage(kind)
    }
    const title = kind === 'receipt' ? 'Оприходование' : 'Списание'
    const list = s.stockDocuments.filter((doc) => doc.kind === kind)
    return (
      <section className="lg-panel">
        <header className="lg-panel-head">
          <h3>{title}</h3>
          <button type="button" className="lg-primary" onClick={() => s.openStandaloneDoc(kind)}>+ Создать</button>
        </header>
        <p className="lg-hint">
          {kind === 'receipt' ? 'Приём товара на склад.' : 'Списание со склада.'} Себестоимость{' '}
          {kind === 'receipt' ? 'указывается внутри документа.' : 'берётся из последнего оприходования.'} Откройте документ, чтобы увидеть состав.
        </p>
        {list.length > 0 ? <div className="lg-rows">{list.map(renderDocRow)}</div> : <p className="lg-hint">Документов пока нет.</p>}
      </section>
    )
  }

  return (
    <div className="lg-root">
      <div className="lg-aura" aria-hidden="true">
        <span className="lg-orb lg-orb-a" />
        <span className="lg-orb lg-orb-b" />
      </div>

      <header className="lg-top no-print" data-html2canvas-ignore="true">
        <div className="lg-brand">
          SP<span>.</span>ARROW
          <small>catering</small>
        </div>
        <button type="button" className="lg-ghost" onClick={s.openAdminOrAuth}>
          {s.adminUser ? 'Админка' : 'Вход'}
        </button>
      </header>

      {s.notice ? (
        <div className={`lg-notice lg-notice-${s.noticeTone} no-print`} data-html2canvas-ignore="true">{s.notice}</div>
      ) : null}

      <section className="lg-hero no-print" data-html2canvas-ignore="true">
        <h1>Кальянный кейтеринг<br />под ключ</h1>
        <p>Задайте время работы и количество кальянов — смета соберётся сама, с расшифровкой каждой строки.</p>
      </section>

      <section className="lg-quote">
        <div className="lg-quote-grid">
          <div className="lg-panel lg-inputs">
            <span className="lg-eyebrow">Параметры мероприятия</span>
            <div className="lg-shifts">
              {s.workRanges.map((workRange, index) => (
                <div key={workRange.id} className="lg-shift">
                  <span className="lg-shift-no">{index + 1}</span>
                  <label>
                    <span>Начало</span>
                    <DatePicker selected={workRange.start} onChange={s.handleWorkRangeChange(workRange.id, 'start')} selectsStart startDate={workRange.start} endDate={workRange.end} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" className="lg-input" calendarClassName="lg-cal" popperClassName="lg-cal-popper" />
                  </label>
                  <label>
                    <span>Окончание</span>
                    <DatePicker selected={workRange.end} onChange={s.handleWorkRangeChange(workRange.id, 'end')} selectsEnd startDate={workRange.start} endDate={workRange.end} minDate={workRange.start} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" className="lg-input" calendarClassName="lg-cal" popperClassName="lg-cal-popper" />
                  </label>
                  {index > 0 ? (
                    <button type="button" className="lg-x" aria-label="Удалить смену" onClick={() => s.handleRemoveWorkRange(workRange.id)}>×</button>
                  ) : <span className="lg-x-slot" />}
                </div>
              ))}
            </div>

            <div className="lg-inputs-foot">
              <button type="button" className="lg-ghost lg-ghost-sm" onClick={s.handleAddWorkRange}>+ Ещё дата</button>
              <label className="lg-count">
                <span>Кальяны</span>
                <input aria-label="Количество кальянов" type="number" min="1" max="30" value={s.calculator.hookahsCount} onChange={s.handleNumberChange('hookahsCount')} />
              </label>
              <span className="lg-hours">{formatNumber(s.totalHours)} ч</span>
            </div>
          </div>

          <aside className="lg-panel lg-total">
            <span className="lg-eyebrow">Предварительная стоимость</span>
            <strong className="lg-total-sum">{formatCurrency(s.roundedTotal)}</strong>
            <p className="lg-total-raw">без округления {formatCurrency(s.breakdown.total)}</p>
            <dl className="lg-total-facts">
              <div><dt>Кальяны</dt><dd>{s.calculator.hookahsCount}</dd></div>
              <div><dt>Часы</dt><dd>{formatNumber(s.totalHours)}</dd></div>
              <div><dt>Смен</dt><dd>{s.workRanges.length}</dd></div>
            </dl>
            <button type="button" className="lg-primary lg-primary-wide no-print" data-html2canvas-ignore="true" onClick={() => s.handleDownloadPdf({ selector: '.lg-quote', background: '#0f0b14' })}>
              Скачать PDF
            </button>
          </aside>
        </div>

        <div className="lg-panel lg-breakdown">
          <span className="lg-eyebrow">Из чего складывается</span>
          {breakdownRows.map(([label, note, value]) => (
            <div key={label} className="lg-brow">
              <div className="lg-brow-top">
                <span>{label}</span>
                <strong>{formatCurrency(value)}</strong>
              </div>
              <div className="lg-brow-bar" aria-hidden="true">
                <i style={{ width: `${s.breakdown.total > 0 ? (value / s.breakdown.total) * 100 : 0}%` }} />
              </div>
              <small>{note}</small>
            </div>
          ))}
          <div className="lg-meta">{s.variableItems.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      </section>

      {s.adminUser && s.adminPanelOpen ? (
        <div className="lg-admin no-print" data-html2canvas-ignore="true">
          <nav className="lg-side">
            <div className="lg-side-user">
              <strong>{s.adminUser.full_name}</strong>
              <small>{s.adminUser.login}</small>
            </div>
            {NAV.map(([tab, label]) => (
              <button key={tab} type="button" className={s.adminTab === tab ? 'lg-nav lg-nav-on' : 'lg-nav'} onClick={() => s.goTab(tab)}>{label}</button>
            ))}
            <button type="button" className={s.warehouseActive ? 'lg-nav lg-nav-on' : 'lg-nav'} onClick={() => s.goTab(s.lastWarehouse)}>Склад</button>
            {s.warehouseActive ? (
              <div className="lg-subnav">
                {WAREHOUSE_NAV.map(([tab, label]) => (
                  <button key={tab} type="button" className={s.adminTab === tab ? 'lg-sub lg-sub-on' : 'lg-sub'} onClick={() => s.goTab(tab)}>{label}</button>
                ))}
              </div>
            ) : null}
            <div className="lg-side-foot">
              <button type="button" className="lg-primary" onClick={s.openCreateOrder}>Заказ из расчёта</button>
              <button type="button" className="lg-ghost" onClick={s.handleLogout}>Выйти</button>
              <button type="button" className="lg-ghost" onClick={() => s.setAdminPanelOpen(false)}>Закрыть</button>
            </div>
          </nav>

          <div className="lg-work">
            {s.adminTab === 'companies' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <h3>Компании</h3>
                  <div className="lg-actions">
                    <input className="lg-input lg-input-sm" placeholder="Поиск заказчика" value={s.companyQuery} onChange={async (event) => { const value = event.target.value; s.setCompanyQuery(value); if (s.adminUser) { try { await s.loadCompanies(value) } catch { /* тихо: подсказки поиска не критичны */ } } }} />
                    <button type="button" className="lg-primary" onClick={s.openCreateCompany}>+ Заказчик</button>
                  </div>
                </header>
                <div className="lg-cards">
                  {s.companies.map((company) => (
                    <article key={company.id} className="lg-card">
                      <header>
                        <strong>{company.name}</strong>
                        <button type="button" className="lg-x" aria-label="Редактировать компанию" onClick={() => s.startEditingCompany(company)}>✎</button>
                      </header>
                      <p>{company.address || 'Адрес не указан'}</p>
                      <p>{company.contact_name || 'Контакт не указан'} · {company.phone || 'без телефона'}</p>
                      <small>{company.comment || 'Без комментария'}</small>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'guests' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <h3>Гости</h3>
                  <div className="lg-actions">
                    <input className="lg-input lg-input-sm" placeholder="Поиск по гостям" value={s.guestQuery} onChange={(event) => s.setGuestQuery(event.target.value)} />
                    <button type="button" className="lg-primary" onClick={s.openCreateGuest}>+ Гость</button>
                  </div>
                </header>
                <div className="lg-cards">
                  {s.filteredGuests.map((guest) => (
                    <article key={guest.id} className="lg-card">
                      <header>
                        <strong>{guest.full_name}</strong>
                        <button type="button" className="lg-x" aria-label="Редактировать гостя" onClick={() => s.startEditingGuest(guest)}>✎</button>
                      </header>
                      <p>{guest.company_name}</p>
                      <p>{guest.phone || 'Телефон не указан'} · {guest.birth_date ? formatBirthDate(guest.birth_date) : 'др не указан'}</p>
                      <div className="lg-chips">
                        {guest.preferences.length > 0 ? guest.preferences.map((preference) => (
                          <button key={preference.id} type="button" className={preference.is_actual ? 'lg-chip lg-chip-on' : 'lg-chip'} onClick={() => s.startEditingPreference(guest.id, preference)}>
                            {preference.preferred_bowl === 'turka' ? 'Турка' : preference.preferred_bowl === 'phunnel' ? 'Фанел' : 'Без чашки'} · {preference.items.map((item) => `${item.tobacco.flavor_name} ${item.percent}%`).join(', ')}
                          </button>
                        )) : <small>Предпочтения не добавлены</small>}
                        <button type="button" className="lg-chip lg-chip-add" onClick={() => s.openPreferenceOverlay(guest.id.toString())}>+ предпочтение</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'tobacco' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <h3>Каталог табака</h3>
                  <div className="lg-actions">
                    <input className="lg-input lg-input-sm" placeholder="Поиск по бренду или аромату" value={s.tobaccoQuery} onChange={(event) => s.setTobaccoQuery(event.target.value)} />
                    <button type="button" className="lg-primary" onClick={s.openCreateTobacco}>+ Позиция</button>
                  </div>
                </header>
                <div className="lg-catalog">
                  <nav className="lg-brands" aria-label="Бренды">
                    <button type="button" className={s.catalogBrand === '' ? 'lg-brand-btn lg-brand-on' : 'lg-brand-btn'} onClick={() => s.setCatalogBrand('')}>
                      <span>Все бренды</span><small>{s.filteredTobacco.length}</small>
                    </button>
                    {s.catalogBrands.map((brand) => (
                      <button key={brand} type="button" className={s.catalogBrand === brand ? 'lg-brand-btn lg-brand-on' : 'lg-brand-btn'} onClick={() => s.setCatalogBrand(brand)}>
                        <span>{brand}</span><small>{s.catalogBrandCounts.get(brand)}</small>
                      </button>
                    ))}
                  </nav>
                  <div className="lg-flavors">
                    {s.catalogItems.length > 0 ? s.catalogItems.map((item) => (
                      <button key={item.id} type="button" className="lg-flavor" onClick={() => s.startEditingTobacco(item)}>
                        <span className="lg-flavor-head">
                          <strong>{s.catalogBrand ? item.flavor_name : `${item.brand} — ${item.flavor_name}`}</strong>
                          <span className="lg-tag">{item.strength}</span>
                        </span>
                        {item.description ? <small>{item.description}</small> : null}
                      </button>
                    )) : <p className="lg-hint">Ничего не найдено.</p>}
                  </div>
                </div>
              </section>
            ) : null}

            {s.adminTab === 'inventory' ? (
              <section className="lg-panel">
                {s.activeInventory ? (
                  <>
                    <header className="lg-panel-head">
                      <div className="lg-actions">
                        <button type="button" className="lg-ghost" onClick={() => s.setActiveInventory(null)}>← К списку</button>
                        <h3>Инвентаризация #{s.activeInventory.id}</h3>
                      </div>
                      {s.activeInventory.lines.length > 0 ? (
                        <div className="lg-actions">
                          <button type="button" className="lg-primary" disabled={s.inventoryBusy} onClick={s.saveInventory}>{s.inventoryBusy ? '...' : 'Сохранить'}</button>
                          <button type="button" className="lg-ghost" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('writeoff')}>Списание →</button>
                          <button type="button" className="lg-ghost" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('receipt')}>Оприходование →</button>
                        </div>
                      ) : null}
                    </header>
                    <p className="lg-hint">Впишите фактический вес — нетто либо тару и вес с тарой. Разница = факт − учётный остаток.</p>
                    <input className="lg-input" placeholder="Найдите позицию и добавьте в инвентаризацию" value={s.sessionQuery} onChange={(event) => s.setSessionQuery(event.target.value)} />
                    {s.sessionSearchResults.length > 0 ? (
                      <div className="lg-suggest">
                        {s.sessionSearchResults.map((item) => (
                          <button key={item.id} type="button" onClick={() => s.addInventoryPosition(item.id)}>
                            <strong>{item.brand} — {item.flavor_name}</strong><small>{item.strength}</small>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <div className="lg-tare">
                        <label><span>Вес тары для всех строк</span><input type="number" min="0" step="0.1" inputMode="decimal" placeholder="г" value={s.tareAll} onChange={(event) => s.setTareAll(event.target.value)} /></label>
                        <button type="button" className="lg-ghost" onClick={s.applyTareToAll}>Применить ко всем</button>
                      </div>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <div className="lg-inv">
                        <div className="lg-inv-row lg-inv-head"><span>Позиция</span><span>Учёт</span><span>Замер</span><span>Факт</span><span>Разница</span><span /></div>
                        {s.activeInventory.lines.map((line) => {
                          const draft = s.lineDrafts[line.id] ?? s.DEFAULT_LINE_DRAFT
                          const counted = s.draftCounted(draft)
                          const diff = counted != null ? counted - line.expected_grams : null
                          return (
                            <div key={line.id} className="lg-inv-row">
                              <span className="lg-inv-name"><strong>{line.brand} — {line.flavor_name}</strong><small>{line.strength}</small></span>
                              <span>{formatNumber(line.expected_grams)} г</span>
                              <div className="lg-measure">
                                <div className="lg-modes">
                                  <button type="button" className={draft.mode === 'net' ? 'lg-mode lg-mode-on' : 'lg-mode'} onClick={() => s.setLineMode(line.id, 'net')}>Без тары</button>
                                  <button type="button" className={draft.mode === 'gross' ? 'lg-mode lg-mode-on' : 'lg-mode'} onClick={() => s.setLineMode(line.id, 'gross')}>С тарой</button>
                                </div>
                                {draft.mode === 'net' ? (
                                  <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="нетто, г" value={draft.net} onChange={(event) => s.updateLineDraft(line.id, 'net', event.target.value)} />
                                ) : (
                                  <div className="lg-pair">
                                    <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="тара, г" value={draft.tare} onChange={(event) => s.updateLineDraft(line.id, 'tare', event.target.value)} />
                                    <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="с тарой, г" value={draft.gross} onChange={(event) => s.updateLineDraft(line.id, 'gross', event.target.value)} />
                                  </div>
                                )}
                              </div>
                              <span className={counted == null ? 'lg-dim' : ''}>{counted == null ? '—' : `${formatNumber(counted)} г`}</span>
                              <span className={diff == null ? 'lg-dim' : diff < 0 ? 'lg-neg' : diff > 0 ? 'lg-pos' : ''}>{diff == null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)} г`}</span>
                              <button type="button" className="lg-x" aria-label="Убрать позицию" onClick={() => s.removeInventoryLine(line.id)}>×</button>
                            </div>
                          )
                        })}
                      </div>
                    ) : <p className="lg-hint">Добавьте позиции через поиск выше.</p>}

                    {s.activeInventory.documents.length > 0 ? (
                      <div className="lg-rows">
                        <h4 className="lg-eyebrow">Созданные документы</h4>
                        {s.activeInventory.documents.map(renderDocRow)}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <header className="lg-panel-head">
                      <h3>Инвентаризации</h3>
                      <button type="button" className="lg-primary" disabled={s.inventoryBusy} onClick={s.startInventory}>+ Создать</button>
                    </header>
                    <p className="lg-hint">Начните инвентаризацию, добавьте позиции через поиск, введите факт — из разницы создастся документ списания или оприходования.</p>
                    {s.inventories.length > 0 ? (
                      <div className="lg-rows">
                        {s.inventories.map((session) => (
                          <button key={session.id} type="button" className="lg-row lg-row-click" onClick={() => s.openInventory(session.id)}>
                            <span className="lg-row-lead">
                              <span className="lg-tag">Инвентаризация #{session.id}</span>
                              <small>{formatDateTime(session.created_at)}</small>
                            </span>
                            <span className="lg-row-tail">
                              <b>{formatPositions(session.lines_total)} · с фактом {session.lines_counted}</b>
                              {session.lines_counted > 0 ? (
                                <small className={session.diff_total < 0 ? 'lg-neg' : session.diff_total > 0 ? 'lg-pos' : ''}>{session.diff_total > 0 ? '+' : ''}{formatNumber(session.diff_total)} г</small>
                              ) : null}
                              <span
                                role="button"
                                tabIndex={0}
                                className="lg-x"
                                aria-label="Удалить инвентаризацию"
                                onClick={(event) => { event.stopPropagation(); s.removeInventory(session.id) }}
                                onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); s.removeInventory(session.id) } }}
                              >
                                ×
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : <p className="lg-hint">Инвентаризаций ещё не было.</p>}
                  </>
                )}
              </section>
            ) : null}

            {s.adminTab === 'receipts' ? renderDocTab('receipt') : null}
            {s.adminTab === 'writeoffs' ? renderDocTab('writeoff') : null}

            {s.adminTab === 'stock' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <div>
                    <h3>Остатки</h3>
                    <p className="lg-hint">Позиций: {s.filteredStock.length} · оценка {formatCurrency(s.stockValueTotal)}</p>
                  </div>
                  <div className="lg-actions">
                    <select className="lg-input lg-input-sm" value={s.stockBrand} onChange={(event) => s.setStockBrand(event.target.value)}>
                      <option value="">Все бренды</option>
                      {s.tobaccoBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <select className="lg-input lg-input-sm" value={s.stockStrength} onChange={(event) => s.setStockStrength(event.target.value)}>
                      <option value="">Все сегменты</option>
                      {s.tobaccoStrengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}
                    </select>
                  </div>
                </header>
                <div className="lg-stock">
                  <div className="lg-stock-row lg-stock-head"><span>Позиция</span><span>Остаток</span><span>₽/г</span><span>Стоимость</span></div>
                  {s.filteredStock.map((item) => (
                    <div key={item.tobacco_id} className="lg-stock-row">
                      <span className="lg-inv-name"><strong>{item.brand} — {item.flavor_name}</strong><small>{item.strength}</small></span>
                      <span>{formatNumber(item.balance_grams)} г</span>
                      <span className={item.cost_per_gram != null ? '' : 'lg-dim'}>{item.cost_per_gram != null ? formatNumber(item.cost_per_gram) : '—'}</span>
                      <span className={item.stock_value != null ? '' : 'lg-dim'}>{item.stock_value != null ? formatCurrency(item.stock_value) : '—'}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'orders' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <h3>Заказы</h3>
                  <p className="lg-hint">Заполняйте реальные расходы — прибыль посчитается сама.</p>
                </header>
                <div className="lg-orders">
                  <div className="lg-order-row lg-order-head"><span>Заказ</span><span>Дата</span><span>Бюджет</span><span>Расходы</span><span>Прибыль</span></div>
                  {s.orders.map((order) => (
                    <button key={order.id} type="button" className="lg-order-row" onClick={() => s.openOrderOverlay(order.id)}>
                      <span className="lg-inv-name"><strong>{order.company_name}</strong><small>{order.location || 'Локация не указана'}</small></span>
                      <span>{formatDateTime(order.work_ranges[0]?.starts_at || `${order.event_date}T${order.event_time}`)}</span>
                      <span>{formatCurrency(order.quoted_total)}</span>
                      <span>{order.actual_total != null ? formatCurrency(order.actual_total) : '—'}</span>
                      <span className={order.actual_profit != null && order.actual_profit >= 0 ? 'lg-pos' : 'lg-neg'}>{order.actual_profit != null ? formatCurrency(order.actual_profit) : '—'}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'pricing' ? (
              <section className="lg-panel">
                <header className="lg-panel-head">
                  <div>
                    <h3>Параметры расчёта</h3>
                    <p className="lg-hint">Эти значения подставляются в смету на главной.</p>
                  </div>
                </header>
                <form className="lg-form" onSubmit={s.handleSavePricing}>
                  <label><span>Ставка сотрудника, ₽/ч</span><input type="number" min="0" step="100" value={s.pricingForm.masterHourRate} onChange={s.handlePricingFieldChange('masterHourRate')} /></label>
                  <label><span>Табак, ₽/гр</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoPricePerGram} onChange={s.handlePricingFieldChange('tobaccoPricePerGram')} /></label>
                  <label><span>Уголь, ₽/шт</span><input type="number" min="0" step="0.1" value={s.pricingForm.coalPrice} onChange={s.handlePricingFieldChange('coalPrice')} /></label>
                  <label><span>Кальянов в час, шт/ч</span><input type="number" min="0" step="0.1" value={s.pricingForm.hookahHourFactor} onChange={s.handlePricingFieldChange('hookahHourFactor')} /></label>
                  <label><span>Углей на кальян, шт</span><input type="number" min="0" step="1" value={s.pricingForm.coalsPerHookahSession} onChange={s.handlePricingFieldChange('coalsPerHookahSession')} /></label>
                  <label><span>Табака на кальян, гр</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoGramsPerHookah} onChange={s.handlePricingFieldChange('tobaccoGramsPerHookah')} /></label>
                  <button type="submit" className="lg-primary" disabled={s.pricingBusy}>{s.pricingBusy ? 'Сохраняю...' : 'Сохранить параметры'}</button>
                </form>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {s.authOpen ? (
        <Sheet
          title={s.bootstrapStatus?.needs_admin ? 'Первый администратор' : 'Вход администратора'}
          onClose={() => s.setAuthOpen(false)}
        >
          {s.bootstrapStatus?.needs_admin ? (
            <form className="lg-form" onSubmit={s.handleBootstrapAdmin}>
              <label><span>Имя администратора</span><input value={s.bootstrapForm.fullName} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label><span>Логин</span><input value={s.bootstrapForm.login} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label><span>Пароль</span><input type="password" value={s.bootstrapForm.password} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, password: event.target.value }))} /></label>
              <label><span>FIRST_ADMIN_PASS</span><input type="password" value={s.bootstrapForm.adminSecret} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, adminSecret: event.target.value }))} /></label>
              {s.bootstrapStatus.secret_configured ? null : <p className="lg-error">FIRST_ADMIN_PASS не настроен в окружении backend.</p>}
              {s.authError ? <p className="lg-error">{s.authError}</p> : null}
              <button type="submit" className="lg-primary" disabled={s.authBusy || s.bootstrapStatus.secret_configured === false}>{s.authBusy ? 'Создаю...' : 'Создать администратора'}</button>
            </form>
          ) : (
            <form className="lg-form" onSubmit={s.handleLogin}>
              <label><span>Логин</span><input value={s.authForm.login} onChange={(event) => s.setAuthForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label><span>Пароль</span><input type="password" value={s.authForm.password} onChange={(event) => s.setAuthForm((current) => ({ ...current, password: event.target.value }))} /></label>
              {s.authError ? <p className="lg-error">{s.authError}</p> : null}
              <button type="submit" className="lg-primary" disabled={s.authBusy}>{s.authBusy ? 'Вхожу...' : 'Войти'}</button>
            </form>
          )}
        </Sheet>
      ) : null}

      {s.editorOverlay === 'company' ? (
        <Sheet title={s.editingCompanyId ? 'Редактирование компании' : 'Новый заказчик'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="lg-form lg-form-2" onSubmit={s.handleCreateCompany}>
            <label><span>Наименование</span><input required value={s.companyForm.name} onChange={(event) => s.setCompanyForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label><span>Адрес</span><input value={s.companyForm.address} onChange={(event) => s.setCompanyForm((current) => ({ ...current, address: event.target.value }))} /></label>
            <label><span>Контактное лицо</span><input value={s.companyForm.contactName} onChange={(event) => s.setCompanyForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label><span>Телефон</span><input value={s.companyForm.phone} onChange={(event) => s.setCompanyForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="lg-span"><span>Комментарий</span><textarea rows={4} value={s.companyForm.comment} onChange={(event) => s.setCompanyForm((current) => ({ ...current, comment: event.target.value }))} /></label>
            <div className="lg-span lg-actions">
              <button type="submit" className="lg-primary" disabled={s.companyBusy}>{s.companyBusy ? 'Сохраняю...' : s.editingCompanyId ? 'Сохранить' : 'Создать'}</button>
              {s.editingCompanyId ? <button type="button" className="lg-ghost" onClick={s.resetCompanyForm}>Сбросить</button> : null}
              {s.editingCompanyId ? <button type="button" className="lg-ghost" onClick={() => { void s.handleDeleteCompany(s.editingCompanyId!) }}>Удалить</button> : null}
            </div>
          </form>
        </Sheet>
      ) : null}

      {s.editorOverlay === 'guest' ? (
        <Sheet title={s.editingGuestId ? 'Редактирование гостя' : 'Новый гость'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="lg-form lg-form-2" onSubmit={s.handleCreateGuest}>
            <label><span>Компания</span><select required value={s.guestForm.companyId} onChange={(event) => s.setGuestForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">Выберите компанию</option>{s.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label><span>Имя гостя</span><input required value={s.guestForm.fullName} onChange={(event) => s.setGuestForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
            <label><span>Телефон</span><input value={s.guestForm.phone} onChange={(event) => s.setGuestForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label><span>Дата рождения</span><input type="date" value={s.guestForm.birthDate} onChange={(event) => s.setGuestForm((current) => ({ ...current, birthDate: event.target.value }))} /></label>
            <div className="lg-span lg-actions">
              <button type="submit" className="lg-primary" disabled={s.guestBusy}>{s.guestBusy ? 'Сохраняю...' : s.editingGuestId ? 'Сохранить' : 'Создать'}</button>
              {s.editingGuestId ? <button type="button" className="lg-ghost" onClick={() => { void s.handleDeleteGuest(s.editingGuestId!) }}>Удалить</button> : null}
            </div>
          </form>
        </Sheet>
      ) : null}

      {s.editorOverlay === 'tobacco' ? (
        <Sheet
          title={s.editingTobaccoId != null ? 'Позиция каталога' : 'Новая позиция'}
          onClose={() => { s.setEditorOverlay(null); s.setEditingTobaccoId(null) }}
        >
          <form className="lg-form" onSubmit={s.handleCreateTobacco}>
            <label><span>Крепость</span><input value={s.tobaccoForm.strength} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, strength: event.target.value }))} /></label>
            <label><span>Бренд</span><input value={s.tobaccoForm.brand} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, brand: event.target.value }))} /></label>
            <label><span>Аромат</span><input value={s.tobaccoForm.flavorName} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, flavorName: event.target.value }))} /></label>
            <label><span>Описание</span><textarea rows={3} value={s.tobaccoForm.description} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <button type="submit" className="lg-primary" disabled={s.tobaccoBusy}>{s.tobaccoBusy ? 'Сохраняю...' : s.editingTobaccoId != null ? 'Сохранить' : 'Добавить'}</button>
          </form>
        </Sheet>
      ) : null}

      {s.createOrderOpen ? (
        <Sheet title="Создание заказа" subtitle="Время и кальяны берутся из текущего расчёта" onClose={() => s.setCreateOrderOpen(false)} wide>
          <form className="lg-form lg-form-2" onSubmit={s.handleCreateOrder}>
            <label className="lg-span"><span>Поиск заказчика</span><input placeholder="Компания, контакт или телефон" value={s.orderCompanyQuery} onChange={(event) => s.setOrderCompanyQuery(event.target.value)} /></label>
            {s.orderCompanyResults.length > 0 ? (
              <div className="lg-span lg-suggest">
                {s.orderCompanyResults.map((company) => (
                  <button key={company.id} type="button" onClick={() => s.applyCompanyToOrder(company)}>
                    <strong>{company.name}</strong><small>{company.contact_name || 'Контакт не указан'}</small>
                  </button>
                ))}
              </div>
            ) : null}
            <label><span>Компания</span><input value={s.orderCustomerForm.companyName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
            <label><span>Адрес</span><input value={s.orderCustomerForm.companyAddress} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyAddress: event.target.value }))} /></label>
            <label><span>Контактное лицо</span><input value={s.orderCustomerForm.contactName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label><span>Телефон</span><input value={s.orderCustomerForm.phone} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="lg-span"><span>Локация мероприятия</span><input type="text" placeholder="Адрес или площадка" value={s.calculator.location} onChange={s.handleLocationChange} /></label>
            <label className="lg-span"><span>Комментарий</span><textarea rows={3} value={s.orderCustomerForm.customerComment} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, customerComment: event.target.value }))} /></label>
            <div className="lg-span lg-facts">
              <div><span>Локация</span><strong>{s.calculator.location || 'Не указана'}</strong></div>
              <div><span>Часы</span><strong>{formatNumber(s.totalHours)}</strong></div>
              <div><span>Кальяны</span><strong>{s.calculator.hookahsCount}</strong></div>
              <div><span>Итого</span><strong>{formatCurrency(s.roundedTotal)}</strong></div>
            </div>
            <button type="submit" className="lg-primary lg-span" disabled={s.createOrderBusy}>{s.createOrderBusy ? 'Создаю...' : 'Создать заказ'}</button>
          </form>
        </Sheet>
      ) : null}

      {s.preferenceOverlayOpen ? (
        <Sheet title={s.preferenceForm.preferenceId ? 'Редактирование предпочтения' : 'Новое предпочтение'} subtitle="Предпочтение сохраняется внутри выбранного гостя" onClose={() => s.setPreferenceOverlayOpen(false)} wide>
          <form className="lg-form lg-form-2" onSubmit={s.handleSavePreference}>
            <label><span>Гость</span><select required value={s.preferenceForm.guestId} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, guestId: event.target.value }))}><option value="">Выберите гостя</option>{s.guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name} · {guest.company_name}</option>)}</select></label>
            <label><span>Чашка</span><select value={s.preferenceForm.preferredBowl} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferredBowl: event.target.value }))}><option value="">Не выбрано</option><option value="turka">Турка</option><option value="phunnel">Фанел</option></select></label>
            <label><span>Актуально</span><select value={s.preferenceForm.isActual ? 'yes' : 'no'} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, isActual: event.target.value === 'yes' }))}><option value="yes">Да</option><option value="no">Нет</option></select></label>
            <label className="lg-span"><span>Комментарий</span><textarea rows={2} value={s.preferenceForm.preferenceComment} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferenceComment: event.target.value }))} /></label>
            <div className="lg-span lg-mix">
              <div className="lg-mix-head">
                <span className={s.guestPreferenceTotal === 100 ? 'lg-pos' : 'lg-neg'}>Сумма: {s.guestPreferenceTotal}%</span>
                <button type="button" className="lg-ghost lg-ghost-sm" onClick={s.addGuestPreferenceRow}>+ позиция</button>
              </div>
              {s.preferenceForm.items.map((item, index) => (
                <div key={`pref-${index}`} className="lg-mix-row">
                  <select value={item.tobaccoId} onChange={(event) => s.handleGuestPreferenceChange(index, 'tobaccoId', event.target.value)}>
                    <option value="">Выберите табак</option>
                    {s.tobaccoCatalog.map((tobacco) => <option key={tobacco.id} value={tobacco.id}>{tobacco.brand} · {tobacco.flavor_name} · {tobacco.strength}</option>)}
                  </select>
                  <input type="number" min="1" max="100" placeholder="%" value={item.percent} onChange={(event) => s.handleGuestPreferenceChange(index, 'percent', event.target.value)} />
                  <button type="button" className="lg-x" aria-label="Удалить позицию" onClick={() => s.removeGuestPreferenceRow(index)}>×</button>
                </div>
              ))}
            </div>
            <div className="lg-span lg-actions">
              <button type="submit" className="lg-primary" disabled={s.preferenceBusy || s.guestPreferenceTotal !== 100}>{s.preferenceBusy ? 'Сохраняю...' : 'Сохранить'}</button>
              <button type="button" className="lg-ghost" onClick={() => s.resetPreferenceForm(s.preferenceForm.guestId)}>Очистить</button>
              {s.preferenceForm.preferenceId ? <button type="button" className="lg-ghost" onClick={() => { void s.handleDeletePreference(Number(s.preferenceForm.preferenceId)) }}>Удалить</button> : null}
            </div>
          </form>
        </Sheet>
      ) : null}

      {s.activeOrder ? (
        <Sheet
          title={s.activeOrder.company_name}
          subtitle={`${formatDateTime(s.activeOrder.work_ranges[0]?.starts_at || `${s.activeOrder.event_date}T${s.activeOrder.event_time}`)} · ${s.activeOrder.location || 'Локация не указана'}`}
          onClose={() => s.setActiveOrderId(null)}
          wide
        >
          <div className="lg-facts">
            <div><span>Бюджет</span><strong>{formatCurrency(s.activeOrder.quoted_total)}</strong></div>
            <div><span>Расходы</span><strong>{s.activeOrder.actual_total != null ? formatCurrency(s.activeOrder.actual_total) : '—'}</strong></div>
            <div><span>Прибыль</span><strong>{s.activeOrder.actual_profit != null ? formatCurrency(s.activeOrder.actual_profit) : '—'}</strong></div>
            <div><span>Статус</span><strong>{s.orderDrafts[s.activeOrder.id] ? formatOrderStatus(s.orderDrafts[s.activeOrder.id].status) : '—'}</strong></div>
          </div>
          {s.orderDrafts[s.activeOrder.id] ? (
            <div className="lg-form lg-form-2">
              {EXPENSE_FIELDS.map(([field, label]) => (
                <label key={field}>
                  <span>{s.activeOrderBreakdown ? `${label} · смета ${formatCurrency(Number(getOrderExpensePlaceholder(field, s.activeOrderBreakdown)))}` : label}</span>
                  <input type="number" min="0" placeholder={s.activeOrderBreakdown ? getOrderExpensePlaceholder(field, s.activeOrderBreakdown) : ''} value={s.orderDrafts[s.activeOrder!.id][field]} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, field, event.target.value)} />
                </label>
              ))}
              <label className="lg-span"><span>Комментарий к доп. расходам</span><textarea rows={2} placeholder="доставка, парковка, срочная закупка" value={s.orderDrafts[s.activeOrder.id].extra_expense_comment} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'extra_expense_comment', event.target.value)} /></label>
              <label><span>Статус</span><select value={s.orderDrafts[s.activeOrder.id].status} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'status', event.target.value)}><option value="draft">Черновик</option><option value="confirmed">Подтверждён</option><option value="completed">Завершён</option><option value="cancelled">Отменён</option></select></label>
              <div className="lg-span lg-actions">
                <button type="button" className="lg-primary" onClick={() => s.handleSaveOrderExpenses(s.activeOrder!.id)}>Сохранить расходы</button>
                <button type="button" className="lg-ghost" onClick={() => { void s.handleDeleteOrder(s.activeOrder!.id) }}>Удалить заказ</button>
              </div>
            </div>
          ) : null}
        </Sheet>
      ) : null}
    </div>
  )
}
