'use client'

import { useState, useMemo } from 'react'
import {
  BILLS,
  HOLIDAYS,
  AFJ_DAILY_RATE,
  AFJ_FULL_TERM_DAYS,
  MONTH_SHORT,
  MONTH_NAMES,
} from '@/lib/data'

// ─── Types ─────────────────────────────────────────────────────

interface MonthOption {
  month: number  // 1-12
  year: number
  label: string
  short: string
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

// ─── Helpers ───────────────────────────────────────────────────

function fmt(n: number, dec = 2) {
  return '£' + Math.abs(n).toFixed(dec)
}

function fmtInt(n: number) {
  return '£' + Math.round(n).toLocaleString()
}

/** Get working days lost for a given month from HOLIDAYS */
function getOffDaysForMonth(month: number, year: number): number {
  let total = 0
  for (const h of HOLIDAYS) {
    const start = new Date(h.startDate)
    const end = new Date(h.endDate)
    // Count working days lost that fall IN this calendar month
    let days = 0
    const d = new Date(start)
    while (d <= end) {
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        const dow = d.getDay()
        if (dow !== 0 && dow !== 6) days++
      }
      d.setDate(d.getDate() + 1)
    }
    total += days
  }
  return total
}

/** Calculate school days for a month (20 - off days in that month) */
function schoolDaysForMonth(month: number, year: number): number {
  const offDays = getOffDaysForMonth(month, year)
  return Math.max(0, AFJ_FULL_TERM_DAYS - offDays)
}

/** Get previous month */
function prevMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 }
  return { month: month - 1, year }
}

/** Get active bills for a month */
function activeBillsForMonth(month: number, year: number) {
  return BILLS.filter(b => {
    // Check starts
    if (b.startsMonth && b.startsYear) {
      const startOrd = b.startsYear * 12 + b.startsMonth
      const thisOrd = year * 12 + month
      if (thisOrd < startOrd) return false
    }
    // Check ends
    if (b.endsMonth !== null && b.endsYear !== null) {
      const endOrd = b.endsYear * 12 + b.endsMonth
      const thisOrd = year * 12 + month
      if (thisOrd > endOrd) return false
    }
    return true
  })
}

// ─── Slider Component ───────────────────────────────────────────

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  format: (v: number) => string
  onChange: (v: number) => void
  color?: string
  info?: string
}

function Slider({ label, value, min, max, step = 1, format, onChange, color = '#93c5fd', info }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="mb-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>{label}</p>
          {info && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{info}</p>}
        </div>
        <p className="text-xl font-semibold tabular-nums ml-4" style={{ color }}>{format(value)}</p>
      </div>
      <div className="relative mt-3">
        <div
          className="absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 pointer-events-none transition-all"
          style={{ width: `${pct}%`, background: color, opacity: 0.6 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'relative', zIndex: 1 }}
        />
      </div>
    </div>
  )
}

// ─── Income Bar ─────────────────────────────────────────────────

