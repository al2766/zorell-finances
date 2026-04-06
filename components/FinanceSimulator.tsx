'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { BILLS, SEED_CUSTOM_BILLS, HOLIDAYS, AFJ_FULL_TERM_DAYS, MONTH_SHORT } from '@/lib/data'
import type { Bill, CustomBill } from '@/lib/data'
import AddBillModal from '@/components/AddBillModal'

// ─── Theme tokens ───────────────────────────────────────────────

interface ThemeTokens {
  bg: string
  card: string
  cardAlt: string
  border: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  green: string
  red: string
  amber: string
  blue: string
  blueLight: string
  purple: string
  sliderTrack: string
  overlay: string
  cardHover: string
}

const DARK: ThemeTokens = {
  bg: '#080d14',
  card: '#0f1923',
  cardAlt: '#0d1117',
  border: '#1e293b',
  borderStrong: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  blueLight: '#93c5fd',
  purple: '#a855f7',
  sliderTrack: '#1e293b',
  overlay: 'rgba(0,0,0,0.75)',
  cardHover: 'rgba(255,255,255,0.06)',
}

const LIGHT: ThemeTokens = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  green: '#16a34a',
  red: '#dc2626',
  amber: '#d97706',
  blue: '#2563eb',
  blueLight: '#2563eb',
  purple: '#9333ea',
  sliderTrack: '#e2e8f0',
  overlay: 'rgba(0,0,0,0.5)',
  cardHover: 'rgba(0,0,0,0.04)',
}

// ─── Types ──────────────────────────────────────────────────────

interface ExtraIncome {
  id: string
  name: string
  amount: number
  day: number
}

interface Settings {
  carWeeklyRent: number
  tankPrice: number
  fillEveryDays: number
  dailyMiles: number
  carChanges: CarChange[]
  afjDailyRate: number
  extraIncomes: ExtraIncome[]
  darkMode: boolean
}

interface CarChange {
  fromMonth: number
  fromYear: number
  carWeeklyRent: number
  tankPrice: number
  fillEveryDays: number
  dailyMiles: number
}

interface Sliders {
  normalDayRate: number
  offDayRate: number
  billsPerDay: number
  savingsOnExtra: number
  offDaySplit: number
}

interface WeekendState {
  workedDays: number[]
  weekendRate: number
  weekendBillsPerDay: number
  weekendSavings: number
}

interface DayData {
  date: Date
  dayOfMonth: number
  dayOfWeek: number
  isWeekend: boolean
  isOffDay: boolean
  isSchoolHolidayWeekday: boolean
  isWorkedWeekend: boolean
  isRestDay: boolean
  holidayName: string | null
  income: number
  billsDue: number
  billNames: string[]
  billDetails: { name: string; amount: number }[]
  carCost: number
  fuelCost: number
  billsPotAfter: number
  billsPotBefore: number
  spending: number
  spendingPotAfter: number
  savingsToday: number
  savingsPotAfter: number
  splitToday: number
  ringFenceCarryIn: number
  isPotNegative: boolean
  isPayday: boolean
  afjIn: number
  isFirstDayOfCycle: boolean
  extraIncomeToday: { name: string; amount: number }[]
  weekendRate: number
}

interface MonthOption {
  month: number
  year: number
  label: string
  short: string
}

interface CarChangeModalState {
  open: boolean
  fromMonth: number
  fromYear: number
  carWeeklyRent: number
  tankPrice: number
  fillEveryDays: number
  dailyMiles: number
  editIndex: number | null
}

interface ExtraIncomeModalState {
  open: boolean
  name: string
  amount: number
  day: number
  editIndex: number | null
}

// Balance override modal state
interface BalanceOverrideModalState {
  open: boolean
  dateKey: string  // YYYY-MM-DD
  dateLabel: string
  currentValue: number
}

// Day card context menu state
interface DayCardMenuState {
  x: number
  y: number
  dateKey: string
  dateLabel: string
  billsPotAfter: number
}

// ─── Constants ──────────────────────────────────────────────────

const MONTHS: MonthOption[] = [
  { month: 4, year: 2026, label: 'April 2026', short: 'Apr' },
  { month: 5, year: 2026, label: 'May 2026', short: 'May' },
  { month: 6, year: 2026, label: 'June 2026', short: 'Jun' },
  { month: 7, year: 2026, label: 'July 2026', short: 'Jul' },
  { month: 8, year: 2026, label: 'August 2026', short: 'Aug' },
  { month: 9, year: 2026, label: 'September 2026', short: 'Sep' },
  { month: 10, year: 2026, label: 'October 2026', short: 'Oct' },
  { month: 11, year: 2026, label: 'November 2026', short: 'Nov' },
  { month: 12, year: 2026, label: 'December 2026', short: 'Dec' },
]

const DEFAULT_SETTINGS: Settings = {
  carWeeklyRent: 100,
  tankPrice: 70,
  fillEveryDays: 4,
  dailyMiles: 110,
  carChanges: [
    {
      fromMonth: 5,
      fromYear: 2026,
      carWeeklyRent: 250,
      tankPrice: 70,
      fillEveryDays: 4,
      dailyMiles: 110,
    },
  ],
  afjDailyRate: 85,
  extraIncomes: [],
  darkMode: false,
}

const DEFAULT_SLIDERS: Sliders = {
  normalDayRate: 70,
  offDayRate: 150,
  billsPerDay: 20,
  savingsOnExtra: 10,
  offDaySplit: 40,
}

// ─── Helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return '£' + Math.abs(n).toFixed(0)
}

function fmtMoney(n: number): string {
  return '£' + Math.abs(n).toFixed(2)
}

function fmtSigned(n: number): string {
  return (n < 0 ? '-' : '+') + '£' + Math.abs(n).toFixed(0)
}

function todayDateKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isDateInHoliday(date: Date): { inHoliday: boolean; name: string | null } {
  const d = date.getTime()
  for (const h of HOLIDAYS) {
    const start = new Date(h.startDate).getTime()
    const end = new Date(h.endDate).getTime() + 86400000
    if (d >= start && d < end) {
      return { inHoliday: true, name: h.name }
    }
  }
  return { inHoliday: false, name: null }
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

function getCarSettings(month: number, year: number, settings: Settings): {
  carWeeklyRent: number; tankPrice: number; fillEveryDays: number; dailyMiles: number
} {
  let result = {
    carWeeklyRent: settings.carWeeklyRent,
    tankPrice: settings.tankPrice,
    fillEveryDays: settings.fillEveryDays,
    dailyMiles: settings.dailyMiles,
  }
  for (const change of settings.carChanges) {
    const changeVal = change.fromYear * 100 + change.fromMonth
    const monthVal = year * 100 + month
    if (monthVal >= changeVal) {
      result = {
        carWeeklyRent: change.carWeeklyRent,
        tankPrice: change.tankPrice,
        fillEveryDays: change.fillEveryDays,
        dailyMiles: change.dailyMiles,
      }
    }
  }
  return result
}

function calcAFJ(prevMonth: number, prevYear: number, afjDailyRate: number): number {
  let holidayDaysLost = 0
  for (const h of HOLIDAYS) {
    const start = new Date(h.startDate)
    const end = new Date(h.endDate)
    const cur = new Date(start)
    while (cur <= end) {
      if (cur.getFullYear() === prevYear && cur.getMonth() + 1 === prevMonth && !isWeekend(cur)) {
        holidayDaysLost++
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  const workingDays = Math.max(0, AFJ_FULL_TERM_DAYS - holidayDaysLost)
  return workingDays * afjDailyRate
}

function getBillDay(bill: Bill, month: number, year: number, overrides: Record<string, number>): number {
  const key = bill.id
  return overrides[key] ?? bill.day
}

function isBillActive(bill: Bill, month: number, year: number): boolean {
  const val = year * 100 + month
  if (bill.startsMonth && bill.startsYear) {
    if (val < bill.startsYear * 100 + bill.startsMonth) return false
  }
  if (bill.endsMonth && bill.endsYear) {
    if (val > bill.endsYear * 100 + bill.endsMonth) return false
  }
  return true
}

// ─── Simulation Engine ──────────────────────────────────────────

function isCustomBillActiveInMonth(bill: CustomBill, month: number, year: number): boolean {
  if (bill.frequency === 'monthly') {
    const val = year * 100 + month
    if (bill.startsMonth && bill.startsYear) {
      if (val < bill.startsYear * 100 + bill.startsMonth) return false
    }
    if (bill.endsMonth && bill.endsYear) {
      if (val > bill.endsYear * 100 + bill.endsMonth) return false
    }
    return true
  }
  if (bill.frequency === 'weekly') return true
  if (bill.frequency === 'one-off') {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return (bill.dates ?? []).some(d => d.startsWith(prefix))
  }
  return false
}

function customBillsToBills(customBills: CustomBill[], month: number, year: number, billDayOverrides: Record<string, number>): Bill[] {
  const result: Bill[] = []
  for (const cb of customBills) {
    if (cb.frequency === 'monthly' && isCustomBillActiveInMonth(cb, month, year)) {
      result.push({
        id: cb.id,
        name: cb.name,
        day: billDayOverrides[cb.id] ?? cb.dayOfMonth ?? 1,
        amount: cb.amount,
        category: cb.category,
        startsMonth: cb.startsMonth,
        startsYear: cb.startsYear,
        endsMonth: cb.endsMonth ?? null,
        endsYear: cb.endsYear ?? null,
        moveable: true,
      })
    } else if (cb.frequency === 'weekly') {
      const weekDays = cb.weekDays ?? []
      if (weekDays.length === 0) continue
      const daysInMonth = new Date(year, month, 0).getDate()
      let firstDay: number | null = null
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d)
        if (weekDays.includes(date.getDay())) {
          if (d >= 8 || firstDay === null) {
            if (firstDay === null) firstDay = d
            if (d >= 8) { firstDay = d; break }
          }
        }
      }
      result.push({
        id: cb.id,
        name: cb.name,
        day: billDayOverrides[cb.id] ?? firstDay ?? 1,
        amount: cb.amount,
        category: cb.category,
        endsMonth: null,
        endsYear: null,
        moveable: false,
      })
    } else if (cb.frequency === 'one-off') {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const matchDates = (cb.dates ?? []).filter(d => d.startsWith(prefix))
      for (const dateStr of matchDates) {
        const dom = parseInt(dateStr.slice(8, 10), 10)
        result.push({
          id: `${cb.id}__${dateStr}`,
          name: cb.name,
          day: dom,
          amount: cb.amount,
          category: cb.category,
          endsMonth: null,
          endsYear: null,
          moveable: false,
        })
      }
    }
  }
  return result
}

interface BillState {
  id: string
  name: string
  amount: number
  day: number
}

function customBillsToBillStates(
  customBills: CustomBill[],
  month: number,
  year: number,
  billDayOverrides: Record<string, number>,
  hiddenBillIds: Set<string>,
): BillState[] {
  const result: BillState[] = []
  for (const cb of customBills) {
    if (hiddenBillIds.has(cb.id)) continue
    if (cb.frequency === 'monthly' && isCustomBillActiveInMonth(cb, month, year)) {
      result.push({
        id: cb.id,
        name: cb.name,
        amount: cb.amount,
        day: billDayOverrides[cb.id] ?? cb.dayOfMonth ?? 1,
      })
    } else if (cb.frequency === 'weekly') {
      const weekDays = cb.weekDays ?? []
      if (weekDays.length === 0) continue
      const daysInMonth = new Date(year, month, 0).getDate()
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      for (let d = 8; d <= daysInMonth; d++) {
        const date = new Date(year, month - 1, d)
        if (weekDays.includes(date.getDay())) {
          result.push({ id: `${cb.id}__${d}`, name: cb.name, amount: cb.amount, day: d })
        }
      }
      for (let d = 1; d <= 7; d++) {
        const date = new Date(nextYear, nextMonth - 1, d)
        if (weekDays.includes(date.getDay())) {
          result.push({ id: `${cb.id}__nm${d}`, name: cb.name, amount: cb.amount, day: d })
        }
      }
    } else if (cb.frequency === 'one-off') {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const matchDates = (cb.dates ?? []).filter(d => d.startsWith(prefix))
      for (const dateStr of matchDates) {
        const dom = parseInt(dateStr.slice(8, 10), 10)
        result.push({ id: `${cb.id}__${dateStr}`, name: cb.name, amount: cb.amount, day: dom })
      }
    }
  }
  return result
}

function simulateCycle(
  month: number,
  year: number,
  sliders: Sliders,
  settings: Settings,
  billDayOverrides: Record<string, number>,
  startingPot: number,
  ringFenceCarryIn: number,
  workedWeekendDays: number[],
  weekendRate: number,
  customBills?: CustomBill[],
  hiddenBillIds?: Set<string>,
  weekendBillsPerDay?: number,
  weekendSavings?: number,
  balanceOverrides?: Record<string, number>,
): { days: DayData[]; endPot: number; ringFenceAccumulated: number } {
  const { normalDayRate, offDayRate, billsPerDay, savingsOnExtra, offDaySplit } = sliders

  const cycleDays: Date[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 8; d <= daysInMonth; d++) {
    cycleDays.push(new Date(year, month - 1, d))
  }
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  for (let d = 1; d <= 7; d++) {
    cycleDays.push(new Date(nextYear, nextMonth - 1, d))
  }

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const afjAmount = calcAFJ(prevMonth, prevYear, settings.afjDailyRate)

  const car = getCarSettings(month, year, settings)
  const carRentDays = new Set<string>()
  for (let i = 0; i < 4; i++) {
    const d = new Date(year, month - 1, 8 + i * 7)
    if (d.getMonth() + 1 === month) {
      carRentDays.add(d.toISOString().slice(0, 10))
    }
  }

  const fuelFillDays = new Set<string>()
  for (let i = 0; i < 31; i++) {
    const d = new Date(year, month - 1, 8 + i * car.fillEveryDays)
    const cycleStart = new Date(year, month - 1, 8).getTime()
    const cycleEnd = new Date(nextYear, nextMonth - 1, 7).getTime()
    if (d.getTime() >= cycleStart && d.getTime() <= cycleEnd) {
      fuelFillDays.add(d.toISOString().slice(0, 10))
    } else if (d.getTime() > cycleEnd) {
      break
    }
  }

  const _hiddenIds = hiddenBillIds ?? new Set<string>()
  const _customBills = customBills ?? []

  const activeBillsThisMonth = BILLS.filter(b => !_hiddenIds.has(b.id) && isBillActive(b, month, year))
  const activeBillsNextMonth = BILLS.filter(b => !_hiddenIds.has(b.id) && isBillActive(b, nextMonth, nextYear))

  const customThisMonth = customBillsToBillStates(_customBills, month, year, billDayOverrides, _hiddenIds)

  const customNextMonthFixed = _customBills
    .filter(cb => !_hiddenIds.has(cb.id) && (cb.frequency === 'monthly' || cb.frequency === 'one-off'))
    .flatMap(cb => {
      const states = customBillsToBillStates([cb], nextMonth, nextYear, billDayOverrides, _hiddenIds)
      return states.filter(bs => bs.day <= 7)
    })

  let billsPot = startingPot
  let ringFenceAccumulated = 0
  let cumulativeSavings = 0
  let cumulativeSpending = 0
  const days: DayData[] = []

  for (let i = 0; i < cycleDays.length; i++) {
    const date = cycleDays[i]
    const dom = date.getDate()
    const dateMonth = date.getMonth() + 1
    const dateYear = date.getFullYear()
    const dateKey = `${dateYear}-${String(dateMonth).padStart(2, '0')}-${String(dom).padStart(2, '0')}`
    const isFirstDay = i === 0

    const weekend = isWeekend(date)
    const { inHoliday, name: holidayName } = isDateInHoliday(date)
    const isOffDay = weekend || inHoliday

    const isSchoolHolidayWeekday = !weekend && inHoliday
    const isWorkedWeekend = weekend && workedWeekendDays.includes(dom)
    const isRestDay = weekend && !isWorkedWeekend

    const relevantBills = dateMonth === month ? activeBillsThisMonth : activeBillsNextMonth
    const billsToday = relevantBills.filter(b => {
      const assignedDay = getBillDay(b, dateMonth, dateYear, billDayOverrides)
      return assignedDay === dom
    })

    let customBillsToday: BillState[]
    if (dateMonth === month) {
      customBillsToday = customThisMonth.filter(bs => !bs.id.includes('__nm') && bs.day === dom)
    } else {
      const nmWeekly = customThisMonth.filter(bs => bs.id.includes('__nm') && bs.day === dom)
      const nmFixed = customNextMonthFixed.filter(bs => bs.day === dom)
      customBillsToday = [...nmWeekly, ...nmFixed]
    }
    const customBillsDueAmt = customBillsToday.reduce((s, bs) => s + bs.amount, 0)
    const billsDueAmt = billsToday.reduce((s, b) => s + b.amount, 0) + customBillsDueAmt

    const carCost = carRentDays.has(dateKey) ? car.carWeeklyRent : 0
    const fuelCost = fuelFillDays.has(dateKey) ? car.tankPrice : 0

    const extraIncomesToday = settings.extraIncomes.filter(e => e.day === dom)
    const extraIncomeTotal = extraIncomesToday.reduce((s, e) => s + e.amount, 0)

    let baseIncome = 0
    if (!weekend && !inHoliday) {
      baseIncome = normalDayRate
    } else if (isSchoolHolidayWeekday) {
      baseIncome = offDayRate
    } else if (isWorkedWeekend) {
      baseIncome = weekendRate
    }
    const income = baseIncome + extraIncomeTotal

    const isPayday = dom === 8 && dateMonth === month
    const afjIn = isPayday ? afjAmount : 0
    const carryInToday = isPayday ? ringFenceCarryIn : 0

    const billsPotBefore = billsPot

    const _weekendBillsPerDay = weekendBillsPerDay ?? billsPerDay
    const _weekendSavings = weekendSavings ?? savingsOnExtra
    if (!isRestDay) {
      const todayBillsAdd = isWorkedWeekend ? _weekendBillsPerDay : billsPerDay
      billsPot += todayBillsAdd
    }
    billsPot -= billsDueAmt
    billsPot -= carCost
    if (isPayday) {
      billsPot += afjIn + carryInToday
    }

    // Apply balance override if present — replaces computed ending pot
    if (balanceOverrides?.[dateKey] !== undefined) {
      billsPot = balanceOverrides[dateKey]
    }

    let savingsToday: number
    let spendingToday: number
    let splitToday: number

    if (isSchoolHolidayWeekday) {
      savingsToday = 0
      splitToday = offDaySplit
      spendingToday = offDayRate - billsPerDay - offDaySplit - fuelCost
      ringFenceAccumulated += offDaySplit
    } else if (isRestDay) {
      savingsToday = 0
      splitToday = 0
      spendingToday = 0
    } else if (isWorkedWeekend) {
      splitToday = 0
      const extra = baseIncome + extraIncomeTotal - _weekendBillsPerDay - carCost - fuelCost
      if (extra > 0) {
        savingsToday = Math.min(_weekendSavings, extra)
      } else {
        savingsToday = 0
      }
      spendingToday = extra - savingsToday
    } else {
      splitToday = 0
      const extra = baseIncome + extraIncomeTotal - billsPerDay - carCost - fuelCost
      if (extra > 0) {
        savingsToday = Math.min(savingsOnExtra, extra)
      } else {
        savingsToday = 0
      }
      spendingToday = extra - savingsToday
    }

    cumulativeSavings += savingsToday
    cumulativeSpending += spendingToday

    const billDetailsArr: { name: string; amount: number }[] = [
      ...billsToday.map(b => ({ name: b.name, amount: b.amount })),
      ...customBillsToday.map(bs => ({ name: bs.name, amount: bs.amount })),
    ]
    if (fuelCost > 0) {
      billDetailsArr.push({ name: 'Fuel fill', amount: fuelCost })
    }

    days.push({
      date,
      dayOfMonth: dom,
      dayOfWeek: date.getDay(),
      isWeekend: weekend,
      isOffDay,
      isSchoolHolidayWeekday,
      isWorkedWeekend,
      isRestDay,
      holidayName: inHoliday ? holidayName : null,
      income,
      billsDue: billsDueAmt,
      billNames: [...billsToday.map(b => b.name), ...customBillsToday.map(bs => bs.name)],
      billDetails: billDetailsArr,
      carCost,
      fuelCost,
      billsPotAfter: billsPot,
      billsPotBefore: billsPotBefore,
      spending: spendingToday,
      spendingPotAfter: cumulativeSpending,
      savingsToday,
      savingsPotAfter: cumulativeSavings,
      splitToday,
      ringFenceCarryIn: carryInToday,
      isPotNegative: billsPot < 0,
      isPayday,
      afjIn,
      isFirstDayOfCycle: isFirstDay,
      extraIncomeToday: extraIncomesToday.map(e => ({ name: e.name, amount: e.amount })),
      weekendRate,
    })
  }

  return { days, endPot: billsPot, ringFenceAccumulated }
}

// ─── Icons (inline SVG) ─────────────────────────────────────────

function GearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function ChevronIcon({ down, size = 16 }: { down: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={down ? '6 9 12 15 18 9' : '18 15 12 9 6 15'} />
    </svg>
  )
}

function ChevronRightIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronLeftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

function CarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="14" width="10" height="6" rx="1" />
      <path d="M5 9l2-4h10l2 4" />
    </svg>
  )
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function DragHandleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 20" fill="currentColor">
      <circle cx="4" cy="4" r="1.5" />
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="4" cy="16" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  )
}

