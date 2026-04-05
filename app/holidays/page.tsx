'use client'

import { useState, useEffect } from 'react'
import Card from '@/components/Card'
import StatusChip from '@/components/StatusChip'
import { HOLIDAYS } from '@/lib/data'
import { getCurrentHoliday } from '@/lib/calculations'

function fmt(n: number): string {
  return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${s.toLocaleDateString('en-GB', opts)} – ${e.toLocaleDateString('en-GB', opts)}`
}

function getHolidayStatus(startDate: string, endDate: string): 'upcoming' | 'active' | 'past' {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  if (todayStr < startDate) return 'upcoming'
  if (todayStr > endDate) return 'past'
  return 'active'
}

function getHolidayDays(startDate: string, endDate: string): number {
  const s = new Date(startDate)
  const e = new Date(endDate)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function getDaysElapsed(startDate: string): number {
  const s = new Date(startDate)
  const today = new Date()
  return Math.max(0, Math.floor((today.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
}

function getDaysRemaining(endDate: string): number {
  const e = new Date(endDate)
  const today = new Date()
  return Math.max(0, Math.ceil((e.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
}

export default function HolidaysPage() {
  const today = new Date()
  const currentHoliday = getCurrentHoliday(today)

  const [holidayEarnings, setHolidayEarnings] = useState<Record<string, string>>({})

  useEffect(() => {
    const loaded: Record<string, string> = {}
    HOLIDAYS.forEach(h => {
      const key = `ringfence_${h.name.replace(/\s+/g, '_').toLowerCase()}`
      const val = localStorage.getItem(key)
      if (val) loaded[h.name] = val
    })
    setHolidayEarnings(loaded)
  }, [])

  const saveRingfence = (name: string, value: string) => {
    const key = `ringfence_${name.replace(/\s+/g, '_').toLowerCase()}`
    localStorage.setItem(key, value)
    setHolidayEarnings(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="page-content">
      <h1 className="section-header">Holidays</h1>

      {/* Ring-fence explainer */}
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(255, 149, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}>
            💡
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Ring-fence explained</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              During holidays your Uber/Bolt arrives daily but replaces next month&apos;s lower AFJ.
              The ring-fence amount is the exact AFJ shortfall. Earn that first. Everything above it is free cashflow.
            </div>
          </div>
        </div>
      </Card>

      {/* Active holiday banner */}
      {currentHoliday && (() => {
        const totalDays = getHolidayDays(currentHoliday.startDate, currentHoliday.endDate)
        const elapsed = getDaysElapsed(currentHoliday.startDate)
        const remaining = getDaysRemaining(currentHoliday.endDate)
        const earned = parseFloat(holidayEarnings[currentHoliday.name] ?? '0') || 0
        const gap = currentHoliday.afjLost - earned
        const dailyNeeded = remaining > 0 ? gap / remaining : 0

        return (
          <Card>
            <div style={{
              background: 'rgba(255, 149, 0, 0.08)',
              margin: '-16px -16px 0',
              padding: '12px 16px',
              borderRadius: '12px 12px 0 0',
              borderBottom: '1px solid rgba(255,149,0,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusChip label="ACTIVE HOLIDAY" variant="amber" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {remaining} days left
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 20, marginTop: 6 }}>{currentHoliday.name}</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>AFJ shortfall</div>
                  <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--red)' }}>£{fmt(currentHoliday.afjLost)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Ring-fenced so far</div>
                  <div style={{ fontWeight: 700, fontSize: 22, color: 'var(--green)' }}>
                    £{fmt(parseFloat(holidayEarnings[currentHoliday.name] ?? '0') || 0)}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Uber+Bolt ring-fenced so far
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)' }}>£</span>
                  <input
                    type="number"
                    value={holidayEarnings[currentHoliday.name] ?? ''}
                    onChange={e => saveRingfence(currentHoliday.name, e.target.value)}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      fontSize: 22,
                      fontWeight: 700,
                      border: 'none',
                      borderBottom: '2px solid var(--border)',
                      outline: 'none',
                      background: 'transparent',
                    }}
                  />
                </div>
              </div>

              <div className="progress-bar" style={{ marginBottom: 8 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(100, ((parseFloat(holidayEarnings[currentHoliday.name] ?? '0') || 0) / currentHoliday.afjLost) * 100)}%`,
                    background: gap <= 0 ? 'var(--green)' : 'var(--amber)',
                  }}
                />
              </div>

              {gap > 0 ? (
                <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>
                  Need £{fmt(gap)} more — £{fmt(dailyNeeded)}/day for {remaining} days
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
                  Ring-fence complete — anything above is free cashflow
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(elapsed / totalDays) * 100}%`,
                      background: 'var(--blue)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  <span>Day {elapsed + 1} of {totalDays}</span>
                  <span>{remaining} days remaining</span>
                </div>
              </div>
            </div>
          </Card>
        )
      })()}

      {/* Holiday list */}
      {HOLIDAYS.map(holiday => {
        const status = getHolidayStatus(holiday.startDate, holiday.endDate)
        const totalDays = getHolidayDays(holiday.startDate, holiday.endDate)
        const dailyCoverTarget = holiday.afjLost / holiday.workingDaysLost
        const ringfenced = parseFloat(holidayEarnings[holiday.name] ?? '0') || 0
        const ringfenceKey = `ringfence_${holiday.name.replace(/\s+/g, '_').toLowerCase()}`

        if (status === 'active') return null // shown above

        return (
          <Card key={holiday.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{holiday.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {formatDateRange(holiday.startDate, holiday.endDate)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {totalDays} calendar days · {holiday.workingDaysLost} working days lost
                </div>
              </div>
              <StatusChip
                label={status === 'past' ? 'PAST' : 'UPCOMING'}
                variant={status === 'past' ? 'gray' : 'blue'}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 12,
              padding: 12,
              background: 'var(--bg)',
              borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>AFJ lost</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--red)' }}>£{fmt(holiday.afjLost)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Daily Uber target</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--amber)' }}>£{fmt(dailyCoverTarget)}</div>
              </div>
            </div>

            {status === 'upcoming' && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Ring-fenced so far
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>£</span>
                  <input
                    type="number"
                    value={holidayEarnings[holiday.name] ?? ''}
                    onChange={e => saveRingfence(holiday.name, e.target.value)}
                    placeholder="0.00"
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: 700,
                      border: 'none',
                      borderBottom: '2px solid var(--border)',
                      outline: 'none',
                      background: 'transparent',
                    }}
                  />
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, (ringfenced / holiday.afjLost) * 100)}%`,
                      background: ringfenced >= holiday.afjLost ? 'var(--green)' : 'var(--blue)',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {ringfenced >= holiday.afjLost ? 'Fully ring-fenced' : `£${fmt(holiday.afjLost - ringfenced)} to go`}
                </div>
              </div>
            )}

            {status === 'past' && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                This holiday has passed
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
