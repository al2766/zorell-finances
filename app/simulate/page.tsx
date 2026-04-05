'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import {
  getBillsForMonth,
  getMonthlyOutgoings,
  getWorkingDaysInMonth,
  getAFJDaysInMonth,
  getAFJIncomeEarnedInMonth,
} from '@/lib/calculations'
import { getCarCost, MONTH_NAMES, BILLS } from '@/lib/data'

function fmt(n: number): string {
  return Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtSigned(n: number): string {
  return (n >= 0 ? '+' : '-') + '£' + fmt(n)
}

const MONTHS = [
  { month: 4, year: 2026, label: 'Apr 2026' },
  { month: 5, year: 2026, label: 'May 2026' },
  { month: 6, year: 2026, label: 'Jun 2026' },
  { month: 7, year: 2026, label: 'Jul 2026' },
  { month: 8, year: 2026, label: 'Aug 2026' },
  { month: 9, year: 2026, label: 'Sep 2026' },
  { month: 10, year: 2026, label: 'Oct 2026' },
  { month: 11, year: 2026, label: 'Nov 2026' },
  { month: 12, year: 2026, label: 'Dec 2026' },
]

const DEBT_TOGGLES = [
  { id: 'jaja', name: 'Jaja', amount: 391.00 },
  { id: 'ao-plan-1', name: 'AO Plan 1', amount: 51.50 },
  { id: 'ao-plan-2', name: 'AO Plan 2', amount: 21.59 },
  { id: 'ao-plan-3', name: 'AO Plan 3', amount: 45.67 },
  { id: 'ao-plan-4', name: 'AO Plan 4', amount: 78.59 },
  { id: 'sofa-novuna', name: 'Sofa/Novuna', amount: 76.50 },
]

export default function SimulatePage() {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // Default to current month or Apr 2026 if outside range
  const defaultIdx = MONTHS.findIndex(m => m.month === currentMonth && m.year === currentYear)
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const [dailyRate, setDailyRate] = useState(70)
  const [excludedDebts, setExcludedDebts] = useState<Set<string>>(new Set())

  useEffect(() => {
    const saved = localStorage.getItem('simulatorSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      if (settings.dailyRate) setDailyRate(settings.dailyRate)
    }
    const savedTarget = localStorage.getItem('dailyTarget')
    if (savedTarget) setDailyRate(parseFloat(savedTarget))
  }, [])

  const saveSettings = (rate: number) => {
    localStorage.setItem('simulatorSettings', JSON.stringify({ dailyRate: rate }))
    localStorage.setItem('dailyTarget', rate.toString())
  }

  const { month, year } = MONTHS[selectedIdx]

  const activeBills = getBillsForMonth(month, year)
  const filteredBills = activeBills.filter(b => !excludedDebts.has(b.id))
  const billsTotal = filteredBills.reduce((s, b) => s + b.amount, 0)

  const car = getCarCost(month, year)
  const totalOutgoings = billsTotal + car.monthly + car.fuel

  const workingDays = getWorkingDaysInMonth(month, year)
  const afjDays = getAFJDaysInMonth(month, year)
  const afjIncome = afjDays * 85

  const [manualWorkingDays, setManualWorkingDays] = useState<number | null>(null)
  const [manualAfjDays, setManualAfjDays] = useState<number | null>(null)

  const effectiveWorkingDays = manualWorkingDays ?? workingDays
  const effectiveAfjDays = manualAfjDays ?? afjDays
  const effectiveAfjIncome = effectiveAfjDays * 85

  const uberIncome = dailyRate * effectiveWorkingDays
  const totalIncome = effectiveAfjIncome + uberIncome
  const result = totalIncome - totalOutgoings
  const breakEvenDaily = effectiveWorkingDays > 0 ? (totalOutgoings - effectiveAfjIncome) / effectiveWorkingDays : 0

  const toggleDebt = (id: string) => {
    setExcludedDebts(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const scenarioResult = (rate: number) => {
    const uber = rate * effectiveWorkingDays
    const income = effectiveAfjIncome + uber
    return income - totalOutgoings
  }

  const debtExcludedTotal = DEBT_TOGGLES.filter(d => excludedDebts.has(d.id)).reduce((s, d) => s + d.amount, 0)

  return (
    <div className="page-content">
      <h1 className="section-header">Simulate</h1>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12 }}>
        {MONTHS.map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            style={{
              flexShrink: 0,
              padding: '8px 14px',
              borderRadius: 20,
              border: 'none',
              background: selectedIdx === i ? 'var(--blue)' : 'var(--card)',
              color: selectedIdx === i ? 'white' : 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Daily slider */}
      <Card title="Daily Uber + Bolt">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div className="big-number" style={{ color: 'var(--blue)' }}>£{dailyRate}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>per day</div>
        </div>
        <input
          type="range"
          min={40}
          max={150}
          step={5}
          value={dailyRate}
          onChange={e => {
            const v = parseInt(e.target.value)
            setDailyRate(v)
            saveSettings(v)
          }}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          <span>£40</span>
          <span>£150</span>
        </div>
      </Card>

      {/* Working days */}
      <Card>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>Working days</div>
            <input
              type="number"
              value={manualWorkingDays ?? workingDays}
              onChange={e => setManualWorkingDays(parseInt(e.target.value) || workingDays)}
              style={{
                width: '100%',
                fontSize: 22,
                fontWeight: 700,
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                background: 'var(--bg)',
                textAlign: 'center',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textAlign: 'center' }}>
              default: {workingDays}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ marginBottom: 6 }}>AFJ days</div>
            <input
              type="number"
              value={manualAfjDays ?? afjDays}
              onChange={e => setManualAfjDays(parseInt(e.target.value) || afjDays)}
              style={{
                width: '100%',
                fontSize: 22,
                fontWeight: 700,
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px',
                background: 'var(--bg)',
                textAlign: 'center',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, textAlign: 'center' }}>
              default: {afjDays}
            </div>
          </div>
        </div>
      </Card>

      {/* Results card */}
      <Card title="Monthly breakdown">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>AFJ income</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>£{effectiveAfjIncome.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Uber+Bolt ({effectiveWorkingDays}d × £{dailyRate})</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>£{uberIncome.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Total income</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>£{totalIncome.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Bills</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>-£{billsTotal.toFixed(0)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Car ({month === 4 && year === 2026 ? 'Leon' : 'Corolla'})</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>-£{car.monthly}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Fuel</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>-£{car.fuel}</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            {result >= 0 ? 'Monthly surplus' : 'Monthly deficit'}
          </div>
          <div className="big-number" style={{ color: result >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {result >= 0 ? '+' : '-'}£{fmt(result)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            Break-even: £{breakEvenDaily.toFixed(2)}/day
          </div>
        </div>

        {excludedDebts.size > 0 && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(52,199,89,0.08)' }}>
            <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
              Excluding £{debtExcludedTotal.toFixed(2)}/mo in debts (hypothetical)
            </div>
          </div>
        )}
      </Card>

      {/* Scenario comparison */}
      <Card title="Quick scenarios">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[70, 80, 100].map(rate => {
            const r = scenarioResult(rate)
            return (
              <div
                key={rate}
                onClick={() => { setDailyRate(rate); saveSettings(rate) }}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `2px solid ${dailyRate === rate ? 'var(--blue)' : 'var(--border)'}`,
                  background: dailyRate === rate ? 'rgba(0,122,255,0.06)' : 'var(--bg)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 15 }}>£{rate}/d</div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: r >= 0 ? 'var(--green)' : 'var(--red)',
                  marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {r >= 0 ? '+' : '-'}£{fmt(r)}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Debt toggles */}
      <Card title="Exclude debts (hypothetical)">
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Toggle to see impact of removing debts from calculations
        </div>
        {DEBT_TOGGLES.map(debt => {
          const active = getBillsForMonth(month, year).some(b => b.id === debt.id)
          const excluded = excludedDebts.has(debt.id)
          return (
            <div key={debt.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid var(--border)',
              opacity: !active ? 0.4 : 1,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{debt.name}</div>
                {!active && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Not active this month</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>£{debt.amount.toFixed(2)}</span>
                {active && (
                  <div
                    className={`toggle ${excluded ? 'on' : ''}`}
                    style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}
                    onClick={() => toggleDebt(debt.id)}
                  >
                    <div className="toggle-thumb" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
