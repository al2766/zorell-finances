'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import StatusChip from '@/components/StatusChip'
import {
  getMonthlyOutgoings,
  getAFJIncomeEarnedInMonth,
  getWorkingDaysInMonth,
  getRequiredDailyTarget,
  getBillsForMonth,
  getCurrentHoliday,
  getAFJDaysInMonth,
} from '@/lib/calculations'
import { MONTH_NAMES } from '@/lib/data'

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function OverviewPage() {
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(year, month, 0).getDate()
  const daysRemaining = daysInMonth - dayOfMonth

  const [earnings, setEarnings] = useState<string>('')
  const [dailyTarget, setDailyTarget] = useState<number>(70)

  const storageKey = `earnings_${year}_${String(month).padStart(2, '0')}`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) setEarnings(saved)
    const savedTarget = localStorage.getItem('dailyTarget')
    if (savedTarget) setDailyTarget(parseFloat(savedTarget))
  }, [storageKey])

  const handleEarningsChange = (val: string) => {
    setEarnings(val)
    localStorage.setItem(storageKey, val)
  }

  const requiredDaily = getRequiredDailyTarget(month, year)
  const outgoings = getMonthlyOutgoings(month, year)
  const afjIncome = getAFJIncomeEarnedInMonth(month, year)
  const workingDays = getWorkingDaysInMonth(month, year)
  const uberTarget = requiredDaily * workingDays
  const totalIncomeNeeded = outgoings

  const earnedSoFar = parseFloat(earnings) || 0
  const breakEvenAmount = uberTarget
  const gap = breakEvenAmount - earnedSoFar
  const ahead = gap <= 0

  // Status chip logic
  const daysElapsed = dayOfMonth - 1
  const expectedByNow = requiredDaily * daysElapsed
  let status: 'AHEAD' | 'ON TRACK' | 'BEHIND' = 'ON TRACK'
  if (earnedSoFar >= expectedByNow * 1.05) status = 'AHEAD'
  else if (earnedSoFar < expectedByNow * 0.9) status = 'BEHIND'

  // Next 5 bills
  const bills = getBillsForMonth(month, year)
  const upcoming = bills
    .map(b => ({ ...b, daysUntil: b.day - dayOfMonth }))
    .filter(b => b.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)

  // Holiday status
  const currentHoliday = getCurrentHoliday(today)
  const afjDays = getAFJDaysInMonth(month, year)

  return (
    <div className="page-content">
      <h1 className="section-header">{MONTH_NAMES[month - 1]} {year}</h1>

      {/* Month header */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}>Days elapsed</div>
            <div className="medium-number">{dayOfMonth}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>of {daysInMonth} days</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-title" style={{ marginBottom: 4 }}>Remaining</div>
            <div className="medium-number">{daysRemaining}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>days left</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <StatusChip
              label={status}
              variant={status === 'AHEAD' ? 'green' : status === 'ON TRACK' ? 'blue' : 'red'}
            />
          </div>
        </div>
        <div className="progress-bar" style={{ marginTop: 12 }}>
          <div
            className="progress-fill"
            style={{
              width: `${(dayOfMonth / daysInMonth) * 100}%`,
              background: 'var(--blue)',
            }}
          />
        </div>
      </Card>

      {/* Daily target */}
      <Card title="Daily Target">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Required Uber+Bolt/day
            </div>
            <div className="big-number" style={{ color: 'var(--blue)' }}>
              £{fmt(requiredDaily)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total needed</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>£{fmtInt(uberTarget)}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{workingDays} working days</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          Total outgoings £{fmt(outgoings)} — AFJ £{fmtInt(afjIncome)} ({afjDays} days)
        </div>
      </Card>

      {/* Earnings entry */}
      <Card title="Uber + Bolt This Month">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Earned so far this month
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-secondary)' }}>£</span>
            <input
              type="number"
              value={earnings}
              onChange={e => handleEarningsChange(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1,
                fontSize: 28,
                fontWeight: 700,
                border: 'none',
                borderBottom: '2px solid var(--border)',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums',
                padding: '4px 0',
              }}
            />
          </div>
        </div>
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: ahead ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 20 }}>{ahead ? '' : ''}</span>
          <div>
            {ahead ? (
              <div style={{ fontWeight: 600, color: 'var(--green)' }}>
                £{fmt(Math.abs(gap))} ahead of break-even
              </div>
            ) : (
              <div style={{ fontWeight: 600, color: 'var(--red)' }}>
                Need £{fmt(gap)} more to break even
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Break-even target: £{fmt(uberTarget)}
            </div>
          </div>
        </div>
      </Card>

      {/* Holiday banner */}
      {currentHoliday && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <StatusChip label="HOLIDAY" variant="amber" />
              <div style={{ fontWeight: 700, fontSize: 17, marginTop: 6 }}>{currentHoliday.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AFJ lost</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--red)' }}>
                £{fmtInt(currentHoliday.afjLost)}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {currentHoliday.workingDaysLost} working days lost — cover with extra Uber/Bolt earnings
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>
              Daily Uber/Bolt needed to cover shortfall
            </div>
            <div style={{ fontWeight: 700, color: 'var(--amber)', fontSize: 20 }}>
              £{fmt(currentHoliday.afjLost / currentHoliday.workingDaysLost)}/day
            </div>
          </div>
        </Card>
      )}

      {/* Next bills */}
      <Card title="Next Bills Due">
        {upcoming.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No more bills this month</div>
        ) : (
          upcoming.map(bill => {
            const urgent = bill.daysUntil <= 1
            const soon = bill.daysUntil <= 3
            return (
              <div key={bill.id} className="bill-row">
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: urgent ? 'rgba(255,59,48,0.1)' : soon ? 'rgba(255,149,0,0.1)' : 'rgba(0,0,0,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: urgent ? 'var(--red)' : soon ? 'var(--amber)' : 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {bill.daysUntil === 0 ? 'TODAY' : `${bill.daysUntil}d`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{bill.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Day {bill.day} · {bill.category}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 16,
                  fontVariantNumeric: 'tabular-nums',
                  color: urgent ? 'var(--red)' : 'var(--text-primary)',
                }}>
                  £{fmt(bill.amount)}
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}
