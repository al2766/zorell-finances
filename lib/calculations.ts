import { BILLS, HOLIDAYS, getCarCost, AFJ_DAILY_RATE, type Bill } from './data'

/**
 * Returns bills active in a given month/year
 */
export function getBillsForMonth(month: number, year: number, overrides?: Record<string, number>): Bill[] {
  return BILLS.filter(bill => {
    // Check if bill has started
    if (bill.startsMonth && bill.startsYear) {
      if (year < bill.startsYear) return false
      if (year === bill.startsYear && month < bill.startsMonth) return false
    }
    // Check if bill has ended
    if (bill.endsMonth && bill.endsYear) {
      if (year > bill.endsYear) return false
      if (year === bill.endsYear && month > bill.endsMonth) return false
    }
    return true
  }).map(bill => {
    if (overrides && overrides[bill.id] !== undefined) {
      return { ...bill, day: overrides[bill.id] }
    }
    return bill
  })
}

/**
 * Total bills amount for a month
 */
export function getMonthlyBillsTotal(month: number, year: number): number {
  const bills = getBillsForMonth(month, year)
  return bills.reduce((sum, b) => sum + b.amount, 0)
}

/**
 * Get working days in a month (Mon-Fri)
 */
export function getWorkingDaysInMonth(month: number, year: number): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day !== 0 && day !== 6) count++
  }
  return count
}

/**
 * Get AFJ working days in a month (total working days minus holiday days)
 */
export function getAFJDaysInMonth(month: number, year: number): number {
  const totalWorking = getWorkingDaysInMonth(month, year)

  // Get holiday days lost in this specific month
  let holidayDaysLost = 0
  HOLIDAYS.forEach(holiday => {
    const start = new Date(holiday.startDate)
    const end = new Date(holiday.endDate)

    // Count working days in this holiday that fall in the given month
    const current = new Date(start)
    while (current <= end) {
      if (current.getMonth() + 1 === month && current.getFullYear() === year) {
        const dow = current.getDay()
        if (dow !== 0 && dow !== 6) holidayDaysLost++
      }
      current.setDate(current.getDate() + 1)
    }
  })

  return Math.max(0, Math.min(20, totalWorking - holidayDaysLost))
}

/**
 * Get AFJ income for a month (paid on 8th of following month for the PREVIOUS month)
 * AFJ income received in month M = AFJ earned in month M-1
 */
export function getAFJIncomeReceivedInMonth(month: number, year: number): number {
  // Income received this month is for previous month's work
  let prevMonth = month - 1
  let prevYear = year
  if (prevMonth === 0) {
    prevMonth = 12
    prevYear = year - 1
  }
  const days = getAFJDaysInMonth(prevMonth, prevYear)
  return days * AFJ_DAILY_RATE
}

/**
 * Get AFJ income earned (worked) in a month
 */
export function getAFJIncomeEarnedInMonth(month: number, year: number): number {
  const days = getAFJDaysInMonth(month, year)
  return days * AFJ_DAILY_RATE
}

/**
 * Total outgoings for a month (bills + car)
 */
export function getMonthlyOutgoings(month: number, year: number): number {
  const bills = getMonthlyBillsTotal(month, year)
  const car = getCarCost(month, year)
  return bills + car.monthly + car.fuel
}

/**
 * Monthly surplus/deficit given a daily Uber rate
 */
export function getMonthlyResult(month: number, year: number, dailyUberRate: number): number {
  const workingDays = getWorkingDaysInMonth(month, year)
  const afjIncome = getAFJIncomeEarnedInMonth(month, year)
  const uberIncome = dailyUberRate * workingDays
  const totalIncome = afjIncome + uberIncome
  const outgoings = getMonthlyOutgoings(month, year)
  return totalIncome - outgoings
}

/**
 * Required daily Uber+Bolt to break even this month
 */
export function getRequiredDailyTarget(month: number, year: number): number {
  const outgoings = getMonthlyOutgoings(month, year)
  const afjIncome = getAFJIncomeEarnedInMonth(month, year)
  const workingDays = getWorkingDaysInMonth(month, year)
  if (workingDays === 0) return 0
  return (outgoings - afjIncome) / workingDays
}

/**
 * Get holidays that overlap with a given month
 */
