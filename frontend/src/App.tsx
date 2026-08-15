// Корень приложения: один раз поднимает механику (useSparrow) и отдаёт её
// выбранному дизайну. Сам выбор — маленький селект сверху слева; он живёт вне
// вёрстки дизайнов, поэтому переключение не сбрасывает состояние расчёта.

import { useEffect, useState } from 'react'
import { useSparrow } from './core/useSparrow'
import { DEFAULT_DESIGN, DESIGNS, DESIGN_STORAGE_KEY, isDesignId, type DesignId } from './designs/registry'
import './design-switch.css'

function readStoredDesign(): DesignId {
  const stored = localStorage.getItem(DESIGN_STORAGE_KEY)
  const design = stored && isDesignId(stored) ? stored : DEFAULT_DESIGN
  // Проставляем сразу, до первой отрисовки: иначе один кадр страница будет без
  // фона нужного дизайна (эффект отработает уже после paint).
  document.documentElement.dataset.design = design
  return design
}

export default function App() {
  const s = useSparrow()
  const [design, setDesign] = useState<DesignId>(readStoredDesign)

  // data-design на <html> — по нему каждый дизайн красит фон страницы и задаёт
  // ширину колонки, не мешая остальным.
  useEffect(() => {
    document.documentElement.dataset.design = design
    localStorage.setItem(DESIGN_STORAGE_KEY, design)
  }, [design])

  const active = DESIGNS.find((entry) => entry.id === design) ?? DESIGNS[0]
  const View = active.View

  return (
    <>
      <div className="design-switch no-print" data-html2canvas-ignore="true">
        <select
          aria-label="Вариант дизайна"
          value={design}
          onChange={(event) => setDesign(event.target.value as DesignId)}
        >
          {DESIGNS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </div>
      <View s={s} />
    </>
  )
}
