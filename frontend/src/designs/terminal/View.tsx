// Дизайн «Terminal»: моноширинный шрифт, тёмный фон, плотные строки и рамки
// с врезанным заголовком (fieldset/legend) — вид торговой панели. Максимум
// данных на экран: смета и все реестры читаются без прокрутки взглядом.

import DatePicker from 'react-datepicker'
import { ru } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import './terminal.css'
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
  ['companies', 'companies'],
  ['guests', 'guests'],
  ['tobacco', 'catalog'],
  ['orders', 'orders'],
  ['pricing', 'config'],
]

const WAREHOUSE_NAV: Array<[AdminTab, string]> = [
  ['inventory', 'inventory'],
  ['receipts', 'receipt'],
  ['writeoffs', 'writeoff'],
  ['stock', 'balance'],
]

const EXPENSE_FIELDS = [
  ['fuel_expense', 'FUEL'],
  ['consumables_expense', 'SUPPLY'],
  ['coal_expense', 'COAL'],
  ['tobacco_expense', 'TOBACCO'],
  ['labor_expense', 'LABOR'],
  ['extra_expense', 'EXTRA'],
] as const

function Win({ title, onClose, wide, children }: {
  title: string
  onClose: () => void
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="tm-backdrop no-print" data-html2canvas-ignore="true">
      <div className={wide ? 'tm-win tm-win-wide' : 'tm-win'}>
        <div className="tm-win-bar">
          <span>{title}</span>
          <button type="button" onClick={onClose} aria-label="Закрыть">[x]</button>
        </div>
        <div className="tm-win-body">{children}</div>
      </div>
    </div>
  )
}