export function getHolidaysInMonth(month: number, year: number): typeof HOLIDAYS {
  return HOLIDAYS.filter(holiday => {
    const start = new Date(holiday.startDate)
    const end = new Date(holiday.endDate)
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)
    return start <= monthEnd && end >= monthStart
  })
}

/**
 * Check if a date is currently in a holiday period
 */
export function getCurrentHoliday(date: Date = new Date()): (typeof HOLIDAYS)[0] | null {
  const dateStr = date.toISOString().split('T')[0]
  return HOLIDAYS.find(h => h.startDate <= dateStr && h.endDate >= dateStr) ?? null
}

/**
 * Bills grouped by day for chart
 */
export function getBillsByDay(month: number, year: number, overrides?: Record<string, number>): Record<number, number> {
  const bills = getBillsForMonth(month, year, overrides)
  const byDay: Record<number, number> = {}
  bills.forEach(bill => {
    const day = overrides?.[bill.id] ?? bill.day
    byDay[day] = (byDay[day] ?? 0) + bill.amount
  })
  return byDay
}

/**
 * Calculate ideal spread of moveable bills
 */
export function calculateEvenSpread(month: number, year: number): Record<string, number> {
  const bills = getBillsForMonth(month, year)
  const moveableBills = bills.filter(b => b.moveable)
  const fixedBills = bills.filter(b => !b.moveable)

  // Days in month
  const daysInMonth = new Date(year, month, 0).getDate()

  // Fixed bills occupy their days
  const fixedByDay: Record<number, number> = {}
  fixedBills.forEach(b => {
    fixedByDay[b.day] = (fixedByDay[b.day] ?? 0) + b.amount
  })

  // Sort moveable bills by amount desc
  const sorted = [...moveableBills].sort((a, b) => b.amount - a.amount)

  // Greedily assign each moveable bill to the day with the lowest total
  const dayTotals: Record<number, number> = {}
  for (let d = 1; d <= daysInMonth; d++) {
    dayTotals[d] = fixedByDay[d] ?? 0
  }

  const result: Record<string, number> = {}
  sorted.forEach(bill => {
    // Find day with lowest total
    let minDay = 1
    let minTotal = dayTotals[1]
    for (let d = 2; d <= daysInMonth; d++) {
      if (dayTotals[d] < minTotal) {
        minTotal = dayTotals[d]
        minDay = d
      }
    }
    result[bill.id] = minDay
    dayTotals[minDay] += bill.amount
  })

  return result
}

/**
 * Get the next 5 upcoming bills from today
 */
export function getUpcomingBills(count = 5): Array<Bill & { daysUntil: number; dueDate: Date }> {
  const today = new Date()
  const todayDay = today.getDate()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  const activeBills = getBillsForMonth(month, year)

  const withDates = activeBills.map(bill => {
    let daysUntil = bill.day - todayDay
    let dueDate = new Date(year, month - 1, bill.day)

    if (daysUntil < 0) {
      // Already passed this month, check next month
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      const nextBills = getBillsForMonth(nextMonth, nextYear)
      const nextBill = nextBills.find(b => b.id === bill.id)
      if (nextBill) {
        dueDate = new Date(nextYear, nextMonth - 1, nextBill.day)
        daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    return { ...bill, daysUntil, dueDate }
  })

  return withDates
    .filter(b => b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, count)
}

/**
 * Debt clearance events
 */
export interface DebtEvent {
  billId: string
  name: string
  month: number
  year: number
  savingsPerMonth: number
}

export function getDebtClearanceEvents(): DebtEvent[] {
  return BILLS.filter(b => b.endsMonth && b.endsYear).map(b => ({
    billId: b.id,
    name: b.name,
    month: b.endsMonth!,
    year: b.endsYear!,
    savingsPerMonth: b.amount,
  })).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })
}

/**
 * Get months where surplus reaches target
 */
export function findSurplusMonth(dailyRate: number, targetSurplus: number): { month: number; year: number } | null {
  for (let m = 4; m <= 24; m++) {
    const month = ((m - 1) % 12) + 1
    const year = 2026 + Math.floor((m - 1) / 12)
    const result = getMonthlyResult(month, year, dailyRate)
    if (result >= targetSurplus) {
      return { month, year }
    }
  }
  return null
}
