'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import {
  getMonthlyResult,
  getMonthlyOutgoings,
  getMonthlyBillsTotal,
  getDebtClearanceEvents,
  findSurplusMonth,
  getBillsForMonth,
} from '@/lib/calculations'
import { getCarCost, MONTH_NAMES, MONTH_SHORT } from '@/lib/data'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

function fmt(n: number): string {
  return Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmt2(n: number): string {
  return Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const CHART_MONTHS = [
  { month: 4, year: 2026 },
  { month: 5, year: 2026 },
  { month: 6, year: 2026 },
  { month: 7, year: 2026 },
  { month: 8, year: 2026 },
  { month: 9, year: 2026 },
  { month: 10, year: 2026 },
  { month: 11, year: 2026 },
  { month: 12, year: 2026 },
]

export default function FuturePage() {
  const [dailyRate, setDailyRate] = useState(70)
  const [surplusTarget, setSurplusTarget] = useState(2500)

  useEffect(() => {
    const saved = localStorage.getItem('dailyTarget')
    if (saved) setDailyRate(parseFloat(saved))
  }, [])

  const chartData = CHART_MONTHS.map(({ month, year }) => {
    const result = getMonthlyResult(month, year, dailyRate)
    return {
      label: MONTH_SHORT[month - 1],
      month,
      year,
      result,
      outgoings: getMonthlyOutgoings(month, year),
      bills: getMonthlyBillsTotal(month, year),
    }
  })

  const debtEvents = getDebtClearanceEvents()

  const surplusMonth = findSurplusMonth(dailyRate, surplusTarget)

  // Running total table
  const tableData = CHART_MONTHS.map(({ month, year }) => {
    const bills = getMonthlyBillsTotal(month, year)
    const car = getCarCost(month, year)
    const debtBills = getBillsForMonth(month, year).filter(b => b.category === 'debt')
    const debtTotal = debtBills.reduce((s, b) => s + b.amount, 0)
    const total = bills + car.monthly + car.fuel
    return {
      label: MONTH_SHORT[month - 1],
      bills,
      debtTotal,
      total,
    }
  })

  const DEBT_EVENT_COLORS: Record<string, string> = {
    'jaja': 'var(--blue)',
  }

  return (
    <div className="page-content">
      <h1 className="section-header">Future</h1>

      {/* Trajectory chart */}
      <Card title="Monthly trajectory (Apr–Dec 2026)">
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            At £{dailyRate}/day Uber+Bolt
          </div>
        </div>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v >= 0 ? '+' : ''}${Math.round(v / 100) * 100 >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
              />
              <ReferenceLine y={0} stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
              <Tooltip
                formatter={(v) => {
                  const n = Number(v)
                  return [`${n >= 0 ? '+' : '-'}£${fmt(n)}`, n >= 0 ? 'Surplus' : 'Deficit'] as [string, string]
                }}
                contentStyle={{
                  background: 'white',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 13,
                  padding: '6px 10px',
                }}
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
              />
              <Bar dataKey="result" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.result >= 0 ? 'var(--green)' : 'var(--red)'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Adjust daily rate</div>
          <input
            type="range"
            min={40}
            max={150}
            step={5}
            value={dailyRate}
            onChange={e => {
              const v = parseInt(e.target.value)
              setDailyRate(v)
              localStorage.setItem('dailyTarget', v.toString())
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            <span>£40</span>
            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>£{dailyRate}/day</span>
            <span>£150</span>
          </div>
        </div>
      </Card>

      {/* Debt clearance timeline */}
      <Card title="Debt clearance timeline">
        {debtEvents.map((event, i) => {
          const isJaja = event.billId === 'jaja'
          return (
            <div key={event.billId} style={{
              display: 'flex',
              gap: 12,
              paddingBottom: i < debtEvents.length - 1 ? 16 : 0,
              marginBottom: i < debtEvents.length - 1 ? 16 : 0,
              borderBottom: i < debtEvents.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: isJaja ? 16 : 12,
                  height: isJaja ? 16 : 12,
                  borderRadius: '50%',
                  background: isJaja ? 'var(--blue)' : 'var(--green)',
                  flexShrink: 0,
                }} />
                {i < debtEvents.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: 'var(--border)', marginTop: 4, minHeight: 20 }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: isJaja ? 700 : 600,
                  fontSize: isJaja ? 16 : 14,
                  color: isJaja ? 'var(--blue)' : 'var(--text-primary)',
                }}>
                  {event.name} clears
                  {isJaja && <span style={{ fontSize: 13, color: 'var(--blue)', marginLeft: 6 }}>BIG ONE</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {MONTH_NAMES[event.month - 1]} {event.year}
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: 4,
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: 'rgba(52,199,89,0.1)',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--green)',
                }}>
                  +£{fmt2(event.savingsPerMonth)}/mo saved
                </div>
              </div>
            </div>
          )
        })}
      </Card>

      {/* Running bills table */}
      <Card title="Bills by month">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: 8 }}>Month</th>
                <th style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: 8 }}>Bills</th>
                <th style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: 8 }}>Debts</th>
                <th style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: 8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0', fontWeight: 600 }}>{row.label}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>£{fmt(row.bills)}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--red)' }}>£{fmt(row.debtTotal)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>£{fmt(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
          Total outgoings includes bills + car + fuel
        </div>
      </Card>

      {/* Surplus calculator */}
      <Card title="When do I reach target surplus?">
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Target monthly surplus
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 20 }}>£</span>
            <input
              type="number"
              value={surplusTarget}
              onChange={e => setSurplusTarget(parseInt(e.target.value) || 2500)}
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: 700,
                border: 'none',
                borderBottom: '2px solid var(--border)',
                outline: 'none',
                background: 'transparent',
              }}
            />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>/month</span>
          </div>
        </div>

        {surplusMonth ? (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(52, 199, 89, 0.08)',
            border: '1px solid rgba(52, 199, 89, 0.2)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              At £{dailyRate}/day you reach £{fmt(surplusTarget)} surplus in
            </div>
            <div style={{ fontWeight: 700, fontSize: 24, color: 'var(--green)' }}>
              {MONTH_NAMES[surplusMonth.month - 1]} {surplusMonth.year}
            </div>
          </div>
        ) : (
          <div style={{
            padding: 16,
            borderRadius: 10,
            background: 'rgba(255, 59, 48, 0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, color: 'var(--red)', fontWeight: 600 }}>
              At £{dailyRate}/day, £{fmt(surplusTarget)} surplus is not reached by Dec 2026.
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Try increasing the daily rate above.
            </div>
          </div>
        )}
      </Card>

      {/* Zorell business note */}
      <Card>
        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(0,122,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}>
            Z
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Zorell business note</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              MA Samples target <strong>£1,000/mo by Jun 2026</strong> and Zorell Bookings target <strong>£500/mo by Jul 2026</strong> — if either hits, this whole picture changes.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
