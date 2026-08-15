// Дизайн «Editorial»: кремовая бумага, антиква, тонкие линейки и много воздуха.
// Смета свёрстана как печатное коммерческое предложение — строки с отточием,
// итог крупными цифрами. Админка открывается отдельной «тетрадью» на весь экран.

import DatePicker from 'react-datepicker'
import { ru } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import './editorial.css'
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
  ['consumables_expense', 'Расходные материалы'],
  ['coal_expense', 'Уголь'],
  ['tobacco_expense', 'Табак'],
  ['labor_expense', 'ЗП'],
  ['extra_expense', 'Доп. расходы'],
] as const

function Paper({ title, note, onClose, wide, children }: {
  title: string
  note?: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="ed-backdrop no-print" data-html2canvas-ignore="true">
      <div className={wide ? 'ed-paper ed-paper-wide' : 'ed-paper'}>
        <header className="ed-paper-head">
          <div>
            <h3>{title}</h3>
            {note ? <p>{note}</p> : null}
          </div>
          <button type="button" className="ed-link" onClick={onClose}>закрыть</button>
        </header>
        <div className="ed-paper-body">{children}</div>
      </div>
    </div>
  )
}

export default function EditorialView({ s }: { s: SparrowApi }) {
  const lines: Array<[string, string, number]> = [
    ['ГСМ', 'бензин до площадки и обратно', s.breakdown.fuelCost],
    ['Расходные материалы', 'полотенца, фольга, зубочистки, скотч', s.breakdown.consumablesCost],
    [
      'Уголь',
      `${formatNumber(s.pricing.coalPrice)} ₽/шт · ${formatNumber(s.pricing.coalsPerHookahSession)} шт на сессию`,
      s.breakdown.coalCost,
    ],
    [
      'Табак',
      `${formatNumber(s.pricing.tobaccoPricePerGram)} ₽/г · ${formatNumber(s.pricing.tobaccoGramsPerHookah)} г на кальян`,
      s.breakdown.tobaccoCost,
    ],
    ['Работа мастера', `${formatCurrency(s.pricing.masterHourRate)} в час`, s.breakdown.masterCost],
    [
      'Второй мастер',
      s.breakdown.extraMasterCost > 0 ? `${formatCurrency(s.pricing.masterHourRate)} в час` : 'не требуется',
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
      <div key={doc.id} className="ed-entry">
        <button type="button" className="ed-entry-main" onClick={() => s.openDocumentForEdit(doc)}>
          <span className="ed-entry-title">{label} № {doc.id}</span>
          <span className="ed-entry-note">
            {formatDateTime(doc.created_at)}
            {doc.inventory_session_id != null ? ` · из инвентаризации № ${doc.inventory_session_id}` : ''}
            {doc.comment ? ` · ${doc.comment}` : ''}
          </span>
          <span className="ed-entry-sum">
            {formatPositions(doc.lines.length)} · {doc.kind === 'receipt' ? '+' : '−'}{formatNumber(grams)} г
            {doc.kind === 'receipt' ? (priced.length === 0 ? ' · без себестоимости' : ` · ${priced.length < doc.lines.length ? 'частично ' : ''}${formatCurrency(value)}`) : ''}
          </span>
        </button>
        <button type="button" className="ed-x" aria-label="Удалить документ" onClick={() => s.deleteDocument(doc.id)}>×</button>
      </div>
    )
  }

  const renderDocPage = (kind: DocKind) => {
    const title = kind === 'receipt' ? 'Оприходование' : 'Списание'
    const grams = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0), 0)
    const value = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0) * (Number(line.cost) || 0), 0)
    return (
      <section className="ed-section">
        <div className="ed-section-head">
          <button type="button" className="ed-link" onClick={s.cancelDoc}>
            {s.saSessionId != null ? '← к инвентаризации' : `← к списку «${title}»`}
          </button>
          <div className="ed-inline">
            {s.saDocId != null ? <button type="button" className="ed-link" onClick={() => s.deleteDocument(s.saDocId!)}>удалить</button> : null}
            <button type="button" className="ed-button" disabled={s.saBusy} onClick={s.submitStandaloneDoc}>
              {s.saBusy ? '...' : s.saDocId != null ? 'Сохранить' : 'Создать документ'}
            </button>
          </div>
        </div>

        <h2 className="ed-h2">{s.saDocId != null ? `${title} № ${s.saDocId}` : kind === 'receipt' ? 'Новое оприходование' : 'Новое списание'}</h2>
        <p className="ed-note">
          {s.saCreatedAt ? `${formatDateTime(s.saCreatedAt)} · ` : ''}
          {s.saSessionId != null ? `из инвентаризации № ${s.saSessionId} · ` : ''}
          {formatPositions(s.saLines.length)} · {kind === 'receipt' ? '+' : '−'}{formatNumber(grams)} г
          {kind === 'receipt' && value > 0 ? ` · ${formatCurrency(value)}` : ''}
        </p>

        <label className="ed-field"><span>Комментарий к документу</span><input value={s.saComment} onChange={(event) => s.setSaComment(event.target.value)} /></label>
        <label className="ed-field"><span>Добавить позицию</span><input placeholder="бренд или аромат" value={s.saQuery} onChange={(event) => s.setSaQuery(event.target.value)} /></label>
        {s.saSearchResults.length > 0 ? (
          <ul className="ed-suggest">
            {s.saSearchResults.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => s.addStandaloneLine(item)}>
                  {item.brand} — {item.flavor_name} <em>{item.strength}</em>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {s.saLines.length > 0 ? (
          <table className="ed-table">
            <thead>
              <tr><th>Позиция</th><th>Граммы</th>{kind === 'receipt' ? <th>₽/г</th> : null}<th /></tr>
            </thead>
            <tbody>
              {s.saLines.map((line, index) => (
                <tr key={line.tobaccoId}>
                  <td>{line.label}</td>
                  <td><input type="number" min="0" step="0.1" inputMode="decimal" value={line.grams} onChange={(event) => s.updateStandaloneLine(index, 'grams', event.target.value)} /></td>
                  {kind === 'receipt' ? <td><input type="number" min="0" step="0.01" inputMode="decimal" value={line.cost} onChange={(event) => s.updateStandaloneLine(index, 'cost', event.target.value)} /></td> : null}
                  <td><button type="button" className="ed-x" aria-label="Убрать позицию" onClick={() => s.removeStandaloneLine(index)}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="ed-note">Добавьте позиции через поиск выше.</p>}
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
      <section className="ed-section">
        <div className="ed-section-head">
          <h2 className="ed-h2">{title}</h2>
          <button type="button" className="ed-button" onClick={() => s.openStandaloneDoc(kind)}>Создать</button>
        </div>
        <p className="ed-note">
          {kind === 'receipt' ? 'Приём товара на склад.' : 'Списание со склада.'} Себестоимость{' '}
          {kind === 'receipt' ? 'указывается внутри документа.' : 'берётся из последнего оприходования.'}
        </p>
        {list.length > 0 ? <div className="ed-entries">{list.map(renderDocRow)}</div> : <p className="ed-note">Документов пока нет.</p>}
      </section>
    )
  }

  return (
    <div className="ed-root">
      <header className="ed-masthead no-print" data-html2canvas-ignore="true">
        <button type="button" className="ed-link" onClick={s.openAdminOrAuth}>
          {s.adminUser ? 'админка' : 'вход'}
        </button>
        <div className="ed-wordmark">
          <span className="ed-rule" />
          <h1>SP.ARROW</h1>
          <span className="ed-rule" />
        </div>
        <p className="ed-tagline">кальянный кейтеринг · расчёт мероприятия</p>
      </header>

      {s.notice ? (
        <div className={`ed-notice ed-notice-${s.noticeTone} no-print`} data-html2canvas-ignore="true">{s.notice}</div>
      ) : null}

      <article className="ed-quote">
        <div className="ed-quote-head">
          <h2>Коммерческое предложение</h2>
          <p>Стоимость рассчитана по текущим параметрам обслуживания и указана до подписания сметы.</p>
        </div>

        <section className="ed-params">
          {s.workRanges.map((workRange, index) => (
            <div key={workRange.id} className="ed-param-row">
              <span className="ed-param-index">{index === 0 ? 'Смена' : `Смена ${index + 1}`}</span>
              <label className="ed-blank">
                <span>с</span>
                <DatePicker selected={workRange.start} onChange={s.handleWorkRangeChange(workRange.id, 'start')} selectsStart startDate={workRange.start} endDate={workRange.end} showTimeSelect timeIntervals={30} locale={ru} dateFormat="d MMMM, HH:mm" timeFormat="HH:mm" calendarClassName="ed-cal" popperClassName="ed-cal-popper" />
              </label>
              <label className="ed-blank">
                <span>до</span>
                <DatePicker selected={workRange.end} onChange={s.handleWorkRangeChange(workRange.id, 'end')} selectsEnd startDate={workRange.start} endDate={workRange.end} minDate={workRange.start} showTimeSelect timeIntervals={30} locale={ru} dateFormat="d MMMM, HH:mm" timeFormat="HH:mm" calendarClassName="ed-cal" popperClassName="ed-cal-popper" />
              </label>
              {index > 0 ? (
                <button type="button" className="ed-x" aria-label="Удалить смену" onClick={() => s.handleRemoveWorkRange(workRange.id)}>×</button>
              ) : <span className="ed-x-slot" />}
            </div>
          ))}
          <div className="ed-param-row ed-param-foot">
            <button type="button" className="ed-link" onClick={s.handleAddWorkRange}>+ ещё дата</button>
            <label className="ed-blank ed-blank-count">
              <span>кальянов</span>
              <input aria-label="Количество кальянов" type="number" min="1" max="30" value={s.calculator.hookahsCount} onChange={s.handleNumberChange('hookahsCount')} />
            </label>
            <span className="ed-param-total">{formatNumber(s.totalHours)} ч работы</span>
          </div>
        </section>

        <dl className="ed-lines">
          {lines.map(([label, note, value]) => (
            <div key={label} className="ed-line">
              <dt>
                {label}
                <em>{note}</em>
              </dt>
              <span className="ed-leader" aria-hidden="true" />
              <dd>{formatCurrency(value)}</dd>
            </div>
          ))}
        </dl>

        <div className="ed-total">
          <div className="ed-total-raw">
            <span>Сумма по смете</span>
            <b>{formatCurrency(s.breakdown.total)}</b>
          </div>
          <div className="ed-total-final">
            <span>Итого к оплате</span>
            <strong>{formatCurrency(s.roundedTotal)}</strong>
          </div>
        </div>

        <footer className="ed-colophon">
          {s.variableItems.map((item) => <span key={item}>{item}</span>)}
        </footer>

        <button type="button" className="ed-button ed-button-wide no-print" data-html2canvas-ignore="true" onClick={() => s.handleDownloadPdf({ selector: '.ed-quote', background: '#f7f2e8' })}>
          Скачать PDF
        </button>
      </article>

      {s.adminUser && s.adminPanelOpen ? (
        <div className="ed-admin no-print" data-html2canvas-ignore="true">
          <div className="ed-admin-inner">
            <header className="ed-admin-head">
              <div>
                <h2 className="ed-h2">Ведение дел</h2>
                <p className="ed-note">{s.adminUser.full_name} · {s.adminUser.login}</p>
              </div>
              <div className="ed-inline">
                <button type="button" className="ed-button" onClick={s.openCreateOrder}>Заказ из расчёта</button>
                <button type="button" className="ed-link" onClick={s.handleLogout}>выйти</button>
                <button type="button" className="ed-link" onClick={() => s.setAdminPanelOpen(false)}>закрыть</button>
              </div>
            </header>

            <nav className="ed-nav">
              {NAV.map(([tab, label]) => (
                <button key={tab} type="button" className={s.adminTab === tab ? 'ed-nav-item ed-nav-on' : 'ed-nav-item'} onClick={() => s.goTab(tab)}>{label}</button>
              ))}
              <button type="button" className={s.warehouseActive ? 'ed-nav-item ed-nav-on' : 'ed-nav-item'} onClick={() => s.goTab(s.lastWarehouse)}>Склад</button>
            </nav>
            {s.warehouseActive ? (
              <nav className="ed-subnav">
                {WAREHOUSE_NAV.map(([tab, label]) => (
                  <button key={tab} type="button" className={s.adminTab === tab ? 'ed-sub-item ed-sub-on' : 'ed-sub-item'} onClick={() => s.goTab(tab)}>{label}</button>
                ))}
              </nav>
            ) : null}

            {s.adminTab === 'companies' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <h2 className="ed-h2">Компании</h2>
                  <div className="ed-inline">
                    <input className="ed-search" placeholder="поиск заказчика" value={s.companyQuery} onChange={async (event) => { const value = event.target.value; s.setCompanyQuery(value); if (s.adminUser) { try { await s.loadCompanies(value) } catch { /* тихо: подсказки поиска не критичны */ } } }} />
                    <button type="button" className="ed-button" onClick={s.openCreateCompany}>Новый заказчик</button>
                  </div>
                </div>
                <div className="ed-entries">
                  {s.companies.map((company) => (
                    <div key={company.id} className="ed-entry">
                      <button type="button" className="ed-entry-main" onClick={() => s.startEditingCompany(company)}>
                        <span className="ed-entry-title">{company.name}</span>
                        <span className="ed-entry-note">{company.address || 'Адрес не указан'} · {company.contact_name || 'контакт не указан'} · {company.phone || 'без телефона'}</span>
                        {company.comment ? <span className="ed-entry-sum">{company.comment}</span> : null}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'guests' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <h2 className="ed-h2">Гости</h2>
                  <div className="ed-inline">
                    <input className="ed-search" placeholder="поиск по гостям" value={s.guestQuery} onChange={(event) => s.setGuestQuery(event.target.value)} />
                    <button type="button" className="ed-button" onClick={s.openCreateGuest}>Новый гость</button>
                  </div>
                </div>
                <div className="ed-entries">
                  {s.filteredGuests.map((guest) => (
                    <div key={guest.id} className="ed-entry ed-entry-stack">
                      <button type="button" className="ed-entry-main" onClick={() => s.startEditingGuest(guest)}>
                        <span className="ed-entry-title">{guest.full_name}</span>
                        <span className="ed-entry-note">{guest.company_name} · {guest.phone || 'телефон не указан'} · {guest.birth_date ? formatBirthDate(guest.birth_date) : 'др не указан'}</span>
                      </button>
                      <div className="ed-prefs">
                        {guest.preferences.map((preference) => (
                          <button key={preference.id} type="button" className={preference.is_actual ? 'ed-pref ed-pref-on' : 'ed-pref'} onClick={() => s.startEditingPreference(guest.id, preference)}>
                            {preference.preferred_bowl === 'turka' ? 'Турка' : preference.preferred_bowl === 'phunnel' ? 'Фанел' : 'Без чашки'} — {preference.items.map((item) => `${item.tobacco.flavor_name} ${item.percent}%`).join(', ')}
                          </button>
                        ))}
                        <button type="button" className="ed-link" onClick={() => s.openPreferenceOverlay(guest.id.toString())}>+ предпочтение</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {s.adminTab === 'tobacco' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <h2 className="ed-h2">Каталог табака</h2>
                  <div className="ed-inline">
                    <input className="ed-search" placeholder="поиск по бренду или аромату" value={s.tobaccoQuery} onChange={(event) => s.setTobaccoQuery(event.target.value)} />
                    <button type="button" className="ed-button" onClick={s.openCreateTobacco}>Новая позиция</button>
                  </div>
                </div>
                <div className="ed-brandbar">
                  <button type="button" className={s.catalogBrand === '' ? 'ed-brand ed-brand-on' : 'ed-brand'} onClick={() => s.setCatalogBrand('')}>
                    Все бренды <em>{s.filteredTobacco.length}</em>
                  </button>
                  {s.catalogBrands.map((brand) => (
                    <button key={brand} type="button" className={s.catalogBrand === brand ? 'ed-brand ed-brand-on' : 'ed-brand'} onClick={() => s.setCatalogBrand(brand)}>
                      {brand} <em>{s.catalogBrandCounts.get(brand)}</em>
                    </button>
                  ))}
                </div>
                {s.catalogItems.length > 0 ? (
                  <div className="ed-entries">
                    {s.catalogItems.map((item) => (
                      <div key={item.id} className="ed-entry">
                        <button type="button" className="ed-entry-main" onClick={() => s.startEditingTobacco(item)}>
                          <span className="ed-entry-title">{s.catalogBrand ? item.flavor_name : `${item.brand} — ${item.flavor_name}`}</span>
                          <span className="ed-entry-note">{item.strength}{item.description ? ` · ${item.description}` : ''}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : <p className="ed-note">Ничего не найдено.</p>}
              </section>
            ) : null}

            {s.adminTab === 'inventory' ? (
              <section className="ed-section">
                {s.activeInventory ? (
                  <>
                    <div className="ed-section-head">
                      <div className="ed-inline">
                        <button type="button" className="ed-link" onClick={() => s.setActiveInventory(null)}>← к списку</button>
                        <h2 className="ed-h2">Инвентаризация № {s.activeInventory.id}</h2>
                      </div>
                      {s.activeInventory.lines.length > 0 ? (
                        <div className="ed-inline">
                          <button type="button" className="ed-button" disabled={s.inventoryBusy} onClick={s.saveInventory}>{s.inventoryBusy ? '...' : 'Сохранить'}</button>
                          <button type="button" className="ed-link" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('writeoff')}>списание →</button>
                          <button type="button" className="ed-link" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('receipt')}>оприходование →</button>
                        </div>
                      ) : null}
                    </div>
                    <p className="ed-note">Впишите фактический вес — нетто либо тару и вес с тарой. Разница = факт − учётный остаток.</p>
                    <label className="ed-field"><span>Добавить позицию</span><input placeholder="бренд или аромат" value={s.sessionQuery} onChange={(event) => s.setSessionQuery(event.target.value)} /></label>
                    {s.sessionSearchResults.length > 0 ? (
                      <ul className="ed-suggest">
                        {s.sessionSearchResults.map((item) => (
                          <li key={item.id}><button type="button" onClick={() => s.addInventoryPosition(item.id)}>{item.brand} — {item.flavor_name} <em>{item.strength}</em></button></li>
                        ))}
                      </ul>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <div className="ed-inline ed-tare">
                        <label className="ed-field ed-field-inline"><span>Тара для всех строк</span><input type="number" min="0" step="0.1" inputMode="decimal" value={s.tareAll} onChange={(event) => s.setTareAll(event.target.value)} /></label>
                        <button type="button" className="ed-link" onClick={s.applyTareToAll}>применить ко всем</button>
                      </div>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <table className="ed-table">
                        <thead>
                          <tr><th>Позиция</th><th>Учёт</th><th>Замер</th><th>Факт</th><th>Разница</th><th /></tr>
                        </thead>
                        <tbody>
                          {s.activeInventory.lines.map((line) => {
                            const draft = s.lineDrafts[line.id] ?? s.DEFAULT_LINE_DRAFT
                            const counted = s.draftCounted(draft)
                            const diff = counted != null ? counted - line.expected_grams : null
                            return (
                              <tr key={line.id}>
                                <td><strong>{line.brand} — {line.flavor_name}</strong><em>{line.strength}</em></td>
                                <td>{formatNumber(line.expected_grams)} г</td>
                                <td>
                                  <div className="ed-modes">
                                    <button type="button" className={draft.mode === 'net' ? 'ed-mode ed-mode-on' : 'ed-mode'} onClick={() => s.setLineMode(line.id, 'net')}>без тары</button>
                                    <button type="button" className={draft.mode === 'gross' ? 'ed-mode ed-mode-on' : 'ed-mode'} onClick={() => s.setLineMode(line.id, 'gross')}>с тарой</button>
                                  </div>
                                  {draft.mode === 'net' ? (
                                    <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="нетто" value={draft.net} onChange={(event) => s.updateLineDraft(line.id, 'net', event.target.value)} />
                                  ) : (
                                    <div className="ed-pair">
                                      <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="тара" value={draft.tare} onChange={(event) => s.updateLineDraft(line.id, 'tare', event.target.value)} />
                                      <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="с тарой" value={draft.gross} onChange={(event) => s.updateLineDraft(line.id, 'gross', event.target.value)} />
                                    </div>
                                  )}
                                </td>
                                <td>{counted == null ? '—' : `${formatNumber(counted)} г`}</td>
                                <td className={diff == null ? '' : diff < 0 ? 'ed-neg' : diff > 0 ? 'ed-pos' : ''}>{diff == null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)} г`}</td>
                                <td><button type="button" className="ed-x" aria-label="Убрать позицию" onClick={() => s.removeInventoryLine(line.id)}>×</button></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    ) : <p className="ed-note">Добавьте позиции через поиск выше.</p>}

                    {s.activeInventory.documents.length > 0 ? (
                      <>
                        <h3 className="ed-h3">Созданные документы</h3>
                        <div className="ed-entries">{s.activeInventory.documents.map(renderDocRow)}</div>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="ed-section-head">
                      <h2 className="ed-h2">Инвентаризации</h2>
                      <button type="button" className="ed-button" disabled={s.inventoryBusy} onClick={s.startInventory}>Начать</button>
                    </div>
                    <p className="ed-note">Добавьте позиции через поиск, введите факт — из разницы создастся документ списания или оприходования.</p>
                    {s.inventories.length > 0 ? (
                      <div className="ed-entries">
                        {s.inventories.map((session) => (
                          <div key={session.id} className="ed-entry">
                            <button type="button" className="ed-entry-main" onClick={() => s.openInventory(session.id)}>
                              <span className="ed-entry-title">Инвентаризация № {session.id}</span>
                              <span className="ed-entry-note">{formatDateTime(session.created_at)}</span>
                              <span className="ed-entry-sum">
                                {formatPositions(session.lines_total)} · с фактом {session.lines_counted}
                                {session.lines_counted > 0 ? ` · ${session.diff_total > 0 ? '+' : ''}${formatNumber(session.diff_total)} г` : ''}
                              </span>
                            </button>
                            <button type="button" className="ed-x" aria-label="Удалить инвентаризацию" onClick={() => s.removeInventory(session.id)}>×</button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="ed-note">Инвентаризаций ещё не было.</p>}
                  </>
                )}
              </section>
            ) : null}

            {s.adminTab === 'receipts' ? renderDocTab('receipt') : null}
            {s.adminTab === 'writeoffs' ? renderDocTab('writeoff') : null}

            {s.adminTab === 'stock' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <div>
                    <h2 className="ed-h2">Остатки</h2>
                    <p className="ed-note">Позиций: {s.filteredStock.length} · оценка {formatCurrency(s.stockValueTotal)}</p>
                  </div>
                  <div className="ed-inline">
                    <select className="ed-search" value={s.stockBrand} onChange={(event) => s.setStockBrand(event.target.value)}>
                      <option value="">все бренды</option>
                      {s.tobaccoBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <select className="ed-search" value={s.stockStrength} onChange={(event) => s.setStockStrength(event.target.value)}>
                      <option value="">все сегменты</option>
                      {s.tobaccoStrengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}
                    </select>
                  </div>
                </div>
                <table className="ed-table">
                  <thead><tr><th>Позиция</th><th>Остаток</th><th>₽/г</th><th>Стоимость</th></tr></thead>
                  <tbody>
                    {s.filteredStock.map((item) => (
                      <tr key={item.tobacco_id}>
                        <td><strong>{item.brand} — {item.flavor_name}</strong><em>{item.strength}</em></td>
                        <td>{formatNumber(item.balance_grams)} г</td>
                        <td>{item.cost_per_gram != null ? formatNumber(item.cost_per_gram) : '—'}</td>
                        <td>{item.stock_value != null ? formatCurrency(item.stock_value) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            {s.adminTab === 'orders' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <h2 className="ed-h2">Заказы</h2>
                  <p className="ed-note">Заполняйте реальные расходы — прибыль посчитается сама.</p>
                </div>
                <table className="ed-table ed-table-click">
                  <thead><tr><th>Заказ</th><th>Дата</th><th>Бюджет</th><th>Расходы</th><th>Прибыль</th></tr></thead>
                  <tbody>
                    {s.orders.map((order) => (
                      <tr key={order.id} onClick={() => s.openOrderOverlay(order.id)}>
                        <td><strong>{order.company_name}</strong><em>{order.location || 'локация не указана'}</em></td>
                        <td>{formatDateTime(order.work_ranges[0]?.starts_at || `${order.event_date}T${order.event_time}`)}</td>
                        <td>{formatCurrency(order.quoted_total)}</td>
                        <td>{order.actual_total != null ? formatCurrency(order.actual_total) : '—'}</td>
                        <td className={order.actual_profit != null && order.actual_profit >= 0 ? 'ed-pos' : 'ed-neg'}>{order.actual_profit != null ? formatCurrency(order.actual_profit) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}

            {s.adminTab === 'pricing' ? (
              <section className="ed-section">
                <div className="ed-section-head">
                  <div>
                    <h2 className="ed-h2">Параметры расчёта</h2>
                    <p className="ed-note">Эти значения подставляются в смету на главной странице.</p>
                  </div>
                </div>
                <form className="ed-form" onSubmit={s.handleSavePricing}>
                  <label className="ed-field"><span>Ставка сотрудника, ₽/ч</span><input type="number" min="0" step="100" value={s.pricingForm.masterHourRate} onChange={s.handlePricingFieldChange('masterHourRate')} /></label>
                  <label className="ed-field"><span>Табак, ₽/гр</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoPricePerGram} onChange={s.handlePricingFieldChange('tobaccoPricePerGram')} /></label>
                  <label className="ed-field"><span>Уголь, ₽/шт</span><input type="number" min="0" step="0.1" value={s.pricingForm.coalPrice} onChange={s.handlePricingFieldChange('coalPrice')} /></label>
                  <label className="ed-field"><span>Кальянов в час</span><input type="number" min="0" step="0.1" value={s.pricingForm.hookahHourFactor} onChange={s.handlePricingFieldChange('hookahHourFactor')} /></label>
                  <label className="ed-field"><span>Углей на кальян</span><input type="number" min="0" step="1" value={s.pricingForm.coalsPerHookahSession} onChange={s.handlePricingFieldChange('coalsPerHookahSession')} /></label>
                  <label className="ed-field"><span>Табака на кальян, гр</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoGramsPerHookah} onChange={s.handlePricingFieldChange('tobaccoGramsPerHookah')} /></label>
                  <button type="submit" className="ed-button" disabled={s.pricingBusy}>{s.pricingBusy ? 'Сохраняю...' : 'Сохранить параметры'}</button>
                </form>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {s.authOpen ? (
        <Paper title={s.bootstrapStatus?.needs_admin ? 'Первый администратор' : 'Вход администратора'} onClose={() => s.setAuthOpen(false)}>
          {s.bootstrapStatus?.needs_admin ? (
            <form className="ed-form" onSubmit={s.handleBootstrapAdmin}>
              <label className="ed-field"><span>Имя администратора</span><input value={s.bootstrapForm.fullName} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label className="ed-field"><span>Логин</span><input value={s.bootstrapForm.login} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label className="ed-field"><span>Пароль</span><input type="password" value={s.bootstrapForm.password} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, password: event.target.value }))} /></label>
              <label className="ed-field"><span>FIRST_ADMIN_PASS</span><input type="password" value={s.bootstrapForm.adminSecret} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, adminSecret: event.target.value }))} /></label>
              {s.bootstrapStatus.secret_configured ? null : <p className="ed-neg">FIRST_ADMIN_PASS не настроен в окружении backend.</p>}
              {s.authError ? <p className="ed-neg">{s.authError}</p> : null}
              <button type="submit" className="ed-button" disabled={s.authBusy || s.bootstrapStatus.secret_configured === false}>{s.authBusy ? 'Создаю...' : 'Создать администратора'}</button>
            </form>
          ) : (
            <form className="ed-form" onSubmit={s.handleLogin}>
              <label className="ed-field"><span>Логин</span><input value={s.authForm.login} onChange={(event) => s.setAuthForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label className="ed-field"><span>Пароль</span><input type="password" value={s.authForm.password} onChange={(event) => s.setAuthForm((current) => ({ ...current, password: event.target.value }))} /></label>
              {s.authError ? <p className="ed-neg">{s.authError}</p> : null}
              <button type="submit" className="ed-button" disabled={s.authBusy}>{s.authBusy ? 'Вхожу...' : 'Войти'}</button>
            </form>
          )}
        </Paper>
      ) : null}

      {s.editorOverlay === 'company' ? (
        <Paper title={s.editingCompanyId ? 'Редактирование компании' : 'Новый заказчик'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="ed-form ed-form-2" onSubmit={s.handleCreateCompany}>
            <label className="ed-field"><span>Наименование</span><input required value={s.companyForm.name} onChange={(event) => s.setCompanyForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="ed-field"><span>Адрес</span><input value={s.companyForm.address} onChange={(event) => s.setCompanyForm((current) => ({ ...current, address: event.target.value }))} /></label>
            <label className="ed-field"><span>Контактное лицо</span><input value={s.companyForm.contactName} onChange={(event) => s.setCompanyForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label className="ed-field"><span>Телефон</span><input value={s.companyForm.phone} onChange={(event) => s.setCompanyForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="ed-field ed-span"><span>Комментарий</span><textarea rows={4} value={s.companyForm.comment} onChange={(event) => s.setCompanyForm((current) => ({ ...current, comment: event.target.value }))} /></label>
            <div className="ed-span ed-inline">
              <button type="submit" className="ed-button" disabled={s.companyBusy}>{s.companyBusy ? 'Сохраняю...' : s.editingCompanyId ? 'Сохранить' : 'Создать'}</button>
              {s.editingCompanyId ? <button type="button" className="ed-link" onClick={s.resetCompanyForm}>сбросить</button> : null}
              {s.editingCompanyId ? <button type="button" className="ed-link" onClick={() => { void s.handleDeleteCompany(s.editingCompanyId!) }}>удалить</button> : null}
            </div>
          </form>
        </Paper>
      ) : null}

      {s.editorOverlay === 'guest' ? (
        <Paper title={s.editingGuestId ? 'Редактирование гостя' : 'Новый гость'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="ed-form ed-form-2" onSubmit={s.handleCreateGuest}>
            <label className="ed-field"><span>Компания</span><select required value={s.guestForm.companyId} onChange={(event) => s.setGuestForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">выберите компанию</option>{s.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className="ed-field"><span>Имя гостя</span><input required value={s.guestForm.fullName} onChange={(event) => s.setGuestForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
            <label className="ed-field"><span>Телефон</span><input value={s.guestForm.phone} onChange={(event) => s.setGuestForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="ed-field"><span>Дата рождения</span><input type="date" value={s.guestForm.birthDate} onChange={(event) => s.setGuestForm((current) => ({ ...current, birthDate: event.target.value }))} /></label>
            <div className="ed-span ed-inline">
              <button type="submit" className="ed-button" disabled={s.guestBusy}>{s.guestBusy ? 'Сохраняю...' : s.editingGuestId ? 'Сохранить' : 'Создать'}</button>
              {s.editingGuestId ? <button type="button" className="ed-link" onClick={() => { void s.handleDeleteGuest(s.editingGuestId!) }}>удалить</button> : null}
            </div>
          </form>
        </Paper>
      ) : null}

      {s.editorOverlay === 'tobacco' ? (
        <Paper title={s.editingTobaccoId != null ? 'Позиция каталога' : 'Новая позиция'} onClose={() => { s.setEditorOverlay(null); s.setEditingTobaccoId(null) }}>
          <form className="ed-form" onSubmit={s.handleCreateTobacco}>
            <label className="ed-field"><span>Крепость</span><input value={s.tobaccoForm.strength} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, strength: event.target.value }))} /></label>
            <label className="ed-field"><span>Бренд</span><input value={s.tobaccoForm.brand} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, brand: event.target.value }))} /></label>
            <label className="ed-field"><span>Аромат</span><input value={s.tobaccoForm.flavorName} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, flavorName: event.target.value }))} /></label>
            <label className="ed-field"><span>Описание</span><textarea rows={3} value={s.tobaccoForm.description} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <button type="submit" className="ed-button" disabled={s.tobaccoBusy}>{s.tobaccoBusy ? 'Сохраняю...' : s.editingTobaccoId != null ? 'Сохранить' : 'Добавить'}</button>
          </form>
        </Paper>
      ) : null}

      {s.createOrderOpen ? (
        <Paper title="Создание заказа" note="Время и кальяны берутся из текущего расчёта" onClose={() => s.setCreateOrderOpen(false)} wide>
          <form className="ed-form ed-form-2" onSubmit={s.handleCreateOrder}>
            <label className="ed-field ed-span"><span>Поиск заказчика</span><input placeholder="компания, контакт или телефон" value={s.orderCompanyQuery} onChange={(event) => s.setOrderCompanyQuery(event.target.value)} /></label>
            {s.orderCompanyResults.length > 0 ? (
              <ul className="ed-suggest ed-span">
                {s.orderCompanyResults.map((company) => (
                  <li key={company.id}><button type="button" onClick={() => s.applyCompanyToOrder(company)}>{company.name} <em>{company.contact_name || 'контакт не указан'}</em></button></li>
                ))}
              </ul>
            ) : null}
            <label className="ed-field"><span>Компания</span><input value={s.orderCustomerForm.companyName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
            <label className="ed-field"><span>Адрес</span><input value={s.orderCustomerForm.companyAddress} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyAddress: event.target.value }))} /></label>
            <label className="ed-field"><span>Контактное лицо</span><input value={s.orderCustomerForm.contactName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label className="ed-field"><span>Телефон</span><input value={s.orderCustomerForm.phone} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="ed-field ed-span"><span>Локация мероприятия</span><input type="text" placeholder="адрес или площадка" value={s.calculator.location} onChange={s.handleLocationChange} /></label>
            <label className="ed-field ed-span"><span>Комментарий</span><textarea rows={3} value={s.orderCustomerForm.customerComment} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, customerComment: event.target.value }))} /></label>
            <dl className="ed-facts ed-span">
              <div><dt>Локация</dt><dd>{s.calculator.location || 'не указана'}</dd></div>
              <div><dt>Часы</dt><dd>{formatNumber(s.totalHours)}</dd></div>
              <div><dt>Кальяны</dt><dd>{s.calculator.hookahsCount}</dd></div>
              <div><dt>Итого</dt><dd>{formatCurrency(s.roundedTotal)}</dd></div>
            </dl>
            <button type="submit" className="ed-button ed-span" disabled={s.createOrderBusy}>{s.createOrderBusy ? 'Создаю...' : 'Создать заказ'}</button>
          </form>
        </Paper>
      ) : null}

      {s.preferenceOverlayOpen ? (
        <Paper title={s.preferenceForm.preferenceId ? 'Редактирование предпочтения' : 'Новое предпочтение'} note="Предпочтение сохраняется внутри выбранного гостя" onClose={() => s.setPreferenceOverlayOpen(false)} wide>
          <form className="ed-form ed-form-2" onSubmit={s.handleSavePreference}>
            <label className="ed-field"><span>Гость</span><select required value={s.preferenceForm.guestId} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, guestId: event.target.value }))}><option value="">выберите гостя</option>{s.guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name} · {guest.company_name}</option>)}</select></label>
            <label className="ed-field"><span>Чашка</span><select value={s.preferenceForm.preferredBowl} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferredBowl: event.target.value }))}><option value="">не выбрано</option><option value="turka">турка</option><option value="phunnel">фанел</option></select></label>
            <label className="ed-field"><span>Актуально</span><select value={s.preferenceForm.isActual ? 'yes' : 'no'} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, isActual: event.target.value === 'yes' }))}><option value="yes">да</option><option value="no">нет</option></select></label>
            <label className="ed-field ed-span"><span>Комментарий</span><textarea rows={2} value={s.preferenceForm.preferenceComment} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferenceComment: event.target.value }))} /></label>
            <div className="ed-span">
              <div className="ed-section-head">
                <span className={s.guestPreferenceTotal === 100 ? 'ed-pos' : 'ed-neg'}>Сумма: {s.guestPreferenceTotal}%</span>
                <button type="button" className="ed-link" onClick={s.addGuestPreferenceRow}>+ позиция</button>
              </div>
              {s.preferenceForm.items.map((item, index) => (
                <div key={`pref-${index}`} className="ed-mix-row">
                  <select value={item.tobaccoId} onChange={(event) => s.handleGuestPreferenceChange(index, 'tobaccoId', event.target.value)}>
                    <option value="">выберите табак</option>
                    {s.tobaccoCatalog.map((tobacco) => <option key={tobacco.id} value={tobacco.id}>{tobacco.brand} · {tobacco.flavor_name} · {tobacco.strength}</option>)}
                  </select>
                  <input type="number" min="1" max="100" placeholder="%" value={item.percent} onChange={(event) => s.handleGuestPreferenceChange(index, 'percent', event.target.value)} />
                  <button type="button" className="ed-x" aria-label="Удалить позицию" onClick={() => s.removeGuestPreferenceRow(index)}>×</button>
                </div>
              ))}
            </div>
            <div className="ed-span ed-inline">
              <button type="submit" className="ed-button" disabled={s.preferenceBusy || s.guestPreferenceTotal !== 100}>{s.preferenceBusy ? 'Сохраняю...' : 'Сохранить'}</button>
              <button type="button" className="ed-link" onClick={() => s.resetPreferenceForm(s.preferenceForm.guestId)}>очистить</button>
              {s.preferenceForm.preferenceId ? <button type="button" className="ed-link" onClick={() => { void s.handleDeletePreference(Number(s.preferenceForm.preferenceId)) }}>удалить</button> : null}
            </div>
          </form>
        </Paper>
      ) : null}

      {s.activeOrder ? (
        <Paper
          title={s.activeOrder.company_name}
          note={`${formatDateTime(s.activeOrder.work_ranges[0]?.starts_at || `${s.activeOrder.event_date}T${s.activeOrder.event_time}`)} · ${s.activeOrder.location || 'локация не указана'}`}
          onClose={() => s.setActiveOrderId(null)}
          wide
        >
          <dl className="ed-facts">
            <div><dt>Бюджет</dt><dd>{formatCurrency(s.activeOrder.quoted_total)}</dd></div>
            <div><dt>Расходы</dt><dd>{s.activeOrder.actual_total != null ? formatCurrency(s.activeOrder.actual_total) : '—'}</dd></div>
            <div><dt>Прибыль</dt><dd>{s.activeOrder.actual_profit != null ? formatCurrency(s.activeOrder.actual_profit) : '—'}</dd></div>
            <div><dt>Статус</dt><dd>{s.orderDrafts[s.activeOrder.id] ? formatOrderStatus(s.orderDrafts[s.activeOrder.id].status) : '—'}</dd></div>
          </dl>
          {s.orderDrafts[s.activeOrder.id] ? (
            <div className="ed-form ed-form-2">
              {EXPENSE_FIELDS.map(([field, label]) => (
                <label key={field} className="ed-field">
                  <span>{s.activeOrderBreakdown ? `${label} · смета ${formatCurrency(Number(getOrderExpensePlaceholder(field, s.activeOrderBreakdown)))}` : label}</span>
                  <input type="number" min="0" placeholder={s.activeOrderBreakdown ? getOrderExpensePlaceholder(field, s.activeOrderBreakdown) : ''} value={s.orderDrafts[s.activeOrder!.id][field]} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, field, event.target.value)} />
                </label>
              ))}
              <label className="ed-field ed-span"><span>Комментарий к доп. расходам</span><textarea rows={2} value={s.orderDrafts[s.activeOrder.id].extra_expense_comment} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'extra_expense_comment', event.target.value)} /></label>
              <label className="ed-field"><span>Статус</span><select value={s.orderDrafts[s.activeOrder.id].status} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'status', event.target.value)}><option value="draft">черновик</option><option value="confirmed">подтверждён</option><option value="completed">завершён</option><option value="cancelled">отменён</option></select></label>
              <div className="ed-span ed-inline">
                <button type="button" className="ed-button" onClick={() => s.handleSaveOrderExpenses(s.activeOrder!.id)}>Сохранить расходы</button>
                <button type="button" className="ed-link" onClick={() => { void s.handleDeleteOrder(s.activeOrder!.id) }}>удалить заказ</button>
              </div>
            </div>
          ) : null}
        </Paper>
      ) : null}
    </div>
  )
}
