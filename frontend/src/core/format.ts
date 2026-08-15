// Форматтеры чисел, денег и дат. Одинаковы во всех дизайнах — меняется только
// оформление вокруг, но не то, как читается сумма.

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(value))
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
}

export function formatPositions(count: number) {
  const tail = count % 100
  const last = count % 10
  const word = tail >= 11 && tail <= 14 ? 'позиций' : last === 1 ? 'позиция' : last >= 2 && last <= 4 ? 'позиции' : 'позиций'
  return `${count} ${word}`
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatBirthDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

export function formatOrderStatus(status: 'draft' | 'confirmed' | 'completed' | 'cancelled') {
  switch (status) {
    case 'draft':
      return 'Черновик'
    case 'confirmed':
      return 'Подтверждён'
    case 'completed':
      return 'Завершён'
    default:
      return 'Отменён'
  }
}