function IncomeBar({
  afjReceived,
  normalUberIncome,
  offDaySpendable,
  offDayRingFenced,
}: {
  afjReceived: number
  normalUberIncome: number
  offDaySpendable: number
  offDayRingFenced: number
}) {
  const total = afjReceived + normalUberIncome + offDaySpendable + offDayRingFenced
  if (total === 0) return null

  const pctAFJ = (afjReceived / total) * 100
  const pctNormal = (normalUberIncome / total) * 100
  const pctOff = (offDaySpendable / total) * 100
  const pctRing = (offDayRingFenced / total) * 100

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>Income breakdown</p>
      <div className="flex h-6 rounded-lg overflow-hidden mb-3" style={{ background: '#0a0f1a' }}>
        {pctAFJ > 0 && (
          <div style={{ width: `${pctAFJ}%`, background: '#93c5fd', transition: 'width 0.3s ease' }} title={`AFJ ${fmtInt(afjReceived)}`} />
        )}
        {pctNormal > 0 && (
          <div style={{ width: `${pctNormal}%`, background: '#34c759', transition: 'width 0.3s ease' }} title={`Normal Uber ${fmtInt(normalUberIncome)}`} />
        )}
        {pctOff > 0 && (
          <div style={{ width: `${pctOff}%`, background: '#fbbf24', transition: 'width 0.3s ease' }} title={`Off-day spendable ${fmtInt(offDaySpendable)}`} />
        )}
        {pctRing > 0 && (
          <div
            style={{
              width: `${pctRing}%`,
              background: 'repeating-linear-gradient(45deg, #ff3b30 0px, #ff3b30 4px, rgba(255,59,48,0.3) 4px, rgba(255,59,48,0.3) 8px)',
              transition: 'width 0.3s ease',
            }}
            title={`Ring-fenced ${fmtInt(offDayRingFenced)}`}
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#93c5fd' }} />
          <span className="text-xs" style={{ color: '#64748b' }}>AFJ</span>
          <span className="text-xs font-mono ml-auto" style={{ color: '#94a3b8' }}>{fmtInt(afjReceived)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#34c759' }} />
          <span className="text-xs" style={{ color: '#64748b' }}>Uber normal</span>
          <span className="text-xs font-mono ml-auto" style={{ color: '#94a3b8' }}>{fmtInt(normalUberIncome)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#fbbf24' }} />
          <span className="text-xs" style={{ color: '#64748b' }}>Off-day spend</span>
          <span className="text-xs font-mono ml-auto" style={{ color: '#94a3b8' }}>{fmtInt(offDaySpendable)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#ff3b30', opacity: 0.7 }}
          />
          <span className="text-xs" style={{ color: '#64748b' }}>Ring-fenced</span>
          <span className="text-xs font-mono ml-auto" style={{ color: '#94a3b8' }}>{fmtInt(offDayRingFenced)}</span>
        </div>
      </div>
      <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '1px solid #1e293b' }}>
        <span className="text-sm font-semibold" style={{ color: '#475569' }}>Total income</span>
        <span className="text-lg font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>{fmtInt(total)}</span>
      </div>
    </div>
  )
}

// ─── Bills Gauge ────────────────────────────────────────────────

function BillsGauge({ totalIncome, totalBills }: { totalIncome: number; totalBills: number }) {
  const covered = totalIncome >= totalBills
  const pct = Math.min(100, (totalBills / Math.max(totalIncome, 1)) * 100)

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>Bills vs income</p>
      <div className="relative h-6 rounded-lg overflow-hidden mb-3" style={{ background: '#0a0f1a' }}>
        {/* Income bar */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{ background: covered ? 'rgba(52,199,89,0.2)' : 'rgba(255,59,48,0.2)' }}
        />
        {/* Bills threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${pct}%`,
            background: covered ? '#34c759' : '#ff3b30',
            transition: 'left 0.3s ease',
          }}
        />
        <div
          className="absolute top-0 bottom-0 left-0 rounded-lg transition-all"
          style={{
            width: `${pct}%`,
            background: covered ? 'rgba(52,199,89,0.4)' : 'rgba(255,59,48,0.4)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-[10px]" style={{ color: '#475569' }}>Bills</p>
          <p className="font-semibold tabular-nums" style={{ color: covered ? '#34c759' : '#ff3b30' }}>{fmtInt(totalBills)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px]" style={{ color: '#475569' }}>Income</p>
          <p className="font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>{fmtInt(totalIncome)}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Payday Moment Card ─────────────────────────────────────────

function PaydayMoment({
  afjReceived,
  paydayCluster,
  shortfall,
}: {
  afjReceived: number
  paydayCluster: number
  shortfall: number
}) {
  const covered = shortfall === 0

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: '#0d1117',
        border: `1px solid ${covered ? 'rgba(52,199,89,0.3)' : 'rgba(255,59,48,0.3)'}`,
      }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>Payday moment</p>
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base"
          style={{ background: covered ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)' }}
        >
          {covered ? '✓' : '!'}
        </div>
        <div>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            On the 8th, AFJ of{' '}
            <span className="font-semibold" style={{ color: '#93c5fd' }}>{fmtInt(afjReceived)}</span>{' '}
            arrives. Payday bills:{' '}
            <span className="font-semibold" style={{ color: '#f1f5f9' }}>{fmtInt(paydayCluster)}</span>
          </p>
          {covered ? (
            <p className="text-sm mt-1" style={{ color: '#34c759' }}>AFJ covers payday cluster.</p>
          ) : (
            <>
              <p className="text-sm mt-1" style={{ color: '#ff3b30' }}>
                Shortfall: <span className="font-semibold">{fmtInt(shortfall)}</span> must come from bills float.
              </p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                Bills float needs at least {fmtInt(shortfall)} going in on D7.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Monthly Outcome Cards ──────────────────────────────────────

function MonthlyOutcome({
  totalBills,
  spendingMoney,
  savings,
  ringFenced,
  totalIncome,
}: {
  totalBills: number
  spendingMoney: number
  savings: number
  ringFenced: number
  totalIncome: number
}) {
  const covered = totalIncome >= totalBills

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>Monthly outcome</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg p-3 text-center" style={{ background: '#0a0f1a' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Bills</p>
          <p className="text-base font-semibold tabular-nums" style={{ color: covered ? '#34c759' : '#ff3b30' }}>
            {fmtInt(totalBills)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: covered ? '#34c759' : '#ff3b30' }}>
            {covered ? 'covered' : 'shortfall'}
          </p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: '#0a0f1a' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Spending</p>
          <p className="text-base font-semibold tabular-nums" style={{ color: spendingMoney > 0 ? '#f1f5f9' : '#ff3b30' }}>
            {spendingMoney >= 0 ? fmtInt(spendingMoney) : '-' + fmtInt(spendingMoney)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>free cash</p>
        </div>
        <div className="rounded-lg p-3 text-center" style={{ background: '#0a0f1a' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Saved</p>
          <p className="text-base font-semibold tabular-nums" style={{ color: '#34c759' }}>
            {fmtInt(savings + ringFenced)}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
            {ringFenced > 0 ? `${fmtInt(ringFenced)} ring-fenced` : 'from surplus'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── All Months Overview ────────────────────────────────────────

interface MonthStatus {
  month: number
  year: number
  short: string
  surplus: number
  status: 'green' | 'amber' | 'red'
}

function AllMonthsOverview({
  months,
  selectedIdx,
  normalDayRate,
  offDayRate,
  offDayRingFencePct,
  savingsPct,
  onSelect,
}: {
  months: MonthOption[]
  selectedIdx: number
  normalDayRate: number
  offDayRate: number
  offDayRingFencePct: number
  savingsPct: number
  onSelect: (i: number) => void
}) {
  const statuses: MonthStatus[] = useMemo(() => {
    return months.map(m => {
      const offDays = getOffDaysForMonth(m.month, m.year)
      const prev = prevMonth(m.month, m.year)
      const prevSchoolDays = schoolDaysForMonth(prev.month, prev.year)
      const normalUberDays = Math.max(0, 22 - offDays)
      const normalUberIncome = normalUberDays * normalDayRate
      const offDayIncome = offDays * offDayRate
      const offDayRingFenced = offDayIncome * (offDayRingFencePct / 100)
      const offDaySpendable = offDayIncome - offDayRingFenced
      const afjReceived = prevSchoolDays * AFJ_DAILY_RATE
      const totalIncome = afjReceived + normalUberIncome + offDaySpendable
      const bills = activeBillsForMonth(m.month, m.year)
      const totalBills = bills.reduce((s, b) => s + b.amount, 0)
      const surplus = totalIncome - totalBills

      const status: MonthStatus['status'] = surplus > 200 ? 'green' : surplus > 0 ? 'amber' : 'red'
      return { month: m.month, year: m.year, short: m.short, surplus, status }
    })
  }, [months, normalDayRate, offDayRate, offDayRingFencePct, savingsPct])

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#475569' }}>All months overview</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((s, i) => {
          const color = s.status === 'green' ? '#34c759' : s.status === 'amber' ? '#fbbf24' : '#ff3b30'
          const isSelected = i === selectedIdx
          return (
            <button
              key={`${s.month}-${s.year}`}
              onClick={() => onSelect(i)}
              className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all"
              style={{
                background: isSelected ? '#1e293b' : '#0a0f1a',
                border: `1px solid ${isSelected ? '#334155' : '#1e293b'}`,
                minWidth: 52,
              }}
            >
              <span className="text-xs font-semibold" style={{ color: isSelected ? '#f1f5f9' : '#64748b' }}>{s.short}</span>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] font-mono" style={{ color }}>
                {s.surplus >= 0 ? '+' : ''}{Math.round(s.surplus / 10) * 10 === 0 ? '0' : (Math.round(s.surplus / 10) * 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main SimulateTab ───────────────────────────────────────────

export default function SimulateTab() {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [normalDayRate, setNormalDayRate] = useState(70)
  const [offDayRate, setOffDayRate] = useState(150)
  const [offDayRingFencePct, setOffDayRingFencePct] = useState(50)
  const [savingsPct, setSavingsPct] = useState(10)

  const selectedMonth = MONTHS[selectedIdx]

  const calc = useMemo(() => {
    const m = selectedMonth.month
    const y = selectedMonth.year
    const prev = prevMonth(m, y)

    const offDays = getOffDaysForMonth(m, y)
    const prevSchoolDays = schoolDaysForMonth(prev.month, prev.year)
    const thisSchoolDays = schoolDaysForMonth(m, y)

    const normalUberDays = Math.max(0, 22 - offDays)
    const normalUberIncome = normalUberDays * normalDayRate
    const offDayIncome = offDays * offDayRate
    const offDayRingFenced = offDayIncome * (offDayRingFencePct / 100)
    const offDaySpendable = offDayIncome - offDayRingFenced
    const afjReceived = prevSchoolDays * AFJ_DAILY_RATE

    const totalIncome = afjReceived + normalUberIncome + offDaySpendable

    const bills = activeBillsForMonth(m, y)
    const totalBills = bills.reduce((s, b) => s + b.amount, 0)
    const paydayCluster = bills.filter(b => b.day >= 8 && b.day <= 10).reduce((s, b) => s + b.amount, 0)
    const afjCoversPayday = afjReceived >= paydayCluster
    const shortfall = Math.max(0, paydayCluster - afjReceived)

    const surplus = totalIncome - totalBills
    const savings = Math.max(0, surplus) * (savingsPct / 100)
    const spendingMoney = surplus - savings

    return {
      offDays,
      prevSchoolDays,
      thisSchoolDays,
      normalUberDays,
      normalUberIncome,
      offDayIncome,
      offDayRingFenced,
      offDaySpendable,
      afjReceived,
      totalIncome,
      totalBills,
      paydayCluster,
      afjCoversPayday,
      shortfall,
      surplus,
      savings,
      spendingMoney,
    }
  }, [selectedMonth, normalDayRate, offDayRate, offDayRingFencePct, savingsPct])

  return (
    <div className="px-4 pt-4 space-y-4">

      {/* Month selector */}
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#475569' }}>Select month</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MONTHS.map((m, i) => (
            <button
              key={`${m.month}-${m.year}`}
              onClick={() => setSelectedIdx(i)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={i === selectedIdx
                ? { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
                : { background: '#0d1117', color: '#475569', border: '1px solid #1e293b' }}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>

      {/* Month stats */}
      <div
        className="grid grid-cols-3 gap-2 rounded-xl p-3"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}
      >
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Off days</p>
          <p className="text-lg font-semibold" style={{ color: calc.offDays > 0 ? '#fbbf24' : '#34c759' }}>{calc.offDays}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>School days</p>
          <p className="text-lg font-semibold" style={{ color: '#94a3b8' }}>{calc.thisSchoolDays}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Prev school</p>
          <p className="text-lg font-semibold" style={{ color: '#93c5fd' }}>{calc.prevSchoolDays}</p>
        </div>
      </div>

      {/* Sliders */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-4" style={{ color: '#475569' }}>Income inputs</p>

        <Slider
          label="Normal day earnings"
          value={normalDayRate}
          min={30}
          max={200}
          format={v => `£${v}`}
          onChange={setNormalDayRate}
          color="#34c759"
        />

        <Slider
          label="Off-day earnings"
          value={offDayRate}
          min={30}
          max={250}
          format={v => `£${v}`}
          onChange={setOffDayRate}
          color="#fbbf24"
          info="Days when AFJ is replaced by Uber"
        />

        <Slider
          label="Ring-fence from off-day earnings"
          value={offDayRingFencePct}
          min={0}
          max={100}
          format={v => `${v}%`}
          onChange={setOffDayRingFencePct}
          color="#ff3b30"
          info="Set aside for next month's AFJ shortfall"
        />

        <Slider
          label="Save from normal surplus"
          value={savingsPct}
          min={0}
          max={50}
          format={v => `${v}%`}
          onChange={setSavingsPct}
          color="#93c5fd"
          info="Applied to money left after bills"
        />
      </div>

      {/* Visual panels */}
      <IncomeBar
        afjReceived={calc.afjReceived}
        normalUberIncome={calc.normalUberIncome}
        offDaySpendable={calc.offDaySpendable}
        offDayRingFenced={calc.offDayRingFenced}
      />

      <BillsGauge totalIncome={calc.totalIncome} totalBills={calc.totalBills} />

      <PaydayMoment
        afjReceived={calc.afjReceived}
        paydayCluster={calc.paydayCluster}
        shortfall={calc.shortfall}
      />

      <MonthlyOutcome
        totalBills={calc.totalBills}
        spendingMoney={calc.spendingMoney}
        savings={calc.savings}
        ringFenced={calc.offDayRingFenced}
        totalIncome={calc.totalIncome}
      />

      <AllMonthsOverview
        months={MONTHS}
        selectedIdx={selectedIdx}
        normalDayRate={normalDayRate}
        offDayRate={offDayRate}
        offDayRingFencePct={offDayRingFencePct}
        savingsPct={savingsPct}
        onSelect={setSelectedIdx}
      />

      {/* Car note */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: '#0d1117', border: '1px solid #1e293b' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#334155' }}>Note</p>
        <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>
          Car rental is separate and not included in bills calculations.
          Apr 2026: Seat Leon ~£433/mo. May 2026+: Corolla ~£1,083/mo.
          Factor this into your spending budget.
        </p>
      </div>
    </div>
  )
}
