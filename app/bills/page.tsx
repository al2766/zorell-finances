'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import {
  getBillsForMonth,
  getMonthlyBillsTotal,
  getBillsByDay,
  calculateEvenSpread,
  getRequiredDailyTarget,
  getWorkingDaysInMonth,
} from '@/lib/calculations'
import { BILLS, CATEGORY_BG, MONTH_NAMES } from '@/lib/data'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const CATEGORY_BORDER: Record<string, string> = {
  debt: '#ff3b30',
  housing: '#007aff',
  utility: '#34c759',
  subscription: '#ff9500',
  personal: '#8e8e93',
}

export default function BillsPage() {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  const [testMode, setTestMode] = useState(false)
  const [dayOverrides, setDayOverrides] = useState<Record<string, number>>({})
  const [evenSpreadApplied, setEvenSpreadApplied] = useState(false)

  const activeBills = getBillsForMonth(month, year, testMode ? dayOverrides : undefined)
  const totalBills = activeBills.reduce((s, b) => s + b.amount, 0)

  const byDay = getBillsByDay(month, year, testMode ? dayOverrides : undefined)
  const daysInMonth = new Date(year, month, 0).getDate()

  const chartData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    amount: byDay[i + 1] ?? 0,
  }))

  const moveableBills = activeBills.filter(b => b.moveable)
  const fixedBills = activeBills.filter(b => !b.moveable)

  const originalTarget = getRequiredDailyTarget(month, year)
  const workingDays = getWorkingDaysInMonth(month, year)

  const evenSpread = calculateEvenSpread(month, year)

  const handleApplyEvenSpread = () => {
    setDayOverrides(prev => ({ ...prev, ...evenSpread }))
    setEvenSpreadApplied(true)
  }

  const handleResetSpread = () => {
    setDayOverrides({})
    setEvenSpreadApplied(false)
  }

  const getDisplayDay = (id: string, defaultDay: number) => {
    return dayOverrides[id] ?? defaultDay
  }

  // Week totals
  const weekTotal = (bills: typeof activeBills) => {
    const weeks: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    bills.forEach(b => {
      const day = dayOverrides[b.id] ?? b.day
      const week = Math.ceil(day / 7)
      weeks[week] = (weeks[week] ?? 0) + b.amount
    })
    return weeks
  }

  const originalWeeks = weekTotal(getBillsForMonth(month, year))
  const proposedWeeks = weekTotal(getBillsForMonth(month, year, dayOverrides))

  return (
    <div className="page-content">
      <h1 className="section-header">Bills</h1>

      {/* Monthly total */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>{MONTH_NAMES[month - 1]} {year}</div>
            <div className="big-number">£{fmt(totalBills)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {activeBills.length} bills active
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fixed</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>£{fmt(fixedBills.reduce((s, b) => s + b.amount, 0))}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Moveable</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>£{fmt(moveableBills.reduce((s, b) => s + b.amount, 0))}</div>
          </div>
        </div>
      </Card>

      {/* Distribution chart */}
      <Card title="Daily bill distribution">
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={8} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `£${v}`}
              />
              <Tooltip
                formatter={(v) => [`£${fmt(Number(v))}`, 'Bills']}
                contentStyle={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                  padding: '6px 10px',
                }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.amount > 200 ? 'var(--red)' : entry.amount > 50 ? 'var(--amber)' : 'var(--blue)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Test date changes toggle */}
      <Card>
        <label className="toggle-label">
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Test date changes</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Adjust moveable bill dates live
            </div>
          </div>
          <div
            className={`toggle ${testMode ? 'on' : ''}`}
            onClick={() => setTestMode(!testMode)}
          >
            <div className="toggle-thumb" />
          </div>
        </label>

        {testMode && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button
                onClick={handleApplyEvenSpread}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'var(--blue)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Even spread
              </button>
              {Object.keys(dayOverrides).length > 0 && (
                <button
                  onClick={handleResetSpread}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.06)',
                    color: 'var(--text-primary)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              )}
            </div>

            {Object.keys(dayOverrides).length > 0 && (
              <div style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(0, 122, 255, 0.06)',
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Week-by-week comparison</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Week</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Current</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Proposed</div>
                  {[1, 2, 3, 4].map(w => (
                    <>
                      <div key={`w-${w}`}>Week {w}</div>
                      <div key={`o-${w}`}>£{fmt(originalWeeks[w] ?? 0)}</div>
                      <div key={`p-${w}`} style={{ color: 'var(--blue)' }}>£{fmt(proposedWeeks[w] ?? 0)}</div>
                    </>
                  ))}
                </div>
              </div>
            )}

            {moveableBills.map(bill => (
              <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, fontSize: 14 }}>{bill.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Day</div>
                <input
                  type="number"
                  min={1}
                  max={daysInMonth}
                  value={getDisplayDay(bill.id, bill.day)}
                  onChange={e => setDayOverrides(prev => ({ ...prev, [bill.id]: parseInt(e.target.value) || bill.day }))}
                  style={{
                    width: 56,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'center',
                    background: 'var(--bg)',
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bills list */}
      <Card title="All bills this month">
        {activeBills
          .slice()
          .sort((a, b) => (testMode ? getDisplayDay(a.id, a.day) : a.day) - (testMode ? getDisplayDay(b.id, b.day) : b.day))
          .map(bill => (
            <div key={bill.id} className="bill-row">
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                flexShrink: 0,
              }}>
                {testMode ? getDisplayDay(bill.id, bill.day) : bill.day}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{bill.name}</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span className={`chip ${CATEGORY_BG[bill.category]}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                    {bill.category}
                  </span>
                  {bill.endsMonth && bill.endsYear && (
                    <span className="chip chip-red" style={{ fontSize: 11, padding: '2px 8px' }}>
                      ends {bill.endsMonth}/{bill.endsYear}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: 'tabular-nums' }}>
                £{fmt(bill.amount)}
              </div>
            </div>
          ))}
      </Card>
    </div>
  )
}