// ─── Slider Component ───────────────────────────────────────────

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  color = '#3b82f6',
  theme,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  color?: string
  theme: ThemeTokens
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: theme.textSecondary }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(value)}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%',
            background: `linear-gradient(to right, ${color} ${pct}%, ${theme.sliderTrack} ${pct}%)`,
          }}
        />
      </div>
    </div>
  )
}

// ─── Balance Override Modal ──────────────────────────────────────

function BalanceOverrideModal({
  state,
  onSave,
  onRemove,
  onClose,
  hasExisting,
  theme,
}: {
  state: BalanceOverrideModalState
  onSave: (dateKey: string, value: number) => void
  onRemove: (dateKey: string) => void
  onClose: () => void
  hasExisting: boolean
  theme: ThemeTokens
}) {
  const [value, setValue] = useState(state.currentValue)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: theme.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 340,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 6 }}>
          Set pot balance
        </div>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 18 }}>
          {state.dateLabel}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6, display: 'block' }}>
            Bills pot balance after this day (£)
          </label>
          <input
            type="number"
            value={value}
            onChange={e => setValue(Number(e.target.value))}
            autoFocus
            style={{
              background: theme.cardAlt,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.textPrimary,
              padding: '10px 12px',
              fontSize: 18,
              fontWeight: 700,
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: hasExisting ? 10 : 0 }}>
          <button
            onClick={() => { onSave(state.dateKey, value); onClose() }}
            style={{
              flex: 1, background: theme.green, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', minHeight: 44,
            }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: theme.border, color: theme.textSecondary, border: 'none',
              borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer', minHeight: 44,
            }}
          >
            Cancel
          </button>
        </div>
        {hasExisting && (
          <button
            onClick={() => { onRemove(state.dateKey); onClose() }}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: theme.red, fontSize: 13, cursor: 'pointer',
              padding: '6px 0', fontFamily: 'inherit',
              textDecoration: 'underline',
            }}
          >
            Remove override
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Day Card Context Menu ───────────────────────────────────────

function DayCardContextMenu({
  menu,
  onClose,
  onSetBalance,
  isToday,
  theme,
}: {
  menu: DayCardMenuState
  onClose: () => void
  onSetBalance: () => void
  isToday: boolean
  theme: ThemeTokens
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: Math.min(menu.y, window.innerHeight - 80),
        left: Math.min(menu.x, window.innerWidth - 200),
        zIndex: 500,
        background: theme.borderStrong,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        minWidth: 190,
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => { if (isToday) { onSetBalance(); onClose() } }}
        disabled={!isToday}
        style={{
          display: 'block', width: '100%', textAlign: 'left',
          background: 'transparent', border: 'none',
          color: isToday ? theme.textPrimary : theme.textMuted,
          fontSize: 14, padding: '12px 16px', cursor: isToday ? 'pointer' : 'default',
          fontFamily: 'inherit', minHeight: 44, borderRadius: 0,
          opacity: isToday ? 1 : 0.6,
        }}
        onMouseEnter={e => { if (isToday) (e.currentTarget.style.background = theme.cardHover) }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'transparent') }}
      >
        {isToday ? 'Set balance' : 'Set balance (today only)'}
      </button>
    </div>
  )
}

// ─── Day Card ───────────────────────────────────────────────────

