// Дизайн «Классика» — исходная вёрстка проекта, теперь поверх headless-хука.
// Оставлен как базовая точка отсчёта: с ним удобно сравнивать новые варианты.

import DatePicker from 'react-datepicker'
import { ru } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'
import './classic-page.css'
import './App.css'
import './AppShell.css'
import type { DocKind, StockDocument, TobaccoItem } from '../../core/types'
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

export default function ClassicView({ s }: { s: SparrowApi }) {
  const {
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
    notice,
    noticeTone,
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
    adminPanelOpen,
    setAdminPanelOpen,
    adminTab,
    goTab,
    lastWarehouse,
    warehouseActive,
    editorOverlay,
    setEditorOverlay,
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
    stockBrand,
    setStockBrand,
    stockStrength,
    setStockStrength,
    tobaccoBrands,
    tobaccoStrengths,
    filteredStock,
    stockValueTotal,
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
    pricingForm,
    pricingBusy,
    handlePricingFieldChange,
    handleSavePricing,
  } = s

  const orderExpenseFields = [
    ['fuel_expense', 'ГСМ'],
    ['consumables_expense', 'Расходные материалы'],
    ['coal_expense', 'Уголь'],
    ['tobacco_expense', 'Табак'],
    ['labor_expense', 'ЗП'],
    ['extra_expense', 'Доп. расходы'],
  ] as const

  const downloadPdf = () => handleDownloadPdf({ selector: '.calculator-card-wide', background: '#3a2319' })

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
          {saSearchResults.length > 0 ? <div className="company-search-results">{saSearchResults.map((item: TobaccoItem) => <button key={item.id} type="button" className="company-result" onClick={() => addStandaloneLine(item)}><strong>{item.brand} — {item.flavor_name}</strong><span className="company-result-separator">•</span><span>{item.strength}</span></button>)}</div> : null}
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

  return (
    <main className="page-shell">
      <section className="page-topbar no-print" data-html2canvas-ignore="true">
        <div className="page-topbar-spacer" />
        <button type="button" className="topbar-link" onClick={openAdminOrAuth}>
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
            <button type="button" className="pdf-button no-print" data-html2canvas-ignore="true" onClick={downloadPdf}>Скачать PDF</button>
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

            <div className="admin-shell">
              {adminTab === 'companies' ? (
                <div className="admin-card list-card">
                  <div className="card-header"><div className="header-inline-actions"><h3>База компаний</h3><button type="button" className="inline-create-button" onClick={openCreateCompany}>+ Новый заказчик</button></div><div className="header-search-slot"><input className="compact-input compact-input-narrow" placeholder="Поиск заказчика" value={companyQuery} onChange={async (event) => { const value = event.target.value; setCompanyQuery(value); if (adminUser) { try { await loadCompanies(value) } catch { /* тихо: подсказки поиска не критичны */ } } }} /></div></div>
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
                            const draft = lineDrafts[line.id] ?? DEFAULT_LINE_DRAFT
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
              <div className="metric-card"><span>Статус</span><strong>{orderDrafts[activeOrder.id] ? formatOrderStatus(orderDrafts[activeOrder.id].status) : '—'}</strong></div>
            </div>
            {orderDrafts[activeOrder.id] ? <div className="admin-shell"><div className="expense-grid">{orderExpenseFields.map(([field, label]) => <label key={field}><span>{activeOrderBreakdown ? `${label} · смета ${formatCurrency(Number(getOrderExpensePlaceholder(field, activeOrderBreakdown)))}` : label}</span><input type="number" min="0" placeholder={activeOrderBreakdown ? getOrderExpensePlaceholder(field, activeOrderBreakdown) : ''} value={orderDrafts[activeOrder.id][field]} onChange={(event) => handleOrderDraftChange(activeOrder.id, field, event.target.value)} /></label>)}<label className="field-span-2"><span>Комментарий к доп. расходам</span><textarea rows={3} placeholder="Например: доставка, парковка, срочная закупка" value={orderDrafts[activeOrder.id].extra_expense_comment} onChange={(event) => handleOrderDraftChange(activeOrder.id, 'extra_expense_comment', event.target.value)} /></label><label><span>Статус</span><select value={orderDrafts[activeOrder.id].status} onChange={(event) => handleOrderDraftChange(activeOrder.id, 'status', event.target.value)}><option value="draft">Черновик</option><option value="confirmed">Подтверждён</option><option value="completed">Завершён</option><option value="cancelled">Отменён</option></select></label></div><div className="admin-toolbar"><button type="button" className="primary-button" onClick={() => handleSaveOrderExpenses(activeOrder.id)}>Сохранить расходы</button><button type="button" className="ghost-button" onClick={() => { void handleDeleteOrder(activeOrder.id) }}>Удалить заказ</button></div></div> : null}
          </div>
        </div>
      ) : null}
    </main>
  )
}