export default function TerminalView({ s }: { s: SparrowApi }) {
  const rows: Array<[string, string, number]> = [
    ['FUEL', 'выезд на площадку', s.breakdown.fuelCost],
    ['SUPPLY', 'полотенца/фольга/расходники', s.breakdown.consumablesCost],
    [
      'COAL',
      `${formatNumber(s.pricing.coalPrice)}*${formatNumber(s.pricing.coalsPerHookahSession)}*${formatNumber(s.pricing.hookahHourFactor)}*${formatNumber(s.totalHours)}*${s.calculator.hookahsCount}`,
      s.breakdown.coalCost,
    ],
    [
      'TOBACCO',
      `${formatNumber(s.pricing.tobaccoPricePerGram)}*${formatNumber(s.pricing.tobaccoGramsPerHookah)}*${formatNumber(s.pricing.hookahHourFactor)}*${formatNumber(s.totalHours)}*${s.calculator.hookahsCount}`,
      s.breakdown.tobaccoCost,
    ],
    ['MASTER', `${formatNumber(s.pricing.masterHourRate)}*${formatNumber(s.totalHours)}`, s.breakdown.masterCost],
    [
      'MASTER+',
      s.breakdown.extraMasterCost > 0 ? `${formatNumber(s.pricing.masterHourRate)}*${formatNumber(s.totalHours)}` : 'not required',
      s.breakdown.extraMasterCost,
    ],
    [
      'SERVICE',
      s.calculator.hookahsCount > s.pricing.additionalMasterThreshold
        ? `hookahs > ${s.pricing.additionalMasterThreshold}`
        : `hookahs <= ${s.pricing.additionalMasterThreshold}`,
      s.breakdown.serviceFee,
    ],
  ]

  const renderDocRow = (doc: StockDocument) => {
    const grams = doc.lines.reduce((total, line) => total + line.grams, 0)
    const priced = doc.lines.filter((line) => line.cost_per_gram != null)
    const value = priced.reduce((total, line) => total + line.grams * (line.cost_per_gram ?? 0), 0)
    return (
      <div key={doc.id} className="tm-tr tm-tr-doc">
        <button type="button" className="tm-tr-main" onClick={() => s.openDocumentForEdit(doc)}>
          <span className={doc.kind === 'receipt' ? 'tm-ok' : 'tm-warn'}>{doc.kind === 'receipt' ? 'IN ' : 'OUT'} #{doc.id}</span>
          <span className="tm-dim">{formatDateTime(doc.created_at)}</span>
          <span className="tm-dim">{doc.inventory_session_id != null ? `inv#${doc.inventory_session_id}` : ''}{doc.comment ? ` ${doc.comment}` : ''}</span>
          <span className="tm-num">{formatPositions(doc.lines.length)}</span>
          <span className="tm-num">{doc.kind === 'receipt' ? '+' : '-'}{formatNumber(grams)} г</span>
          <span className="tm-num">{doc.kind === 'receipt' ? (priced.length === 0 ? '—' : `${priced.length < doc.lines.length ? '~' : ''}${formatCurrency(value)}`) : ''}</span>
        </button>
        <button type="button" className="tm-x" aria-label="Удалить документ" onClick={() => s.deleteDocument(doc.id)}>del</button>
      </div>
    )
  }

  const renderDocPage = (kind: DocKind) => {
    const label = kind === 'receipt' ? 'RECEIPT' : 'WRITEOFF'
    const grams = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0), 0)
    const value = s.saLines.reduce((total, line) => total + (Number(line.grams) || 0) * (Number(line.cost) || 0), 0)
    return (
      <fieldset className="tm-box">
        <legend>{s.saDocId != null ? `${label} #${s.saDocId}` : `${label} / NEW`}</legend>
        <div className="tm-bar">
          <button type="button" className="tm-btn" onClick={s.cancelDoc}>{s.saSessionId != null ? '&lt; inventory' : '&lt; list'}</button>
          <span className="tm-dim">
            {s.saCreatedAt ? `${formatDateTime(s.saCreatedAt)} · ` : ''}
            {s.saSessionId != null ? `inv#${s.saSessionId} · ` : ''}
            {formatPositions(s.saLines.length)} · {kind === 'receipt' ? '+' : '-'}{formatNumber(grams)} г
            {kind === 'receipt' && value > 0 ? ` · ${formatCurrency(value)}` : ''}
          </span>
          <span className="tm-bar-end">
            {s.saDocId != null ? <button type="button" className="tm-btn" onClick={() => s.deleteDocument(s.saDocId!)}>delete</button> : null}
            <button type="button" className="tm-btn tm-btn-go" disabled={s.saBusy} onClick={s.submitStandaloneDoc}>{s.saBusy ? '...' : s.saDocId != null ? 'save' : 'commit'}</button>
          </span>
        </div>

        <label className="tm-field"><span>comment</span><input value={s.saComment} onChange={(event) => s.setSaComment(event.target.value)} /></label>
        <label className="tm-field"><span>add</span><input placeholder="brand / flavor" value={s.saQuery} onChange={(event) => s.setSaQuery(event.target.value)} /></label>
        {s.saSearchResults.length > 0 ? (
          <div className="tm-hits">
            {s.saSearchResults.map((item) => (
              <button key={item.id} type="button" onClick={() => s.addStandaloneLine(item)}>
                {item.brand} / {item.flavor_name} <span className="tm-dim">{item.strength}</span>
              </button>
            ))}
          </div>
        ) : null}

        {s.saLines.length > 0 ? (
          <div className={kind === 'receipt' ? 'tm-grid tm-grid-doc-cost' : 'tm-grid tm-grid-doc'}>
            <div className="tm-tr tm-th"><span>position</span><span>grams</span>{kind === 'receipt' ? <span>rub/g</span> : null}<span /></div>
            {s.saLines.map((line, index) => (
              <div key={line.tobaccoId} className="tm-tr">
                <span>{line.label}</span>
                <input type="number" min="0" step="0.1" inputMode="decimal" value={line.grams} onChange={(event) => s.updateStandaloneLine(index, 'grams', event.target.value)} />
                {kind === 'receipt' ? <input type="number" min="0" step="0.01" inputMode="decimal" value={line.cost} onChange={(event) => s.updateStandaloneLine(index, 'cost', event.target.value)} /> : null}
                <button type="button" className="tm-x" aria-label="Убрать позицию" onClick={() => s.removeStandaloneLine(index)}>del</button>
              </div>
            ))}
          </div>
        ) : <p className="tm-dim">no lines — use search above</p>}
      </fieldset>
    )
  }

  const renderDocTab = (kind: DocKind) => {
    if (s.saKind === kind) {
      return renderDocPage(kind)
    }
    const label = kind === 'receipt' ? 'RECEIPT' : 'WRITEOFF'
    const list = s.stockDocuments.filter((doc) => doc.kind === kind)
    return (
      <fieldset className="tm-box">
        <legend>{label} / LIST</legend>
        <div className="tm-bar">
          <span className="tm-dim">{list.length} документов · себестоимость {kind === 'receipt' ? 'вводится в документе' : 'из последнего прихода'}</span>
          <span className="tm-bar-end"><button type="button" className="tm-btn tm-btn-go" onClick={() => s.openStandaloneDoc(kind)}>new</button></span>
        </div>
        {list.length > 0 ? <div className="tm-grid tm-grid-docs">{list.map(renderDocRow)}</div> : <p className="tm-dim">empty</p>}
      </fieldset>
    )
  }

  return (
    <div className="tm-root">
      <header className="tm-status no-print" data-html2canvas-ignore="true">
        <span className="tm-status-name">SPARROW<span className="tm-dim">/quote</span></span>
        <span className="tm-dim">hookahs={s.calculator.hookahsCount} hours={formatNumber(s.totalHours)} shifts={s.workRanges.length}</span>
        <span className="tm-status-end">
          <span className={s.adminUser ? 'tm-ok' : 'tm-dim'}>{s.adminUser ? `auth:${s.adminUser.login}` : 'auth:none'}</span>
          <button type="button" className="tm-btn" onClick={s.openAdminOrAuth}>{s.adminUser ? 'admin' : 'login'}</button>
        </span>
      </header>

      {s.notice ? (
        <div className={`tm-notice ${s.noticeTone === 'error' ? 'tm-notice-err' : ''} no-print`} data-html2canvas-ignore="true">
          {s.noticeTone === 'error' ? 'ERR ' : 'MSG '}{s.notice}
        </div>
      ) : null}

      <main className="tm-quote">
        <fieldset className="tm-box">
          <legend>INPUT</legend>
          <div className="tm-grid tm-grid-shift">
            <div className="tm-tr tm-th"><span>#</span><span>start</span><span>end</span><span /></div>
            {s.workRanges.map((workRange, index) => (
              <div key={workRange.id} className="tm-tr">
                <span className="tm-dim">{String(index + 1).padStart(2, '0')}</span>
                <DatePicker selected={workRange.start} onChange={s.handleWorkRangeChange(workRange.id, 'start')} selectsStart startDate={workRange.start} endDate={workRange.end} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" calendarClassName="tm-cal" popperClassName="tm-cal-popper" />
                <DatePicker selected={workRange.end} onChange={s.handleWorkRangeChange(workRange.id, 'end')} selectsEnd startDate={workRange.start} endDate={workRange.end} minDate={workRange.start} showTimeSelect timeIntervals={30} locale={ru} dateFormat="dd.MM.yyyy HH:mm" timeFormat="HH:mm" calendarClassName="tm-cal" popperClassName="tm-cal-popper" />
                {index > 0 ? (
                  <button type="button" className="tm-x" aria-label="Удалить смену" onClick={() => s.handleRemoveWorkRange(workRange.id)}>del</button>
                ) : <span />}
              </div>
            ))}
          </div>
          <div className="tm-bar">
            <button type="button" className="tm-btn" onClick={s.handleAddWorkRange}>+ shift</button>
            <label className="tm-field tm-field-inline">
              <span>hookahs</span>
              <input aria-label="Количество кальянов" type="number" min="1" max="30" value={s.calculator.hookahsCount} onChange={s.handleNumberChange('hookahsCount')} />
            </label>
            <span className="tm-bar-end tm-num">total {formatNumber(s.totalHours)} h</span>
          </div>
        </fieldset>

        <fieldset className="tm-box">
          <legend>BREAKDOWN</legend>
          <div className="tm-grid tm-grid-break">
            <div className="tm-tr tm-th"><span>item</span><span>formula</span><span>amount</span></div>
            {rows.map(([label, formula, value]) => (
              <div key={label} className="tm-tr">
                <span className="tm-key">{label}</span>
                <span className="tm-dim">{formula}</span>
                <span className="tm-num">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="tm-tr tm-tr-sub">
              <span className="tm-key">SUBTOTAL</span>
              <span className="tm-dim">до округления</span>
              <span className="tm-num">{formatCurrency(s.breakdown.total)}</span>
            </div>
          </div>

          <div className="tm-total">
            <span>TOTAL</span>
            <strong>{formatCurrency(s.roundedTotal)}</strong>
          </div>

          <div className="tm-consts">
            {s.variableItems.map((item) => <span key={item}>{item}</span>)}
          </div>

          <div className="tm-bar no-print" data-html2canvas-ignore="true">
            <span className="tm-bar-end">
              <button type="button" className="tm-btn tm-btn-go" onClick={() => s.handleDownloadPdf({ selector: '.tm-quote', background: '#0b0d10' })}>export pdf</button>
            </span>
          </div>
        </fieldset>
      </main>

      {s.adminUser && s.adminPanelOpen ? (
        <div className="tm-admin no-print" data-html2canvas-ignore="true">
          <div className="tm-admin-bar">
            <span className="tm-status-name">SPARROW<span className="tm-dim">/admin</span></span>
            <span className="tm-dim">{s.adminUser.full_name} · {s.adminUser.login}</span>
            <span className="tm-bar-end">
              <button type="button" className="tm-btn tm-btn-go" onClick={s.openCreateOrder}>order from quote</button>
              <button type="button" className="tm-btn" onClick={s.handleLogout}>logout</button>
              <button type="button" className="tm-btn" onClick={() => s.setAdminPanelOpen(false)}>[x]</button>
            </span>
          </div>

          <div className="tm-admin-body">
            <nav className="tm-modules">
              {NAV.map(([tab, label], index) => (
                <button key={tab} type="button" className={s.adminTab === tab ? 'tm-mod tm-mod-on' : 'tm-mod'} onClick={() => s.goTab(tab)}>
                  <span className="tm-dim">[{index + 1}]</span> {label}
                </button>
              ))}
              <button type="button" className={s.warehouseActive ? 'tm-mod tm-mod-on' : 'tm-mod'} onClick={() => s.goTab(s.lastWarehouse)}>
                <span className="tm-dim">[6]</span> stock
              </button>
              {s.warehouseActive ? (
                <div className="tm-submods">
                  {WAREHOUSE_NAV.map(([tab, label]) => (
                    <button key={tab} type="button" className={s.adminTab === tab ? 'tm-submod tm-submod-on' : 'tm-submod'} onClick={() => s.goTab(tab)}>
                      {s.adminTab === tab ? '>' : ' '} {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </nav>

            <div className="tm-pane">
              {s.adminTab === 'companies' ? (
                <fieldset className="tm-box">
                  <legend>COMPANIES</legend>
                  <div className="tm-bar">
                    <input className="tm-search" placeholder="filter…" value={s.companyQuery} onChange={async (event) => { const value = event.target.value; s.setCompanyQuery(value); if (s.adminUser) { try { await s.loadCompanies(value) } catch { /* тихо: подсказки поиска не критичны */ } } }} />
                    <span className="tm-bar-end"><button type="button" className="tm-btn tm-btn-go" onClick={s.openCreateCompany}>new</button></span>
                  </div>
                  <div className="tm-grid tm-grid-company">
                    <div className="tm-tr tm-th"><span>name</span><span>address</span><span>contact</span><span>phone</span></div>
                    {s.companies.map((company) => (
                      <button key={company.id} type="button" className="tm-tr tm-tr-click" onClick={() => s.startEditingCompany(company)}>
                        <span className="tm-key">{company.name}</span>
                        <span className="tm-dim">{company.address || '—'}</span>
                        <span>{company.contact_name || '—'}</span>
                        <span className="tm-num">{company.phone || '—'}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {s.adminTab === 'guests' ? (
                <fieldset className="tm-box">
                  <legend>GUESTS</legend>
                  <div className="tm-bar">
                    <input className="tm-search" placeholder="filter…" value={s.guestQuery} onChange={(event) => s.setGuestQuery(event.target.value)} />
                    <span className="tm-bar-end"><button type="button" className="tm-btn tm-btn-go" onClick={s.openCreateGuest}>new</button></span>
                  </div>
                  <div className="tm-grid tm-grid-guest">
                    <div className="tm-tr tm-th"><span>guest</span><span>company</span><span>phone</span><span>birth</span><span>prefs</span></div>
                    {s.filteredGuests.map((guest) => (
                      <div key={guest.id} className="tm-tr">
                        <button type="button" className="tm-key tm-linkish" onClick={() => s.startEditingGuest(guest)}>{guest.full_name}</button>
                        <span className="tm-dim">{guest.company_name}</span>
                        <span className="tm-num">{guest.phone || '—'}</span>
                        <span className="tm-dim">{guest.birth_date ? formatBirthDate(guest.birth_date) : '—'}</span>
                        <span className="tm-prefs">
                          {guest.preferences.map((preference) => (
                            <button key={preference.id} type="button" className={preference.is_actual ? 'tm-pref tm-ok' : 'tm-pref tm-dim'} onClick={() => s.startEditingPreference(guest.id, preference)}>
                              {preference.preferred_bowl === 'turka' ? 'turka' : preference.preferred_bowl === 'phunnel' ? 'phunnel' : 'bowl?'}:{preference.items.map((item) => `${item.tobacco.flavor_name} ${item.percent}%`).join('/')}
                            </button>
                          ))}
                          <button type="button" className="tm-pref tm-btn-go-text" onClick={() => s.openPreferenceOverlay(guest.id.toString())}>+add</button>
                        </span>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {s.adminTab === 'tobacco' ? (
                <fieldset className="tm-box">
                  <legend>CATALOG</legend>
                  <div className="tm-bar">
                    <input className="tm-search" placeholder="filter…" value={s.tobaccoQuery} onChange={(event) => s.setTobaccoQuery(event.target.value)} />
                    <span className="tm-bar-end"><button type="button" className="tm-btn tm-btn-go" onClick={s.openCreateTobacco}>new</button></span>
                  </div>
                  <div className="tm-split">
                    <nav className="tm-brands">
                      <button type="button" className={s.catalogBrand === '' ? 'tm-brand tm-brand-on' : 'tm-brand'} onClick={() => s.setCatalogBrand('')}>
                        <span>*</span><span>all</span><span className="tm-num">{s.filteredTobacco.length}</span>
                      </button>
                      {s.catalogBrands.map((brand) => (
                        <button key={brand} type="button" className={s.catalogBrand === brand ? 'tm-brand tm-brand-on' : 'tm-brand'} onClick={() => s.setCatalogBrand(brand)}>
                          <span>{s.catalogBrand === brand ? '>' : ' '}</span><span>{brand}</span><span className="tm-num">{s.catalogBrandCounts.get(brand)}</span>
                        </button>
                      ))}
                    </nav>
                    <div className="tm-grid tm-grid-flavor">
                      <div className="tm-tr tm-th"><span>flavor</span><span>strength</span><span>note</span></div>
                      {s.catalogItems.length > 0 ? s.catalogItems.map((item) => (
                        <button key={item.id} type="button" className="tm-tr tm-tr-click" onClick={() => s.startEditingTobacco(item)}>
                          <span className="tm-key">{s.catalogBrand ? item.flavor_name : `${item.brand} / ${item.flavor_name}`}</span>
                          <span>{item.strength}</span>
                          <span className="tm-dim">{item.description || '—'}</span>
                        </button>
                      )) : <p className="tm-dim">no matches</p>}
                    </div>
                  </div>
                </fieldset>
              ) : null}

              {s.adminTab === 'inventory' ? (
                s.activeInventory ? (
                  <fieldset className="tm-box">
                    <legend>INVENTORY #{s.activeInventory.id}</legend>
                    <div className="tm-bar">
                      <button type="button" className="tm-btn" onClick={() => s.setActiveInventory(null)}>&lt; list</button>
                      <span className="tm-dim">{formatPositions(s.activeInventory.lines.length)}</span>
                      {s.activeInventory.lines.length > 0 ? (
                        <span className="tm-bar-end">
                          <button type="button" className="tm-btn tm-btn-go" disabled={s.inventoryBusy} onClick={s.saveInventory}>{s.inventoryBusy ? '...' : 'save'}</button>
                          <button type="button" className="tm-btn" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('writeoff')}>writeoff &gt;</button>
                          <button type="button" className="tm-btn" disabled={s.inventoryBusy} onClick={() => s.startDocFromInventory('receipt')}>receipt &gt;</button>
                        </span>
                      ) : null}
                    </div>

                    <label className="tm-field"><span>add</span><input placeholder="brand / flavor" value={s.sessionQuery} onChange={(event) => s.setSessionQuery(event.target.value)} /></label>
                    {s.sessionSearchResults.length > 0 ? (
                      <div className="tm-hits">
                        {s.sessionSearchResults.map((item) => (
                          <button key={item.id} type="button" onClick={() => s.addInventoryPosition(item.id)}>
                            {item.brand} / {item.flavor_name} <span className="tm-dim">{item.strength}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <div className="tm-bar">
                        <label className="tm-field tm-field-inline"><span>tare all</span><input type="number" min="0" step="0.1" inputMode="decimal" value={s.tareAll} onChange={(event) => s.setTareAll(event.target.value)} /></label>
                        <button type="button" className="tm-btn" onClick={s.applyTareToAll}>apply</button>
                      </div>
                    ) : null}

                    {s.activeInventory.lines.length > 0 ? (
                      <div className="tm-grid tm-grid-inv">
                        <div className="tm-tr tm-th"><span>position</span><span>book</span><span>mode</span><span>measure</span><span>fact</span><span>diff</span><span /></div>
                        {s.activeInventory.lines.map((line) => {
                          const draft = s.lineDrafts[line.id] ?? s.DEFAULT_LINE_DRAFT
                          const counted = s.draftCounted(draft)
                          const diff = counted != null ? counted - line.expected_grams : null
                          return (
                            <div key={line.id} className="tm-tr">
                              <span className="tm-key">{line.brand} / {line.flavor_name} <span className="tm-dim">{line.strength}</span></span>
                              <span className="tm-num">{formatNumber(line.expected_grams)}</span>
                              <span className="tm-modes">
                                <button type="button" className={draft.mode === 'net' ? 'tm-mode tm-mode-on' : 'tm-mode'} onClick={() => s.setLineMode(line.id, 'net')}>net</button>
                                <button type="button" className={draft.mode === 'gross' ? 'tm-mode tm-mode-on' : 'tm-mode'} onClick={() => s.setLineMode(line.id, 'gross')}>gross</button>
                              </span>
                              {draft.mode === 'net' ? (
                                <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="net" value={draft.net} onChange={(event) => s.updateLineDraft(line.id, 'net', event.target.value)} />
                              ) : (
                                <span className="tm-pair">
                                  <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="tare" value={draft.tare} onChange={(event) => s.updateLineDraft(line.id, 'tare', event.target.value)} />
                                  <input type="number" min="0" step="0.1" inputMode="decimal" placeholder="gross" value={draft.gross} onChange={(event) => s.updateLineDraft(line.id, 'gross', event.target.value)} />
                                </span>
                              )}
                              <span className="tm-num">{counted == null ? '—' : formatNumber(counted)}</span>
                              <span className={diff == null ? 'tm-num tm-dim' : diff < 0 ? 'tm-num tm-err' : diff > 0 ? 'tm-num tm-ok' : 'tm-num'}>{diff == null ? '—' : `${diff > 0 ? '+' : ''}${formatNumber(diff)}`}</span>
                              <button type="button" className="tm-x" aria-label="Убрать позицию" onClick={() => s.removeInventoryLine(line.id)}>del</button>
                            </div>
                          )
                        })}
                      </div>
                    ) : <p className="tm-dim">no lines — use search above</p>}

                    {s.activeInventory.documents.length > 0 ? (
                      <>
                        <div className="tm-subtitle">linked documents</div>
                        <div className="tm-grid tm-grid-docs">{s.activeInventory.documents.map(renderDocRow)}</div>
                      </>
                    ) : null}
                  </fieldset>
                ) : (
                  <fieldset className="tm-box">
                    <legend>INVENTORY / LIST</legend>
                    <div className="tm-bar">
                      <span className="tm-dim">{s.inventories.length} сессий</span>
                      <span className="tm-bar-end"><button type="button" className="tm-btn tm-btn-go" disabled={s.inventoryBusy} onClick={s.startInventory}>new</button></span>
                    </div>
                    {s.inventories.length > 0 ? (
                      <div className="tm-grid tm-grid-docs">
                        {s.inventories.map((session) => (
                          <div key={session.id} className="tm-tr tm-tr-doc">
                            <button type="button" className="tm-tr-main" onClick={() => s.openInventory(session.id)}>
                              <span className="tm-key">INV #{session.id}</span>
                              <span className="tm-dim">{formatDateTime(session.created_at)}</span>
                              <span className="tm-dim">{session.status}</span>
                              <span className="tm-num">{formatPositions(session.lines_total)}</span>
                              <span className="tm-num">fact {session.lines_counted}</span>
                              <span className={session.diff_total < 0 ? 'tm-num tm-err' : session.diff_total > 0 ? 'tm-num tm-ok' : 'tm-num'}>
                                {session.lines_counted > 0 ? `${session.diff_total > 0 ? '+' : ''}${formatNumber(session.diff_total)} г` : ''}
                              </span>
                            </button>
                            <button type="button" className="tm-x" aria-label="Удалить инвентаризацию" onClick={() => s.removeInventory(session.id)}>del</button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="tm-dim">empty</p>}
                  </fieldset>
                )
              ) : null}

              {s.adminTab === 'receipts' ? renderDocTab('receipt') : null}
              {s.adminTab === 'writeoffs' ? renderDocTab('writeoff') : null}

              {s.adminTab === 'stock' ? (
                <fieldset className="tm-box">
                  <legend>BALANCE</legend>
                  <div className="tm-bar">
                    <select className="tm-search" value={s.stockBrand} onChange={(event) => s.setStockBrand(event.target.value)}>
                      <option value="">brand: all</option>
                      {s.tobaccoBrands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
                    </select>
                    <select className="tm-search" value={s.stockStrength} onChange={(event) => s.setStockStrength(event.target.value)}>
                      <option value="">strength: all</option>
                      {s.tobaccoStrengths.map((strength) => <option key={strength} value={strength}>{strength}</option>)}
                    </select>
                    <span className="tm-bar-end tm-num">{s.filteredStock.length} pos · {formatCurrency(s.stockValueTotal)}</span>
                  </div>
                  <div className="tm-grid tm-grid-stock">
                    <div className="tm-tr tm-th"><span>position</span><span>strength</span><span>grams</span><span>rub/g</span><span>value</span></div>
                    {s.filteredStock.map((item) => (
                      <div key={item.tobacco_id} className="tm-tr">
                        <span className="tm-key">{item.brand} / {item.flavor_name}</span>
                        <span className="tm-dim">{item.strength}</span>
                        <span className="tm-num">{formatNumber(item.balance_grams)}</span>
                        <span className={item.cost_per_gram != null ? 'tm-num' : 'tm-num tm-dim'}>{item.cost_per_gram != null ? formatNumber(item.cost_per_gram) : '—'}</span>
                        <span className={item.stock_value != null ? 'tm-num' : 'tm-num tm-dim'}>{item.stock_value != null ? formatCurrency(item.stock_value) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {s.adminTab === 'orders' ? (
                <fieldset className="tm-box">
                  <legend>ORDERS</legend>
                  <div className="tm-grid tm-grid-order">
                    <div className="tm-tr tm-th"><span>customer</span><span>date</span><span>quoted</span><span>actual</span><span>profit</span></div>
                    {s.orders.map((order) => (
                      <button key={order.id} type="button" className="tm-tr tm-tr-click" onClick={() => s.openOrderOverlay(order.id)}>
                        <span className="tm-key">{order.company_name} <span className="tm-dim">{order.location || 'no location'}</span></span>
                        <span className="tm-dim">{formatDateTime(order.work_ranges[0]?.starts_at || `${order.event_date}T${order.event_time}`)}</span>
                        <span className="tm-num">{formatCurrency(order.quoted_total)}</span>
                        <span className={order.actual_total != null ? 'tm-num' : 'tm-num tm-dim'}>{order.actual_total != null ? formatCurrency(order.actual_total) : '—'}</span>
                        <span className={order.actual_profit == null ? 'tm-num tm-dim' : order.actual_profit >= 0 ? 'tm-num tm-ok' : 'tm-num tm-err'}>{order.actual_profit != null ? formatCurrency(order.actual_profit) : '—'}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {s.adminTab === 'pricing' ? (
                <fieldset className="tm-box">
                  <legend>CONFIG</legend>
                  <form className="tm-form" onSubmit={s.handleSavePricing}>
                    <label className="tm-field"><span>master_hour_rate</span><input type="number" min="0" step="100" value={s.pricingForm.masterHourRate} onChange={s.handlePricingFieldChange('masterHourRate')} /></label>
                    <label className="tm-field"><span>tobacco_price_per_gram</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoPricePerGram} onChange={s.handlePricingFieldChange('tobaccoPricePerGram')} /></label>
                    <label className="tm-field"><span>coal_price</span><input type="number" min="0" step="0.1" value={s.pricingForm.coalPrice} onChange={s.handlePricingFieldChange('coalPrice')} /></label>
                    <label className="tm-field"><span>hookah_hour_factor</span><input type="number" min="0" step="0.1" value={s.pricingForm.hookahHourFactor} onChange={s.handlePricingFieldChange('hookahHourFactor')} /></label>
                    <label className="tm-field"><span>coals_per_hookah_session</span><input type="number" min="0" step="1" value={s.pricingForm.coalsPerHookahSession} onChange={s.handlePricingFieldChange('coalsPerHookahSession')} /></label>
                    <label className="tm-field"><span>tobacco_grams_per_hookah</span><input type="number" min="0" step="0.1" value={s.pricingForm.tobaccoGramsPerHookah} onChange={s.handlePricingFieldChange('tobaccoGramsPerHookah')} /></label>
                    <button type="submit" className="tm-btn tm-btn-go" disabled={s.pricingBusy}>{s.pricingBusy ? '...' : 'write config'}</button>
                  </form>
                </fieldset>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {s.authOpen ? (
        <Win title={s.bootstrapStatus?.needs_admin ? 'BOOTSTRAP ADMIN' : 'LOGIN'} onClose={() => s.setAuthOpen(false)}>
          {s.bootstrapStatus?.needs_admin ? (
            <form className="tm-form" onSubmit={s.handleBootstrapAdmin}>
              <label className="tm-field"><span>full_name</span><input value={s.bootstrapForm.fullName} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
              <label className="tm-field"><span>login</span><input value={s.bootstrapForm.login} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label className="tm-field"><span>password</span><input type="password" value={s.bootstrapForm.password} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, password: event.target.value }))} /></label>
              <label className="tm-field"><span>FIRST_ADMIN_PASS</span><input type="password" value={s.bootstrapForm.adminSecret} onChange={(event) => s.setBootstrapForm((current) => ({ ...current, adminSecret: event.target.value }))} /></label>
              {s.bootstrapStatus.secret_configured ? null : <p className="tm-err">FIRST_ADMIN_PASS не настроен в окружении backend</p>}
              {s.authError ? <p className="tm-err">{s.authError}</p> : null}
              <button type="submit" className="tm-btn tm-btn-go" disabled={s.authBusy || s.bootstrapStatus.secret_configured === false}>{s.authBusy ? '...' : 'create'}</button>
            </form>
          ) : (
            <form className="tm-form" onSubmit={s.handleLogin}>
              <label className="tm-field"><span>login</span><input value={s.authForm.login} onChange={(event) => s.setAuthForm((current) => ({ ...current, login: event.target.value }))} /></label>
              <label className="tm-field"><span>password</span><input type="password" value={s.authForm.password} onChange={(event) => s.setAuthForm((current) => ({ ...current, password: event.target.value }))} /></label>
              {s.authError ? <p className="tm-err">{s.authError}</p> : null}
              <button type="submit" className="tm-btn tm-btn-go" disabled={s.authBusy}>{s.authBusy ? '...' : 'auth'}</button>
            </form>
          )}
        </Win>
      ) : null}

      {s.editorOverlay === 'company' ? (
        <Win title={s.editingCompanyId ? `COMPANY #${s.editingCompanyId}` : 'COMPANY / NEW'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="tm-form tm-form-2" onSubmit={s.handleCreateCompany}>
            <label className="tm-field"><span>name</span><input required value={s.companyForm.name} onChange={(event) => s.setCompanyForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="tm-field"><span>address</span><input value={s.companyForm.address} onChange={(event) => s.setCompanyForm((current) => ({ ...current, address: event.target.value }))} /></label>
            <label className="tm-field"><span>contact</span><input value={s.companyForm.contactName} onChange={(event) => s.setCompanyForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label className="tm-field"><span>phone</span><input value={s.companyForm.phone} onChange={(event) => s.setCompanyForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="tm-field tm-span"><span>comment</span><textarea rows={3} value={s.companyForm.comment} onChange={(event) => s.setCompanyForm((current) => ({ ...current, comment: event.target.value }))} /></label>
            <div className="tm-span tm-bar">
              <button type="submit" className="tm-btn tm-btn-go" disabled={s.companyBusy}>{s.companyBusy ? '...' : 'save'}</button>
              {s.editingCompanyId ? <button type="button" className="tm-btn" onClick={s.resetCompanyForm}>reset</button> : null}
              {s.editingCompanyId ? <button type="button" className="tm-btn" onClick={() => { void s.handleDeleteCompany(s.editingCompanyId!) }}>delete</button> : null}
            </div>
          </form>
        </Win>
      ) : null}

      {s.editorOverlay === 'guest' ? (
        <Win title={s.editingGuestId ? `GUEST #${s.editingGuestId}` : 'GUEST / NEW'} onClose={() => s.setEditorOverlay(null)} wide>
          <form className="tm-form tm-form-2" onSubmit={s.handleCreateGuest}>
            <label className="tm-field"><span>company</span><select required value={s.guestForm.companyId} onChange={(event) => s.setGuestForm((current) => ({ ...current, companyId: event.target.value }))}><option value="">—</option>{s.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
            <label className="tm-field"><span>full_name</span><input required value={s.guestForm.fullName} onChange={(event) => s.setGuestForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
            <label className="tm-field"><span>phone</span><input value={s.guestForm.phone} onChange={(event) => s.setGuestForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="tm-field"><span>birth_date</span><input type="date" value={s.guestForm.birthDate} onChange={(event) => s.setGuestForm((current) => ({ ...current, birthDate: event.target.value }))} /></label>
            <div className="tm-span tm-bar">
              <button type="submit" className="tm-btn tm-btn-go" disabled={s.guestBusy}>{s.guestBusy ? '...' : 'save'}</button>
              {s.editingGuestId ? <button type="button" className="tm-btn" onClick={() => { void s.handleDeleteGuest(s.editingGuestId!) }}>delete</button> : null}
            </div>
          </form>
        </Win>
      ) : null}

      {s.editorOverlay === 'tobacco' ? (
        <Win title={s.editingTobaccoId != null ? `FLAVOR #${s.editingTobaccoId}` : 'FLAVOR / NEW'} onClose={() => { s.setEditorOverlay(null); s.setEditingTobaccoId(null) }}>
          <form className="tm-form" onSubmit={s.handleCreateTobacco}>
            <label className="tm-field"><span>strength</span><input value={s.tobaccoForm.strength} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, strength: event.target.value }))} /></label>
            <label className="tm-field"><span>brand</span><input value={s.tobaccoForm.brand} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, brand: event.target.value }))} /></label>
            <label className="tm-field"><span>flavor_name</span><input value={s.tobaccoForm.flavorName} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, flavorName: event.target.value }))} /></label>
            <label className="tm-field"><span>description</span><textarea rows={3} value={s.tobaccoForm.description} onChange={(event) => s.setTobaccoForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <button type="submit" className="tm-btn tm-btn-go" disabled={s.tobaccoBusy}>{s.tobaccoBusy ? '...' : 'save'}</button>
          </form>
        </Win>
      ) : null}

      {s.createOrderOpen ? (
        <Win title="ORDER / NEW" onClose={() => s.setCreateOrderOpen(false)} wide>
          <form className="tm-form tm-form-2" onSubmit={s.handleCreateOrder}>
            <label className="tm-field tm-span"><span>search customer</span><input placeholder="company / contact / phone" value={s.orderCompanyQuery} onChange={(event) => s.setOrderCompanyQuery(event.target.value)} /></label>
            {s.orderCompanyResults.length > 0 ? (
              <div className="tm-hits tm-span">
                {s.orderCompanyResults.map((company) => (
                  <button key={company.id} type="button" onClick={() => s.applyCompanyToOrder(company)}>
                    {company.name} <span className="tm-dim">{company.contact_name || 'no contact'}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <label className="tm-field"><span>company</span><input value={s.orderCustomerForm.companyName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyName: event.target.value }))} /></label>
            <label className="tm-field"><span>address</span><input value={s.orderCustomerForm.companyAddress} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, companyAddress: event.target.value }))} /></label>
            <label className="tm-field"><span>contact</span><input value={s.orderCustomerForm.contactName} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, contactName: event.target.value }))} /></label>
            <label className="tm-field"><span>phone</span><input value={s.orderCustomerForm.phone} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="tm-field tm-span"><span>location</span><input type="text" value={s.calculator.location} onChange={s.handleLocationChange} /></label>
            <label className="tm-field tm-span"><span>comment</span><textarea rows={2} value={s.orderCustomerForm.customerComment} onChange={(event) => s.setOrderCustomerForm((current) => ({ ...current, customerComment: event.target.value }))} /></label>
            <div className="tm-kv tm-span">
              <div><span>location</span><b>{s.calculator.location || '—'}</b></div>
              <div><span>hours</span><b>{formatNumber(s.totalHours)}</b></div>
              <div><span>hookahs</span><b>{s.calculator.hookahsCount}</b></div>
              <div><span>total</span><b>{formatCurrency(s.roundedTotal)}</b></div>
            </div>
            <button type="submit" className="tm-btn tm-btn-go tm-span" disabled={s.createOrderBusy}>{s.createOrderBusy ? '...' : 'create order'}</button>
          </form>
        </Win>
      ) : null}

      {s.preferenceOverlayOpen ? (
        <Win title={s.preferenceForm.preferenceId ? `PREFERENCE #${s.preferenceForm.preferenceId}` : 'PREFERENCE / NEW'} onClose={() => s.setPreferenceOverlayOpen(false)} wide>
          <form className="tm-form tm-form-2" onSubmit={s.handleSavePreference}>
            <label className="tm-field"><span>guest</span><select required value={s.preferenceForm.guestId} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, guestId: event.target.value }))}><option value="">—</option>{s.guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name} · {guest.company_name}</option>)}</select></label>
            <label className="tm-field"><span>bowl</span><select value={s.preferenceForm.preferredBowl} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferredBowl: event.target.value }))}><option value="">—</option><option value="turka">turka</option><option value="phunnel">phunnel</option></select></label>
            <label className="tm-field"><span>is_actual</span><select value={s.preferenceForm.isActual ? 'yes' : 'no'} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, isActual: event.target.value === 'yes' }))}><option value="yes">true</option><option value="no">false</option></select></label>
            <label className="tm-field tm-span"><span>comment</span><textarea rows={2} value={s.preferenceForm.preferenceComment} onChange={(event) => s.setPreferenceForm((current) => ({ ...current, preferenceComment: event.target.value }))} /></label>
            <div className="tm-span">
              <div className="tm-bar">
                <span className={s.guestPreferenceTotal === 100 ? 'tm-ok' : 'tm-err'}>sum={s.guestPreferenceTotal}%</span>
                <span className="tm-bar-end"><button type="button" className="tm-btn" onClick={s.addGuestPreferenceRow}>+ row</button></span>
              </div>
              {s.preferenceForm.items.map((item, index) => (
                <div key={`pref-${index}`} className="tm-mix">
                  <select value={item.tobaccoId} onChange={(event) => s.handleGuestPreferenceChange(index, 'tobaccoId', event.target.value)}>
                    <option value="">—</option>
                    {s.tobaccoCatalog.map((tobacco) => <option key={tobacco.id} value={tobacco.id}>{tobacco.brand} · {tobacco.flavor_name} · {tobacco.strength}</option>)}
                  </select>
                  <input type="number" min="1" max="100" placeholder="%" value={item.percent} onChange={(event) => s.handleGuestPreferenceChange(index, 'percent', event.target.value)} />
                  <button type="button" className="tm-x" aria-label="Удалить позицию" onClick={() => s.removeGuestPreferenceRow(index)}>del</button>
                </div>
              ))}
            </div>
            <div className="tm-span tm-bar">
              <button type="submit" className="tm-btn tm-btn-go" disabled={s.preferenceBusy || s.guestPreferenceTotal !== 100}>{s.preferenceBusy ? '...' : 'save'}</button>
              <button type="button" className="tm-btn" onClick={() => s.resetPreferenceForm(s.preferenceForm.guestId)}>clear</button>
              {s.preferenceForm.preferenceId ? <button type="button" className="tm-btn" onClick={() => { void s.handleDeletePreference(Number(s.preferenceForm.preferenceId)) }}>delete</button> : null}
            </div>
          </form>
        </Win>
      ) : null}

      {s.activeOrder ? (
        <Win title={`ORDER #${s.activeOrder.id} · ${s.activeOrder.company_name}`} onClose={() => s.setActiveOrderId(null)} wide>
          <div className="tm-kv">
            <div><span>date</span><b>{formatDateTime(s.activeOrder.work_ranges[0]?.starts_at || `${s.activeOrder.event_date}T${s.activeOrder.event_time}`)}</b></div>
            <div><span>location</span><b>{s.activeOrder.location || '—'}</b></div>
            <div><span>quoted</span><b>{formatCurrency(s.activeOrder.quoted_total)}</b></div>
            <div><span>actual</span><b>{s.activeOrder.actual_total != null ? formatCurrency(s.activeOrder.actual_total) : '—'}</b></div>
            <div><span>profit</span><b>{s.activeOrder.actual_profit != null ? formatCurrency(s.activeOrder.actual_profit) : '—'}</b></div>
            <div><span>status</span><b>{s.orderDrafts[s.activeOrder.id] ? formatOrderStatus(s.orderDrafts[s.activeOrder.id].status) : '—'}</b></div>
          </div>
          {s.orderDrafts[s.activeOrder.id] ? (
            <div className="tm-form tm-form-2">
              {EXPENSE_FIELDS.map(([field, label]) => (
                <label key={field} className="tm-field">
                  <span>{label}{s.activeOrderBreakdown ? ` · plan ${getOrderExpensePlaceholder(field, s.activeOrderBreakdown)}` : ''}</span>
                  <input type="number" min="0" placeholder={s.activeOrderBreakdown ? getOrderExpensePlaceholder(field, s.activeOrderBreakdown) : ''} value={s.orderDrafts[s.activeOrder!.id][field]} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, field, event.target.value)} />
                </label>
              ))}
              <label className="tm-field tm-span"><span>extra_comment</span><textarea rows={2} value={s.orderDrafts[s.activeOrder.id].extra_expense_comment} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'extra_expense_comment', event.target.value)} /></label>
              <label className="tm-field"><span>status</span><select value={s.orderDrafts[s.activeOrder.id].status} onChange={(event) => s.handleOrderDraftChange(s.activeOrder!.id, 'status', event.target.value)}><option value="draft">draft</option><option value="confirmed">confirmed</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></label>
              <div className="tm-span tm-bar">
                <button type="button" className="tm-btn tm-btn-go" onClick={() => s.handleSaveOrderExpenses(s.activeOrder!.id)}>save expenses</button>
                <button type="button" className="tm-btn" onClick={() => { void s.handleDeleteOrder(s.activeOrder!.id) }}>delete order</button>
              </div>
            </div>
          ) : null}
        </Win>
      ) : null}
    </div>
  )
}