function DayCard({
  day,
  monthShort,
  theme,
  onContextMenu,
  hasOverride,
}: {
  day: DayData
  monthShort: string
  theme: ThemeTokens
  onContextMenu: (menu: DayCardMenuState) => void
  hasOverride: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const touchMoved = useRef(false)

  const potColor = day.billsPotAfter >= 0 ? theme.green : theme.red
  const totalOut = day.billsDue + day.carCost + day.fuelCost

  const dayOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.dayOfWeek]
  const cardOpacity = day.isRestDay ? 0.55 : 1

  const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.dayOfMonth).padStart(2, '0')}`
  const dateLabel = `${dayOfWeekShort} ${day.dayOfMonth} ${monthShort}`

  function openMenu(x: number, y: number) {
    onContextMenu({ x, y, dateKey, dateLabel, billsPotAfter: day.billsPotAfter })
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    openMenu(e.clientX, e.clientY)
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartPos.current = { x: t.clientX, y: t.clientY }
    touchMoved.current = false
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current && touchStartPos.current) {
        openMenu(touchStartPos.current.x, touchStartPos.current.y)
      }
    }, 500)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartPos.current.x
    const dy = t.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      touchMoved.current = true
      cancelLongPress()
    }
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
      style={{
        background: day.isPayday ? `rgba(${theme === DARK ? '59,130,246' : '37,99,235'},0.08)` : theme.card,
        border: `1px solid ${day.isPayday ? theme.blue : day.isPotNegative ? `${theme.red}66` : theme.border}`,
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 6,
        cursor: 'pointer',
        userSelect: 'none',
        opacity: cardOpacity,
        outline: hasOverride ? `2px solid ${theme.amber}` : 'none',
      }}
    >
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Date */}
        <div style={{ width: 52, flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: day.isSchoolHolidayWeekday ? theme.amber : day.isWorkedWeekend ? theme.amber : day.isRestDay ? theme.textMuted : theme.textPrimary }}>{day.dayOfMonth}</div>
          <div style={{ fontSize: 10, color: theme.textMuted }}>{dayOfWeekShort}</div>
        </div>

        {/* Pot balance */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: potColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {day.billsPotAfter < 0 ? '-' : ''}{fmt(day.billsPotAfter)}
          </div>
          <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>bills pot{hasOverride ? ' *' : ''}</div>
        </div>

        {/* IN / OUT */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          {day.income > 0 && (
            <div style={{ fontSize: 11, color: theme.green, fontVariantNumeric: 'tabular-nums' }}>
              +{fmt(day.income)}{day.afjIn > 0 ? ` +AFJ${fmt(day.afjIn)}` : ''}
            </div>
          )}
          {totalOut > 0 && (
            <div style={{ fontSize: 11, color: theme.red, fontVariantNumeric: 'tabular-nums' }}>
              -{fmt(totalOut)}
            </div>
          )}
        </div>

        {/* Indicators */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
          {day.isPayday && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: theme.blue,
              background: `${theme.blue}26`, borderRadius: 4, padding: '2px 5px'
            }}>PAY</span>
          )}
          {day.isSchoolHolidayWeekday && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: theme.amber,
              background: `${theme.amber}1f`, borderRadius: 4, padding: '2px 5px'
            }}>HOL</span>
          )}
          {day.isWorkedWeekend && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: theme.amber,
              background: `${theme.amber}26`, borderRadius: 4, padding: '2px 5px'
            }}>WKD</span>
          )}
          {day.isRestDay && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: theme.textMuted,
              background: `${theme.textMuted}26`, borderRadius: 4, padding: '2px 5px'
            }}>REST</span>
          )}
          {day.carCost > 0 && <span style={{ color: theme.textSecondary }}><CarIcon size={12} /></span>}
          <ChevronIcon down={!expanded} size={14} />
        </div>
      </div>

      {/* Payday highlight */}
      {day.isPayday && (
        <div style={{
          marginTop: 8, padding: '6px 10px',
          background: `${theme.blue}1f`, borderRadius: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: theme.blueLight }}>AFJ received</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: theme.blue, fontVariantNumeric: 'tabular-nums' }}>
              +{fmt(day.afjIn)}
            </span>
          </div>
          {day.ringFenceCarryIn > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: theme.amber }}>Split carry-in</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.amber, fontVariantNumeric: 'tabular-nums' }}>
                +{fmtMoney(day.ringFenceCarryIn)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}` }}>

          {/* Income section */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Income</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: theme.textSecondary }}>
                {day.isSchoolHolidayWeekday ? 'School holiday' : day.isWorkedWeekend ? 'Worked weekend' : day.isRestDay ? 'Rest day' : 'Working day'}
              </span>
              <span style={{ color: day.isRestDay ? theme.textMuted : theme.green, fontVariantNumeric: 'tabular-nums' }}>
                {day.isRestDay ? '£0' : `+${fmtMoney(day.income - day.extraIncomeToday.reduce((s, e) => s + e.amount, 0))}`}
              </span>
            </div>
            {day.afjIn > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: theme.textSecondary }}>AFJ</span>
                <span style={{ color: theme.blue, fontVariantNumeric: 'tabular-nums' }}>+{fmtMoney(day.afjIn)}</span>
              </div>
            )}
            {day.ringFenceCarryIn > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: theme.textSecondary }}>Split carry-in</span>
                <span style={{ color: theme.amber, fontVariantNumeric: 'tabular-nums' }}>+{fmtMoney(day.ringFenceCarryIn)}</span>
              </div>
            )}
            {day.extraIncomeToday.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
                <span style={{ color: theme.textSecondary }}>{e.name}</span>
                <span style={{ color: theme.green, fontVariantNumeric: 'tabular-nums' }}>+{fmtMoney(e.amount)}</span>
              </div>
            ))}
          </div>

          {/* Bills out section */}
          {day.billDetails.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Bills out</div>
              {day.billDetails.map((b, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 }}>
                  <span style={{ color: theme.textSecondary }}>{b.name}</span>
                  <span style={{ color: theme.red, fontVariantNumeric: 'tabular-nums' }}>-{fmtMoney(b.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Car rent */}
          {day.carCost > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: theme.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CarIcon size={12} /> Car rent
                </span>
                <span style={{ color: theme.red, fontVariantNumeric: 'tabular-nums' }}>-{fmtMoney(day.carCost)}</span>
              </div>
            </div>
          )}

          {/* Savings pot and Spending pot */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
            <div style={{ background: theme.bg, borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>Savings pot</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.purple, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(day.savingsPotAfter)}
              </div>
              <div style={{ fontSize: 10, color: theme.textMuted }}>+{fmtMoney(day.savingsToday)} today</div>
            </div>
            <div style={{ background: theme.bg, borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>Spending pot</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: day.spendingPotAfter >= 0 ? theme.textPrimary : theme.red, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(day.spendingPotAfter)}
              </div>
              <div style={{ fontSize: 10, color: theme.textMuted }}>{day.spending >= 0 ? '+' : ''}{fmtMoney(day.spending)} today</div>
            </div>
          </div>

          {/* Day type label */}
          {day.isSchoolHolidayWeekday && day.holidayName && (
            <div style={{ marginTop: 8, fontSize: 11, color: theme.amber }}>
              School holiday: {day.holidayName}
            </div>
          )}
          {day.isWorkedWeekend && (
            <div style={{ marginTop: 8, fontSize: 11, color: theme.amber }}>
              Worked weekend · {fmt(day.weekendRate)}/day
            </div>
          )}
          {day.isRestDay && (
            <div style={{ marginTop: 8, fontSize: 11, color: theme.textMuted }}>
              Rest day — no income
            </div>
          )}
          {hasOverride && (
            <div style={{ marginTop: 8, fontSize: 11, color: theme.amber }}>
              Balance manually set
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, valueColor }: { label: string; value: string; valueColor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#475569' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function cycleOrder(day: number): number {
  return day >= 8 ? day - 8 : day + 24
}

const CYCLE_DAYS = [...Array.from({ length: 31 - 8 + 1 }, (_, i) => i + 8), ...Array.from({ length: 7 }, (_, i) => i + 1)]

// ─── Bills Mode: Context Menu ────────────────────────────────────

interface ContextMenuState {
  x: number
  y: number
  billId: string
  isHidden: boolean
  isCustom: boolean
}

function BillContextMenu({
  menu,
  onClose,
  onHide,
  onShow,
  onEdit,
  theme,
}: {
  menu: ContextMenuState
  onClose: () => void
  onHide: (id: string) => void
  onShow: (id: string) => void
  onEdit: (id: string) => void
  theme: ThemeTokens
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const menuItemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'transparent', border: 'none', color: theme.textPrimary,
    fontSize: 14, padding: '12px 16px', cursor: 'pointer',
    fontFamily: 'inherit', minHeight: 44,
    borderRadius: 6,
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: Math.min(menu.y, window.innerHeight - 130),
        left: Math.min(menu.x, window.innerWidth - 180),
        zIndex: 500,
        background: theme.borderStrong,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        minWidth: 170,
        overflow: 'hidden',
      }}
    >
      {menu.isHidden ? (
        <button
          style={menuItemStyle}
          onClick={() => { onShow(menu.billId); onClose() }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.cardHover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Show bill
        </button>
      ) : (
        <button
          style={{ ...menuItemStyle, color: theme.textSecondary }}
          onClick={() => { onHide(menu.billId); onClose() }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.cardHover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Hide bill
        </button>
      )}
      <div style={{ borderTop: `1px solid ${theme.border}` }} />
      {menu.isCustom ? (
        <button
          style={menuItemStyle}
          onClick={() => { onEdit(menu.billId); onClose() }}
          onMouseEnter={e => (e.currentTarget.style.background = theme.cardHover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Edit bill
        </button>
      ) : (
        <button
          style={{ ...menuItemStyle, color: theme.textMuted, cursor: 'not-allowed' }}
          disabled
        >
          Edit bill (static)
        </button>
      )}
    </div>
  )
}

// ─── Bills Mode: Draggable Bill Row ─────────────────────────────

function DraggableBillRow({
  bill,
  amount,
  isHidden,
  isCustom,
  onContextMenu,
  theme,
}: {
  bill: Bill
  amount: number
  isHidden: boolean
  isCustom: boolean
  onContextMenu: (menu: ContextMenuState) => void
  theme: ThemeTokens
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: bill.id,
    disabled: !bill.moveable,
  })

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    touchStartPos.current = { x: t.clientX, y: t.clientY }
    longPressTimer.current = setTimeout(() => {
      if (touchStartPos.current) {
        onContextMenu({ x: touchStartPos.current.x, y: touchStartPos.current.y, billId: bill.id, isHidden, isCustom })
      }
    }, 500)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStartPos.current.x
    const dy = t.clientY - touchStartPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      cancelLongPress()
    }
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    touchStartPos.current = null
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    onContextMenu({ x: e.clientX, y: e.clientY, billId: bill.id, isHidden, isCustom })
  }

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 0',
    opacity: isDragging ? 0.4 : isHidden ? 0.4 : 1,
    cursor: bill.moveable ? 'grab' : 'default',
    position: 'relative',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={cancelLongPress}
      onTouchCancel={cancelLongPress}
    >
      {bill.moveable ? (
        <span
          {...attributes}
          {...listeners}
          style={{ color: theme.textMuted, display: 'flex', alignItems: 'center', touchAction: 'none', flexShrink: 0 }}
        >
          <DragHandleIcon size={14} />
        </span>
      ) : (
        <span style={{ color: theme.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <LockIcon size={12} />
        </span>
      )}
      <span style={{
        fontSize: 12,
        color: bill.moveable ? theme.textSecondary : theme.textMuted,
        flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textDecoration: isHidden ? 'line-through' : 'none',
      }}>
        {bill.name}
      </span>
      {isHidden && (
        <span style={{
          fontSize: 9, fontWeight: 700, color: theme.textMuted,
          background: `${theme.textMuted}33`, borderRadius: 4, padding: '1px 4px', flexShrink: 0,
        }}>
          HIDDEN
        </span>
      )}
      <span style={{ fontSize: 12, color: isHidden ? theme.textMuted : theme.red, fontVariantNumeric: 'tabular-nums', flexShrink: 0, textDecoration: isHidden ? 'line-through' : 'none' }}>
        -{fmtMoney(amount)}
      </span>
    </div>
  )
}

// ─── Bills Mode: Droppable Day Row ──────────────────────────────

function DroppableDayRow({
  dayData,
  bills,
  billAmounts,
  isOver,
  hiddenBillIds,
  customBillIds,
  onBillContextMenu,
  theme,
}: {
  dayData: DayData
  bills: Bill[]
  billAmounts: Record<string, number>
  isOver: boolean
  hiddenBillIds: Set<string>
  customBillIds: Set<string>
  onBillContextMenu: (menu: ContextMenuState) => void
  theme: ThemeTokens
}) {
  const { setNodeRef } = useDroppable({ id: `day-${dayData.dayOfMonth}-${dayData.date.getMonth()}` })

  const potColor = dayData.billsPotAfter >= 0 ? theme.green : theme.red
  const dayOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayData.dayOfWeek]
  const totalOutToday = dayData.billsDue + dayData.carCost + dayData.fuelCost
  const inAmt = dayData.income + (dayData.isPayday ? dayData.afjIn + dayData.ringFenceCarryIn : 0)

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 4,
        alignItems: 'stretch',
        minHeight: 44,
      }}
    >
      {/* LEFT: bills list */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          background: isOver ? `${theme.blue}14` : theme.card,
          border: `1px solid ${isOver ? `${theme.blue}66` : theme.border}`,
          borderRadius: 8,
          padding: '6px 10px',
          transition: 'background 0.15s, border-color 0.15s',
          minHeight: 44,
        }}
      >
        {/* Day header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: bills.length > 0 ? 4 : 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: dayData.isSchoolHolidayWeekday ? theme.amber : dayData.isWorkedWeekend ? theme.amber : dayData.isRestDay ? theme.textMuted : theme.textSecondary, minWidth: 22 }}>{dayData.dayOfMonth}</span>
          <span style={{ fontSize: 10, color: theme.textMuted }}>{dayOfWeekShort}</span>
          {dayData.isSchoolHolidayWeekday && (
            <span style={{ fontSize: 10, color: theme.amber, background: `${theme.amber}1a`, borderRadius: 4, padding: '1px 4px' }}>HOL</span>
          )}
          {dayData.isWorkedWeekend && (
            <span style={{ fontSize: 10, color: theme.amber, background: `${theme.amber}1f`, borderRadius: 4, padding: '1px 4px' }}>WKD</span>
          )}
          {dayData.isRestDay && (
            <span style={{ fontSize: 10, color: theme.textMuted, background: `${theme.textMuted}1f`, borderRadius: 4, padding: '1px 4px' }}>REST</span>
          )}
          {dayData.isPayday && (
            <span style={{ fontSize: 10, color: theme.blue, background: `${theme.blue}1f`, borderRadius: 4, padding: '1px 4px' }}>PAY</span>
          )}
        </div>

        {/* Bill rows */}
        {bills.map(bill => (
          <DraggableBillRow
            key={bill.id}
            bill={bill}
            amount={billAmounts[bill.id] ?? bill.amount}
            isHidden={hiddenBillIds.has(bill.id)}
            isCustom={customBillIds.has(bill.id)}
            onContextMenu={onBillContextMenu}
            theme={theme}
          />
        ))}

        {/* Car rent row if applicable */}
        {dayData.carCost > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0' }}>
            <span style={{ color: theme.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}><LockIcon size={12} /></span>
            <span style={{ fontSize: 12, color: theme.textMuted, flex: 1 }}>Car rent</span>
            <span style={{ fontSize: 12, color: theme.red, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>-{fmtMoney(dayData.carCost)}</span>
          </div>
        )}

        {/* Fuel row if applicable */}
        {dayData.fuelCost > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0' }}>
            <span style={{ color: theme.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}><LockIcon size={12} /></span>
            <span style={{ fontSize: 12, color: theme.textMuted, flex: 1 }}>Fuel fill</span>
            <span style={{ fontSize: 12, color: theme.red, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>-{fmtMoney(dayData.fuelCost)}</span>
          </div>
        )}
      </div>

      {/* RIGHT: pot card */}
      <div
        style={{
          width: 82,
          flexShrink: 0,
          background: theme.card,
          border: `1px solid ${dayData.isPotNegative ? `${theme.red}4d` : theme.border}`,
          borderRadius: 8,
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: potColor, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
          {dayData.billsPotAfter < 0 ? '-' : ''}{fmt(dayData.billsPotAfter)}
        </div>
        <div style={{ fontSize: 9, color: theme.textMuted, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
          In {fmt(inAmt)}
        </div>
        <div style={{ fontSize: 9, color: theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          Out {fmt(totalOutToday)}
        </div>
      </div>
    </div>
  )
}

// ─── Settings Panel ─────────────────────────────────────────────

function SettingsPanel({
  settings,
  onSave,
  onClose,
  theme,
}: {
  settings: Settings
  onSave: (s: Settings) => void
  onClose: () => void
  theme: ThemeTokens
}) {
  const [local, setLocal] = useState<Settings>(JSON.parse(JSON.stringify(settings)))
  const [modal, setModal] = useState<CarChangeModalState>({
    open: false, fromMonth: 5, fromYear: 2026, carWeeklyRent: 250, tankPrice: 70, fillEveryDays: 4, dailyMiles: 110, editIndex: null,
  })
  const [extraModal, setExtraModal] = useState<ExtraIncomeModalState>({
    open: false, name: '', amount: 0, day: 8, editIndex: null,
  })

  function openAddCarModal() {
    setModal({ open: true, fromMonth: 5, fromYear: 2026, carWeeklyRent: 250, tankPrice: 70, fillEveryDays: 4, dailyMiles: 110, editIndex: null })
  }

  function openEditCarModal(i: number) {
    const c = local.carChanges[i]
    setModal({ open: true, fromMonth: c.fromMonth, fromYear: c.fromYear, carWeeklyRent: c.carWeeklyRent, tankPrice: c.tankPrice, fillEveryDays: c.fillEveryDays, dailyMiles: c.dailyMiles, editIndex: i })
  }

  function saveCarChange() {
    const change: CarChange = {
      fromMonth: modal.fromMonth, fromYear: modal.fromYear,
      carWeeklyRent: modal.carWeeklyRent, tankPrice: modal.tankPrice,
      fillEveryDays: modal.fillEveryDays, dailyMiles: modal.dailyMiles,
    }
    setLocal(prev => {
      const changes = [...prev.carChanges]
      if (modal.editIndex !== null) {
        changes[modal.editIndex] = change
      } else {
        changes.push(change)
      }
      changes.sort((a, b) => (a.fromYear * 100 + a.fromMonth) - (b.fromYear * 100 + b.fromMonth))
      return { ...prev, carChanges: changes }
    })
    setModal(m => ({ ...m, open: false }))
  }

  function removeCarChange(i: number) {
    setLocal(prev => ({ ...prev, carChanges: prev.carChanges.filter((_, idx) => idx !== i) }))
  }

  function openAddExtraIncome() {
    setExtraModal({ open: true, name: '', amount: 0, day: 8, editIndex: null })
  }

  function openEditExtraIncome(i: number) {
    const e = local.extraIncomes[i]
    setExtraModal({ open: true, name: e.name, amount: e.amount, day: e.day, editIndex: i })
  }

  function saveExtraIncome() {
    const income: ExtraIncome = {
      id: extraModal.editIndex !== null ? local.extraIncomes[extraModal.editIndex].id : `extra-${Date.now()}`,
      name: extraModal.name,
      amount: extraModal.amount,
      day: extraModal.day,
    }
    setLocal(prev => {
      const incomes = [...prev.extraIncomes]
      if (extraModal.editIndex !== null) {
        incomes[extraModal.editIndex] = income
      } else {
        incomes.push(income)
      }
      return { ...prev, extraIncomes: incomes }
    })
    setExtraModal(m => ({ ...m, open: false }))
  }

  function removeExtraIncome(i: number) {
    setLocal(prev => ({ ...prev, extraIncomes: prev.extraIncomes.filter((_, idx) => idx !== i) }))
  }

  const fieldStyle: React.CSSProperties = {
    background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: 8,
    color: theme.textPrimary, padding: '8px 12px', fontSize: 14, width: '100%', outline: 'none',
    fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, color: theme.textMuted, marginBottom: 4, display: 'block' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: theme.bg, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0,
        background: theme.bg, zIndex: 10,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>Settings</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { onSave(local); onClose() }}
            style={{
              background: theme.green, color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >Save</button>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', color: theme.textSecondary, border: `1px solid ${theme.border}`,
              borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
            }}
          ><CloseIcon size={18} /></button>
        </div>
      </div>

      <div style={{ padding: '20px', maxWidth: 600, width: '100%', margin: '0 auto' }}>

        {/* Dark mode toggle */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.blueLight, marginBottom: 12 }}>Appearance</div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10,
            padding: '12px 16px',
          }}>
            <span style={{ fontSize: 14, color: theme.textPrimary }}>Dark mode</span>
            <button
              onClick={() => setLocal(prev => ({ ...prev, darkMode: !prev.darkMode }))}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: local.darkMode ? theme.blue : theme.border,
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.2s ease', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: local.darkMode ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                display: 'block',
              }} />
            </button>
          </div>
        </div>

        {/* AFJ Daily Rate */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.blueLight, marginBottom: 12 }}>AFJ daily rate</div>
          <div>
            <label style={labelStyle}>AFJ daily rate (£)</label>
            <input
              type="number"
              value={local.afjDailyRate}
              onChange={e => setLocal(prev => ({ ...prev, afjDailyRate: Number(e.target.value) }))}
              style={{ ...fieldStyle, maxWidth: 160 }}
            />
          </div>
        </div>

        {/* Current car */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.blueLight, marginBottom: 12 }}>Current car (Apr 2026)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Weekly rent (£)', field: 'carWeeklyRent' as const },
              { label: 'Tank price (£)', field: 'tankPrice' as const },
              { label: 'Fill every N days', field: 'fillEveryDays' as const },
              { label: 'Daily miles', field: 'dailyMiles' as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input
                  type="number"
                  value={local[field]}
                  onChange={e => setLocal(prev => ({ ...prev, [field]: Number(e.target.value) }))}
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Car changes */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.blueLight }}>Car changes</span>
            <button
              onClick={openAddCarModal}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${theme.blue}1a`, border: `1px solid ${theme.blue}4d`,
                color: theme.blueLight, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              }}
            >
              <PlusIcon size={14} /> Add change
            </button>
          </div>

          {local.carChanges.length === 0 && (
            <div style={{ fontSize: 13, color: theme.textMuted, padding: '12px', background: theme.card, borderRadius: 8 }}>
              No changes configured
            </div>
          )}

          {local.carChanges.map((c, i) => (
            <div key={i} style={{
              background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10,
              padding: '12px 14px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 600, marginBottom: 4 }}>
                  From {MONTH_SHORT[c.fromMonth - 1]} {c.fromYear}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  £{c.carWeeklyRent}/wk · fill every {c.fillEveryDays}d · {fmt(c.tankPrice)} tank
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEditCarModal(i)} style={{ background: theme.border, border: 'none', color: theme.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => removeCarChange(i)} style={{ background: `${theme.red}1a`, border: `1px solid ${theme.red}4d`, color: theme.red, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Extra Fixed Incomes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.blueLight }}>Extra fixed incomes</span>
            <button
              onClick={openAddExtraIncome}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: `${theme.green}1a`, border: `1px solid ${theme.green}4d`,
                color: theme.green, borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
              }}
            >
              <PlusIcon size={14} /> Add income
            </button>
          </div>

          {local.extraIncomes.length === 0 && (
            <div style={{ fontSize: 13, color: theme.textMuted, padding: '12px', background: theme.card, borderRadius: 8 }}>
              No extra incomes configured
            </div>
          )}

          {local.extraIncomes.map((e, i) => (
            <div key={e.id} style={{
              background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10,
              padding: '12px 14px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 13, color: theme.textPrimary, fontWeight: 600, marginBottom: 4 }}>
                  {e.name}
                </div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>
                  {fmtMoney(e.amount)} on day {e.day} of each month
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEditExtraIncome(i)} style={{ background: theme.border, border: 'none', color: theme.textSecondary, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => removeExtraIncome(i)} style={{ background: `${theme.red}1a`, border: `1px solid ${theme.red}4d`, color: theme.red, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Car change modal */}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: theme.overlay,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 16 }}>
              {modal.editIndex !== null ? 'Edit car change' : 'Add car change'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>From month (1–12)</label>
                <input type="number" min={1} max={12} value={modal.fromMonth} onChange={e => setModal(m => ({ ...m, fromMonth: Number(e.target.value) }))} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>From year</label>
                <input type="number" value={modal.fromYear} onChange={e => setModal(m => ({ ...m, fromYear: Number(e.target.value) }))} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Weekly rent (£)</label>
                <input type="number" value={modal.carWeeklyRent} onChange={e => setModal(m => ({ ...m, carWeeklyRent: Number(e.target.value) }))} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tank price (£)</label>
                <input type="number" value={modal.tankPrice} onChange={e => setModal(m => ({ ...m, tankPrice: Number(e.target.value) }))} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Fill every N days</label>
                <input type="number" value={modal.fillEveryDays} onChange={e => setModal(m => ({ ...m, fillEveryDays: Number(e.target.value) }))} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Daily miles</label>
                <input type="number" value={modal.dailyMiles} onChange={e => setModal(m => ({ ...m, dailyMiles: Number(e.target.value) }))} style={fieldStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveCarChange} style={{ flex: 1, background: theme.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {modal.editIndex !== null ? 'Save' : 'Add'}
              </button>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} style={{ flex: 1, background: theme.border, color: theme.textSecondary, border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extra income modal */}
      {extraModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: theme.overlay,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.textPrimary, marginBottom: 16 }}>
              {extraModal.editIndex !== null ? 'Edit income' : 'Add income'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={extraModal.name}
                  onChange={e => setExtraModal(m => ({ ...m, name: e.target.value }))}
                  style={fieldStyle}
                  placeholder="e.g. Freelance payment"
                />
              </div>
              <div>
                <label style={labelStyle}>Amount (£)</label>
                <input
                  type="number"
                  value={extraModal.amount}
                  onChange={e => setExtraModal(m => ({ ...m, amount: Number(e.target.value) }))}
                  style={fieldStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Day of month (1–31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={extraModal.day}
                  onChange={e => setExtraModal(m => ({ ...m, day: Number(e.target.value) }))}
                  style={fieldStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveExtraIncome}
                disabled={!extraModal.name.trim() || extraModal.amount <= 0}
                style={{ flex: 1, background: extraModal.name.trim() && extraModal.amount > 0 ? theme.green : theme.border, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                {extraModal.editIndex !== null ? 'Save' : 'Add'}
              </button>
              <button onClick={() => setExtraModal(m => ({ ...m, open: false }))} style={{ flex: 1, background: theme.border, color: theme.textSecondary, border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Weekends Accordion ─────────────────────────────────────────

function getWeekendDatesInCycle(month: number, year: number): { dom: number; dayName: 'Sat' | 'Sun'; fullDate: Date }[] {
  const results: { dom: number; dayName: 'Sat' | 'Sun'; fullDate: Date }[] = []
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let d = 8; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d)
    const dow = date.getDay()
    if (dow === 6 || dow === 0) {
      results.push({ dom: d, dayName: dow === 6 ? 'Sat' : 'Sun', fullDate: date })
    }
  }
  for (let d = 1; d <= 7; d++) {
    const date = new Date(nextYear, nextMonth - 1, d)
    const dow = date.getDay()
    if (dow === 6 || dow === 0) {
      results.push({ dom: d, dayName: dow === 6 ? 'Sat' : 'Sun', fullDate: date })
    }
  }
  return results
}

function WeekendsAccordion({
  open,
  onToggle,
  month,
  year,
  wkdState,
  onToggleDay,
  onRateChange,
  onBillsPerDayChange,
  onSavingsChange,
  theme,
}: {
  open: boolean
  onToggle: () => void
  month: number
  year: number
  wkdState: WeekendState
  onToggleDay: (dom: number) => void
  onRateChange: (v: number) => void
  onBillsPerDayChange: (v: number) => void
  onSavingsChange: (v: number) => void
  theme: ThemeTokens
}) {
  const weekendDates = getWeekendDatesInCycle(month, year)
  const workedCount = wkdState.workedDays.length
  const pct = wkdState.weekendRate > 0 ? Math.min((wkdState.weekendRate / 300) * 100, 100) : 0
  const billsPct = wkdState.weekendBillsPerDay > 0 ? Math.min((wkdState.weekendBillsPerDay / 100) * 100, 100) : 0
  const savePct = wkdState.weekendSavings > 0 ? Math.min((wkdState.weekendSavings / 100) * 100, 100) : 0

  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', color: theme.textPrimary,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>Weekends</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>
            {workedCount > 0 ? `${workedCount} worked · ${fmt(wkdState.weekendRate)}/d` : `${weekendDates.length} days · static`}
          </span>
          <ChevronIcon down={!open} size={16} />
        </div>
      </button>

      {open && (
        <div style={{ padding: '4px 16px 16px' }}>
          {/* Weekend day grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {weekendDates.map(({ dom, dayName }) => {
              const isWorked = wkdState.workedDays.includes(dom)
              return (
                <div
                  key={`${dayName}-${dom}`}
                  onClick={() => onToggleDay(dom)}
                  style={{
                    width: 64, padding: '6px 4px', borderRadius: 10, textAlign: 'center',
                    background: isWorked ? `${theme.amber}26` : theme.card,
                    border: `1px solid ${isWorked ? theme.amber : theme.border}`,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: 10, color: isWorked ? theme.amber : theme.textMuted, fontWeight: 600 }}>{dayName}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isWorked ? theme.amber : theme.textMuted }}>{dom}</div>
                </div>
              )
            })}
          </div>

          {workedCount === 0 && (
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, padding: '8px 10px', background: theme.bg, borderRadius: 8 }}>
              No weekends toggled — pot stays static through weekends (no bills-per-day added)
            </div>
          )}

          {/* Weekend rate slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: workedCount > 0 ? theme.textSecondary : theme.textMuted }}>Weekend day rate</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: workedCount > 0 ? theme.amber : theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(wkdState.weekendRate)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={300}
              value={wkdState.weekendRate}
              onChange={e => onRateChange(Number(e.target.value))}
              style={{
                width: '100%',
                background: workedCount > 0 ? `linear-gradient(to right, ${theme.amber} ${pct}%, ${theme.sliderTrack} ${pct}%)` : theme.sliderTrack,
              }}
            />
          </div>

          {/* Bills pot per day slider */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: workedCount > 0 ? theme.textSecondary : theme.textMuted }}>Bills pot per day (worked wkd)</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: workedCount > 0 ? theme.blue : theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(wkdState.weekendBillsPerDay)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={wkdState.weekendBillsPerDay}
              onChange={e => onBillsPerDayChange(Number(e.target.value))}
              style={{
                width: '100%',
                background: workedCount > 0 ? `linear-gradient(to right, ${theme.blue} ${billsPct}%, ${theme.sliderTrack} ${billsPct}%)` : theme.sliderTrack,
              }}
            />
          </div>

          {/* Savings per day slider */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: workedCount > 0 ? theme.textSecondary : theme.textMuted }}>Savings (worked wkd)</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: workedCount > 0 ? theme.purple : theme.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(wkdState.weekendSavings)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={wkdState.weekendSavings}
              onChange={e => onSavingsChange(Number(e.target.value))}
              style={{
                width: '100%',
                background: workedCount > 0 ? `linear-gradient(to right, ${theme.purple} ${savePct}%, ${theme.sliderTrack} ${savePct}%)` : theme.sliderTrack,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Month Totals Strip ─────────────────────────────────────────

function MonthTotals({ days, sliders, theme }: { days: DayData[]; sliders: Sliders; theme: ThemeTokens }) {
  const workDays = days.filter(d => !d.isWeekend && !d.isSchoolHolidayWeekday)
  const holDays = days.filter(d => d.isSchoolHolidayWeekday)
  const workedWkds = days.filter(d => d.isWorkedWeekend)
  const restDays = days.filter(d => d.isRestDay)

  const totalIncome = days.reduce((s, d) => s + d.income, 0)
  const totalAFJ = days.reduce((s, d) => s + d.afjIn, 0)
  const totalBills = days.reduce((s, d) => s + d.billsDue, 0)
  const totalCar = days.reduce((s, d) => s + d.carCost, 0)
  const totalFuel = days.reduce((s, d) => s + d.fuelCost, 0)
  const totalSavings = days.length > 0 ? days[days.length - 1].savingsPotAfter : 0
  const totalSplit = holDays.reduce((s, d) => s + d.splitToday, 0)
  const worstPot = Math.min(...days.map(d => d.billsPotAfter))
  const endPot = days.length > 0 ? days[days.length - 1].billsPotAfter : 0
  const endSpending = days.length > 0 ? days[days.length - 1].spendingPotAfter : 0
  const weekendIncome = workedWkds.reduce((s, d) => s + d.income, 0)

  const stats = [
    { label: 'Total income', value: fmt(totalIncome + totalAFJ), color: theme.green },
    { label: 'Working days', value: String(workDays.length), color: theme.textPrimary },
    { label: 'Hol days', value: String(holDays.length), color: theme.amber },
    { label: 'Rest days', value: String(restDays.length), color: theme.textMuted },
    { label: 'Weekend income', value: fmt(weekendIncome), color: workedWkds.length > 0 ? theme.amber : theme.textMuted },
    { label: 'Bills paid', value: fmt(totalBills), color: theme.red },
    { label: 'Car cost', value: fmt(totalCar), color: theme.red },
    { label: 'Fuel cost', value: fmt(totalFuel), color: theme.red },
    { label: 'Saved', value: fmt(totalSavings), color: theme.purple },
    { label: 'Split (hol)', value: fmt(totalSplit), color: theme.amber },
    { label: 'End pot', value: fmt(endPot), color: endPot >= 0 ? theme.green : theme.red },
    { label: 'Worst dip', value: worstPot < 0 ? `-${fmt(Math.abs(worstPot))}` : fmt(worstPot), color: worstPot < 0 ? theme.red : theme.green },
    { label: 'AFJ received', value: fmt(totalAFJ), color: theme.blue },
    { label: 'Spending pot', value: fmt(endSpending), color: endSpending >= 0 ? theme.textPrimary : theme.red },
  ]

  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
      padding: '16px', marginTop: 8,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.blueLight, marginBottom: 12 }}>
        Cycle summary
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 8px' }}>
        {stats.map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const DEFAULT_WEEKEND_STATE: WeekendState = { workedDays: [], weekendRate: 80, weekendBillsPerDay: 20, weekendSavings: 10 }

function weekendStateKey(month: number, year: number): string {
  return `fin-weekends-${year}-${String(month).padStart(2, '0')}`
}

function monthCarryKey(monthKey: string): string {
  return `fin-carry-toggle-${monthKey.slice('fin-bill-days-'.length)}`
}

export default function FinanceSimulator() {
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(0)
  const [slidersOpen, setSlidersOpen] = useState(true)
  const [weekendsOpen, setWeekendsOpen] = useState(false)
  const [billsMode, setBillsMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [overDayId, setOverDayId] = useState<string | null>(null)

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [sliders, setSliders] = useState<Sliders>(DEFAULT_SLIDERS)
  const [billDayOverrides, setBillDayOverrides] = useState<Record<string, Record<string, number>>>({})
  const [allWeekendStates, setAllWeekendStates] = useState<Record<string, WeekendState>>({})
  const [hydrated, setHydrated] = useState(false)

  // Custom bills
  const [customBills, setCustomBills] = useState<CustomBill[]>([])
  const [hiddenBillIds, setHiddenBillIds] = useState<Set<string>>(new Set())

  // Add/Edit bill modal
  const [addBillOpen, setAddBillOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<CustomBill | null>(null)

  // Bill context menu (bills mode)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  // Day card context menu (normal mode)
  const [dayCardMenu, setDayCardMenu] = useState<DayCardMenuState | null>(null)

  // Balance override modal
  const [balanceOverrideModal, setBalanceOverrideModal] = useState<BalanceOverrideModalState | null>(null)

  // Balance overrides: key = YYYY-MM-DD, value = override pot
  const [balanceOverrides, setBalanceOverrides] = useState<Record<string, number>>({})

  // Per-month carry-over toggle: key = YYYY-MM, value = true (apply) or false (discard)
  // stored per month in localStorage as fin-carry-toggle-YYYY-MM
  const [carryToggles, setCarryToggles] = useState<Record<string, boolean>>({})

  // Compute today's date key once
  const todayKey = useMemo(() => todayDateKey(), [])

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem('fin-settings')
      if (s) {
        const parsed = JSON.parse(s)
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          afjDailyRate: parsed.afjDailyRate ?? DEFAULT_SETTINGS.afjDailyRate,
          extraIncomes: parsed.extraIncomes ?? [],
          darkMode: parsed.darkMode ?? false,
        })
      }
      const sl = localStorage.getItem('fin-sliders')
      if (sl) {
        const parsed = JSON.parse(sl)
        setSliders({
          normalDayRate: parsed.normalDayRate ?? DEFAULT_SLIDERS.normalDayRate,
          offDayRate: parsed.offDayRate ?? DEFAULT_SLIDERS.offDayRate,
          billsPerDay: parsed.billsPerDay ?? DEFAULT_SLIDERS.billsPerDay,
          savingsOnExtra: parsed.savingsOnExtra ?? parsed.savingsPerDay ?? DEFAULT_SLIDERS.savingsOnExtra,
          offDaySplit: parsed.offDaySplit ?? parsed.offDayRingFence ?? DEFAULT_SLIDERS.offDaySplit,
        })
      }
      const allOverrides: Record<string, Record<string, number>> = {}
      for (const m of MONTHS) {
        const key = `fin-bill-days-${m.year}-${String(m.month).padStart(2, '0')}`
        const val = localStorage.getItem(key)
        if (val) allOverrides[key] = JSON.parse(val)
      }
      setBillDayOverrides(allOverrides)

      // Load weekend states
      const wkdStates: Record<string, WeekendState> = {}
      for (const m of MONTHS) {
        const key = weekendStateKey(m.month, m.year)
        const val = localStorage.getItem(key)
        if (val) {
          try { wkdStates[key] = JSON.parse(val) } catch { /* ignore */ }
        }
      }
      setAllWeekendStates(wkdStates)

      // Load custom bills
      const cbRaw = localStorage.getItem('fin-custom-bills')
      if (cbRaw) {
        try {
          const parsed = JSON.parse(cbRaw) as CustomBill[]
          if (parsed.length === 0) {
            setCustomBills(SEED_CUSTOM_BILLS)
            localStorage.setItem('fin-custom-bills', JSON.stringify(SEED_CUSTOM_BILLS))
          } else {
            setCustomBills(parsed)
          }
        } catch { /* ignore */ }
      } else {
        setCustomBills(SEED_CUSTOM_BILLS)
        localStorage.setItem('fin-custom-bills', JSON.stringify(SEED_CUSTOM_BILLS))
      }

      // Load hidden bill IDs
      const hiddenRaw = localStorage.getItem('fin-bill-hidden')
      if (hiddenRaw) {
        try { setHiddenBillIds(new Set(JSON.parse(hiddenRaw))) } catch { /* ignore */ }
      }

      // Load balance overrides
      const boRaw = localStorage.getItem('fin-balance-overrides')
      if (boRaw) {
        try { setBalanceOverrides(JSON.parse(boRaw)) } catch { /* ignore */ }
      }

      // Load carry toggles for all months
      const toggles: Record<string, boolean> = {}
      for (const m of MONTHS) {
        const ymKey = `${m.year}-${String(m.month).padStart(2, '0')}`
        const raw = localStorage.getItem(`fin-carry-toggle-${ymKey}`)
        if (raw !== null) {
          try { toggles[ymKey] = JSON.parse(raw) } catch { /* ignore */ }
        }
      }
      setCarryToggles(toggles)

    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  // Persist settings
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fin-settings', JSON.stringify(settings))
    // Apply dark class to html element
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [settings, hydrated])

  // Apply dark class on hydration
  useEffect(() => {
    if (!hydrated) return
    if (settings.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [hydrated, settings.darkMode])

  // Persist sliders
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fin-sliders', JSON.stringify(sliders))
  }, [sliders, hydrated])

  // Persist custom bills
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fin-custom-bills', JSON.stringify(customBills))
  }, [customBills, hydrated])

  // Persist hidden bill IDs
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fin-bill-hidden', JSON.stringify(Array.from(hiddenBillIds)))
  }, [hiddenBillIds, hydrated])

  // Persist balance overrides
  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('fin-balance-overrides', JSON.stringify(balanceOverrides))
  }, [balanceOverrides, hydrated])

  // Theme object
  const theme = settings.darkMode ? DARK : LIGHT

  // Visible months (hide past months for UI, but compute all for carry-forward)
  const today = useMemo(() => new Date(), [])
  const todayMonthVal = today.getFullYear() * 100 + (today.getMonth() + 1)

  const visibleMonths = useMemo(
    () => MONTHS.filter(m => m.year * 100 + m.month >= todayMonthVal),
    [todayMonthVal]
  )

  // If selectedMonthIdx points to a hidden month, snap to first visible
  useEffect(() => {
    if (!hydrated) return
    const selectedMonth = MONTHS[selectedMonthIdx]
    if (selectedMonth) {
      const isVisible = selectedMonth.year * 100 + selectedMonth.month >= todayMonthVal
      if (!isVisible) {
        // find first visible index in MONTHS
        const firstVisibleIdx = MONTHS.findIndex(m => m.year * 100 + m.month >= todayMonthVal)
        if (firstVisibleIdx >= 0) setSelectedMonthIdx(firstVisibleIdx)
      }
    }
  }, [hydrated, selectedMonthIdx, todayMonthVal])

  // Simulate all months — still compute ALL for carry-forward accuracy
  const allSimulations = useMemo(() => {
    let pot = 0
    let prevRingFenceAccumulated = 0
    const sims: { month: MonthOption; days: DayData[]; endPot: number; ringFenceAccumulated: number }[] = []
    for (const m of MONTHS) {
      const mKey = `fin-bill-days-${m.year}-${String(m.month).padStart(2, '0')}`
      const overrides = billDayOverrides[mKey] ?? {}
      const wkdKey = weekendStateKey(m.month, m.year)
      const wkdState: WeekendState = allWeekendStates[wkdKey] ?? DEFAULT_WEEKEND_STATE
      const { days, endPot, ringFenceAccumulated } = simulateCycle(
        m.month, m.year, sliders, settings, overrides, pot, prevRingFenceAccumulated,
        wkdState.workedDays, wkdState.weekendRate, customBills, hiddenBillIds,
        wkdState.weekendBillsPerDay, wkdState.weekendSavings, balanceOverrides,
      )
      sims.push({ month: m, days, endPot, ringFenceAccumulated })
      pot = endPot
      // Check carry toggle for this month: key = YYYY-MM
      const ymKey = `${m.year}-${String(m.month).padStart(2, '0')}`
      const carryApplies = carryToggles[ymKey] !== false // default true
      prevRingFenceAccumulated = carryApplies ? ringFenceAccumulated : 0
    }
    return sims
  }, [sliders, settings, billDayOverrides, allWeekendStates, customBills, hiddenBillIds, balanceOverrides, carryToggles])

  const currentSim = allSimulations[selectedMonthIdx]
  const selectedMonth = MONTHS[selectedMonthIdx]

  const monthKey = `fin-bill-days-${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`
  const currentBillOverrides = billDayOverrides[monthKey] ?? {}

  const currentWkdKey = weekendStateKey(selectedMonth.month, selectedMonth.year)
  const currentWkdState: WeekendState = allWeekendStates[currentWkdKey] ?? DEFAULT_WEEKEND_STATE

  // Carry toggle for selected month
  const selectedMonthYMKey = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`
  const carryApplies = carryToggles[selectedMonthYMKey] !== false

  function toggleCarry() {
    const newVal = !carryApplies
    setCarryToggles(prev => ({ ...prev, [selectedMonthYMKey]: newVal }))
    localStorage.setItem(`fin-carry-toggle-${selectedMonthYMKey}`, JSON.stringify(newVal))
  }

  function updateWeekendState(patch: Partial<WeekendState>) {
    const updated: WeekendState = { ...currentWkdState, ...patch }
    setAllWeekendStates(prev => ({ ...prev, [currentWkdKey]: updated }))
    localStorage.setItem(currentWkdKey, JSON.stringify(updated))
  }

  function toggleWorkedDay(dom: number) {
    const days = currentWkdState.workedDays
    const next = days.includes(dom) ? days.filter(d => d !== dom) : [...days, dom]
    updateWeekendState({ workedDays: next })
  }

  function updateBillDay(billId: string, day: number) {
    const updated = { ...currentBillOverrides, [billId]: day }
    setBillDayOverrides(prev => ({ ...prev, [monthKey]: updated }))
    localStorage.setItem(monthKey, JSON.stringify(updated))
  }

  // Active bills for current month (static + custom)
  const activeBills = [
    ...BILLS.filter(b => isBillActive(b, selectedMonth.month, selectedMonth.year)),
    ...customBillsToBills(customBills, selectedMonth.month, selectedMonth.year, currentBillOverrides),
  ]

  const customBillIdSet = new Set(customBills.map(cb => cb.id))

  function updateSlider(key: keyof Sliders, value: number) {
    setSliders(prev => ({ ...prev, [key]: value }))
  }

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id))
  }

  function handleDragOver(event: { over: { id: string | number } | null }) {
    setOverDayId(event.over ? String(event.over.id) : null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    setOverDayId(null)
    const { active, over } = event
    if (!over) return
    const billId = String(active.id)
    const bill = activeBills.find(b => b.id === billId)
    if (!bill || !bill.moveable) return
    const parts = String(over.id).split('-')
    if (parts.length < 3 || parts[0] !== 'day') return
    const dom = Number(parts[1])
    if (!dom || dom < 1 || dom > 31) return
    updateBillDay(billId, dom)
  }

  const activeBillName = activeDragId ? (activeBills.find(b => b.id === activeDragId)?.name ?? '') : ''

  function hideBill(id: string) {
    setHiddenBillIds(prev => new Set([...prev, id]))
  }

  function showBill(id: string) {
    setHiddenBillIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function openEditBill(id: string) {
    const cb = customBills.find(b => b.id === id)
    if (cb) {
      setEditingBill(cb)
      setAddBillOpen(true)
    }
  }

  function handleSaveCustomBill(bill: CustomBill) {
    setCustomBills(prev => {
      const idx = prev.findIndex(b => b.id === bill.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = bill
        return next
      }
      return [...prev, bill]
    })
  }

  function openAddBill() {
    setEditingBill(null)
    setAddBillOpen(true)
  }

  // Balance override handlers
  function handleSetBalance(dateKey: string, value: number) {
    setBalanceOverrides(prev => ({ ...prev, [dateKey]: value }))
  }

  function handleRemoveBalance(dateKey: string) {
    setBalanceOverrides(prev => {
      const next = { ...prev }
      delete next[dateKey]
      return next
    })
  }

  // Day card context menu handler
  function handleDayCardContextMenu(menu: DayCardMenuState) {
    setDayCardMenu(menu)
  }

  function openBalanceModal(menu: DayCardMenuState) {
    const day = currentSim.days.find(d => {
      const dk = `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.dayOfMonth).padStart(2, '0')}`
      return dk === menu.dateKey
    })
    setBalanceOverrideModal({
      open: true,
      dateKey: menu.dateKey,
      dateLabel: menu.dateLabel,
      currentValue: balanceOverrides[menu.dateKey] ?? (day?.billsPotAfter ?? 0),
    })
  }

  // Dynamic slider maxes
  const billsMax = sliders.normalDayRate
  const savingsMax = Math.max(0, sliders.normalDayRate - sliders.billsPerDay)

  // Today's month/year for filtering past days
  const todayYear = today.getFullYear()
  const todayMonthNum = today.getMonth() + 1
  const todayDay = today.getDate()

  const isCurrentRealMonth = selectedMonth.year === todayYear && selectedMonth.month === todayMonthNum

  if (!hydrated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', color: '#94a3b8', fontSize: 14, background: '#f8fafc' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ background: theme.bg, minHeight: '100dvh', color: theme.textPrimary }}>
      {/* Settings panel */}
      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onSave={setSettings}
          onClose={() => setSettingsOpen(false)}
          theme={theme}
        />
      )}

      {/* Add/Edit bill modal */}
      {addBillOpen && (
        <AddBillModal
          onClose={() => { setAddBillOpen(false); setEditingBill(null) }}
          onSave={handleSaveCustomBill}
          existingBill={editingBill}
          dark={settings.darkMode}
        />
      )}

      {/* Bill context menu (bills mode) */}
      {contextMenu && (
        <BillContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onHide={hideBill}
          onShow={showBill}
          onEdit={openEditBill}
          theme={theme}
        />
      )}

      {/* Day card context menu (normal mode) */}
      {dayCardMenu && (
        <DayCardContextMenu
          menu={dayCardMenu}
          onClose={() => setDayCardMenu(null)}
          onSetBalance={() => openBalanceModal(dayCardMenu)}
          isToday={dayCardMenu.dateKey === todayKey}
          theme={theme}
        />
      )}

      {/* Balance override modal */}
      {balanceOverrideModal?.open && (
        <BalanceOverrideModal
          state={balanceOverrideModal}
          onSave={handleSetBalance}
          onRemove={handleRemoveBalance}
          onClose={() => setBalanceOverrideModal(null)}
          hasExisting={balanceOverrides[balanceOverrideModal.dateKey] !== undefined}
          theme={theme}
        />
      )}

      {/* Sticky header: Month tabs + gear */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: settings.darkMode ? 'rgba(8,13,20,0.96)' : 'rgba(248,250,252,0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          <div style={{
            display: 'flex', overflowX: 'auto', flex: 1,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}>
            {visibleMonths.map((m) => {
              const i = MONTHS.indexOf(m)
              const sim = allSimulations[i]
              const endPot = sim ? sim.endPot : 0
              const hasDeficit = sim ? sim.days.some(d => d.isPotNegative) : false
              const isActive = i === selectedMonthIdx
              return (
                <button
                  key={m.short}
                  onClick={() => setSelectedMonthIdx(i)}
                  style={{
                    flexShrink: 0,
                    padding: '12px 14px 10px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? theme.blue : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? theme.textPrimary : theme.textMuted }}>
                    {m.short}
                  </span>
                  <span style={{
                    fontSize: 9, fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                    color: hasDeficit ? theme.red : endPot >= 0 ? theme.green : theme.red,
                  }}>
                    {endPot >= 0 ? '+' : ''}{Math.round(endPot)}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            style={{
              flexShrink: 0, background: 'transparent', border: 'none',
              color: theme.textMuted, cursor: 'pointer', padding: '12px 10px',
            }}
          >
            <GearIcon size={20} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '12px 12px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* Month heading */}
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary, margin: 0 }}>
            {selectedMonth.label}
          </h1>
          <span style={{ fontSize: 12, color: theme.textMuted }}>
            cycle: {selectedMonth.short} 8 → {selectedMonth.month === 12 ? 'Jan' : MONTH_SHORT[selectedMonth.month]} 7
          </span>
        </div>

        {/* Sliders section */}
        <div style={{
          background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12,
          marginBottom: 10, overflow: 'hidden',
        }}>
          <button
            onClick={() => setSlidersOpen(o => !o)}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', cursor: 'pointer', color: theme.textPrimary,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Income &amp; allocation sliders</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: theme.textMuted }}>
                {fmt(sliders.normalDayRate)}/d · {fmt(sliders.billsPerDay)} bills · {fmt(sliders.savingsOnExtra)} save
              </span>
              <ChevronIcon down={!slidersOpen} size={16} />
            </div>
          </button>

          {slidersOpen && (
            <div style={{ padding: '4px 16px 16px' }}>
              <SliderRow
                label="Normal day rate (Uber/Bolt)"
                value={sliders.normalDayRate}
                min={0} max={200}
                onChange={v => updateSlider('normalDayRate', v)}
                color={theme.green}
                theme={theme}
              />
              <SliderRow
                label="Off-day rate (school holiday)"
                value={sliders.offDayRate}
                min={0} max={300}
                onChange={v => updateSlider('offDayRate', v)}
                color={theme.amber}
                theme={theme}
              />
              <SliderRow
                label="Bills per day (into bills pot)"
                value={sliders.billsPerDay}
                min={0} max={billsMax}
                onChange={v => updateSlider('billsPerDay', v)}
                color={theme.blue}
                theme={theme}
              />
              <SliderRow
                label="Savings on extra"
                value={sliders.savingsOnExtra}
                min={0} max={savingsMax}
                onChange={v => updateSlider('savingsOnExtra', v)}
                color={theme.purple}
                theme={theme}
              />
              <SliderRow
                label="Holiday carry-over per day"
                value={sliders.offDaySplit}
                min={0} max={sliders.offDayRate}
                onChange={v => updateSlider('offDaySplit', v)}
                color={theme.amber}
                theme={theme}
              />

              {/* Carry-over info + toggle */}
              <div style={{
                marginTop: 4, marginBottom: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 8,
              }}>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  Total carry-over this month: <strong style={{ color: theme.amber }}>{fmt(currentSim?.ringFenceAccumulated ?? 0)}</strong>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>Carry forward</span>
                  <button
                    onClick={toggleCarry}
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: carryApplies ? theme.blue : theme.border,
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 0.2s ease', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: carryApplies ? 18 : 2,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      display: 'block',
                    }} />
                  </button>
                </div>
              </div>

              {/* Quick summary */}
              <div style={{
                marginTop: 4, padding: '10px 12px',
                background: theme.bg, borderRadius: 8,
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
              }}>
                {[
                  { label: 'Spending (work)', value: fmt(Math.max(0, sliders.normalDayRate - sliders.billsPerDay - sliders.savingsOnExtra)) },
                  { label: 'Spending (off)', value: fmt(Math.max(0, sliders.offDayRate - sliders.billsPerDay - sliders.offDaySplit)) },
                  { label: 'Bills pot/day', value: `+${fmt(sliders.billsPerDay)}` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: theme.textMuted }}>{s.label}</div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>

        {/* Weekends accordion */}
        <WeekendsAccordion
          open={weekendsOpen}
          onToggle={() => setWeekendsOpen(o => !o)}
          month={selectedMonth.month}
          year={selectedMonth.year}
          wkdState={currentWkdState}
          onToggleDay={toggleWorkedDay}
          onRateChange={v => updateWeekendState({ weekendRate: v })}
          onBillsPerDayChange={v => updateWeekendState({ weekendBillsPerDay: v })}
          onSavingsChange={v => updateWeekendState({ weekendSavings: v })}
          theme={theme}
        />

        {/* Bills / Add row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setBillsMode(m => !m)}
            style={{
              flex: '0 0 42%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: billsMode ? `${theme.blue}26` : 'transparent',
              border: `1px solid ${billsMode ? theme.blue : theme.border}`,
              borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
              color: billsMode ? theme.blueLight : theme.textSecondary,
              fontSize: 13, fontWeight: 600,
              minHeight: 44,
              transition: 'all 0.2s ease',
            }}
          >
            <span>Bills</span>
            {billsMode ? <ChevronLeftIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
          <button
            onClick={openAddBill}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: `${theme.green}14`,
              border: `1px solid ${theme.green}40`,
              borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
              color: theme.green,
              fontSize: 13, fontWeight: 600,
              minHeight: 44,
              transition: 'all 0.2s ease',
            }}
          >
            <PlusIcon size={14} />
            <span>Add Bill</span>
          </button>
        </div>

        {/* Day cards OR Bills mode */}
        {!billsMode ? (
          <div style={{ marginBottom: 8 }}>
            {currentSim.days
              .filter(day => {
                if (!isCurrentRealMonth) return true
                // Hide past days in the current real-world month
                const d = day.date
                const dYear = d.getFullYear()
                const dMonth = d.getMonth() + 1
                const dDay = d.getDate()
                if (dYear < todayYear) return false
                if (dYear === todayYear && dMonth < todayMonthNum) return false
                if (dYear === todayYear && dMonth === todayMonthNum && dDay < todayDay) return false
                return true
              })
              .map((day, i) => {
                const mIdx = day.date.getMonth()
                const mShort = MONTH_SHORT[mIdx]
                const dk = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.dayOfMonth).padStart(2, '0')}`
                return (
                  <DayCard
                    key={i}
                    day={day}
                    monthShort={mShort}
                    theme={theme}
                    onContextMenu={handleDayCardContextMenu}
                    hasOverride={balanceOverrides[dk] !== undefined}
                  />
                )
              })}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div style={{ marginBottom: 8 }}>
              {currentSim.days
                .filter(day => {
                  if (!isCurrentRealMonth) return true
                  const d = day.date
                  const dYear = d.getFullYear()
                  const dMonth = d.getMonth() + 1
                  const dDay = d.getDate()
                  if (dYear < todayYear) return false
                  if (dYear === todayYear && dMonth < todayMonthNum) return false
                  if (dYear === todayYear && dMonth === todayMonthNum && dDay < todayDay) return false
                  return true
                })
                .map((day, i) => {
                  const dom = day.dayOfMonth
                  const monthIdx = day.date.getMonth()
                  const droppableId = `day-${dom}-${monthIdx}`
                  const billsOnThisDay = activeBills.filter(b => {
                    const assignedDay = getBillDay(b, day.date.getMonth() + 1, day.date.getFullYear(), currentBillOverrides)
                    return assignedDay === dom && (day.date.getMonth() + 1 === selectedMonth.month
                      ? isBillActive(b, selectedMonth.month, selectedMonth.year)
                      : isBillActive(b, day.date.getMonth() + 1, day.date.getFullYear()))
                  })
                  const billAmounts: Record<string, number> = {}
                  billsOnThisDay.forEach(b => { billAmounts[b.id] = b.amount })

                  return (
                    <DroppableDayRow
                      key={i}
                      dayData={day}
                      bills={billsOnThisDay}
                      billAmounts={billAmounts}
                      isOver={overDayId === droppableId}
                      hiddenBillIds={hiddenBillIds}
                      customBillIds={customBillIdSet}
                      onBillContextMenu={setContextMenu}
                      theme={theme}
                    />
                  )
                })}
            </div>

            <DragOverlay>
              {activeDragId ? (
                <div style={{
                  background: theme.borderStrong, border: `1px solid ${theme.blue}`, borderRadius: 8,
                  padding: '6px 12px', fontSize: 13, color: theme.textPrimary, fontWeight: 600,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}>
                  {activeBillName}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Month totals */}
        <MonthTotals days={currentSim.days} sliders={sliders} theme={theme} />

      </div>
    </div>
  )
}
