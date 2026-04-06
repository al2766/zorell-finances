'use client'

import { useState, useEffect, useRef } from 'react'
import type { CustomBill } from '@/lib/data'

// ─── Helpers ────────────────────────────────────────────────────

function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function todayYMD(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function currentMonth(): number {
  return new Date().getMonth() + 1
}

function currentYear(): number {
  return new Date().getFullYear()
}

// ─── Icon helpers ────────────────────────────────────────────────

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Theme tokens (minimal) ──────────────────────────────────────

interface ModalTheme {
  bg: string
  card: string
  cardAlt: string
  border: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  blue: string
  blueActive: string
  green: string
  red: string
}

const DARK_MODAL: ModalTheme = {
  bg: '#0a111a',
  card: '#0f1923',
  cardAlt: '#0a111a',
  border: '#1e293b',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  blue: '#3b82f6',
  blueActive: '#93c5fd',
  green: '#22c55e',
  red: '#ef4444',
}

const LIGHT_MODAL: ModalTheme = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  blue: '#2563eb',
  blueActive: '#2563eb',
  green: '#16a34a',
  red: '#dc2626',
}

// ─── Pill button ─────────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
  t,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  t: ModalTheme
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '7px 14px',
        borderRadius: 8,
        border: `1px solid ${active ? t.blue : t.border}`,
        background: active ? `${t.blue}26` : 'transparent',
        color: active ? t.blueActive : t.textSecondary,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s ease',
        minHeight: 44,
      }}
    >
      {children}
    </button>
  )
}

// ─── Category picker ─────────────────────────────────────────────

const CATEGORIES: { value: CustomBill['category']; label: string }[] = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'utility', label: 'Utility' },
  { value: 'debt', label: 'Debt' },
  { value: 'housing', label: 'Housing' },
  { value: 'personal', label: 'Personal' },
]

// ─── Month/Year selects ──────────────────────────────────────────

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function MonthYearSelect({
  month,
  year,
  onMonthChange,
  onYearChange,
  fieldStyle,
}: {
  month: number
  year: number
  onMonthChange: (m: number) => void
  onYearChange: (y: number) => void
  fieldStyle: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select
        value={month}
        onChange={e => onMonthChange(Number(e.target.value))}
        style={{ ...fieldStyle, width: 'auto', flex: 1 }}
      >
        {MONTH_NAMES_SHORT.map((n, i) => (
          <option key={i} value={i + 1}>{n}</option>
        ))}
      </select>
      <input
        type="number"
        value={year}
        onChange={e => onYearChange(Number(e.target.value))}
        style={{ ...fieldStyle, width: 80, flexShrink: 0 }}
        min={2024}
        max={2035}
      />
    </div>
  )
}

// ─── Day-of-week selector ────────────────────────────────────────

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function WeekDayPicker({
  selected,
  onChange,
  t,
}: {
  selected: number[]
  onChange: (days: number[]) => void
  t: ModalTheme
}) {
  function toggle(d: number) {
    if (selected.includes(d)) {
      onChange(selected.filter(x => x !== d))
    } else {
      onChange([...selected, d])
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {WEEKDAY_LABELS.map((label, i) => {
        const active = selected.includes(i)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            style={{
              padding: '7px 10px',
              borderRadius: 8,
              border: `1px solid ${active ? t.blue : t.border}`,
              background: active ? `${t.blue}26` : 'transparent',
              color: active ? t.blueActive : t.textSecondary,
              fontSize: 12,
              fontWeight: active ? 700 : 400,
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: 44,
              minWidth: 44,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── One-off date picker ─────────────────────────────────────────

function OneOffDates({
  dates,
  onChange,
  t,
  fieldStyle,
}: {
  dates: string[]
  onChange: (dates: string[]) => void
  t: ModalTheme
  fieldStyle: React.CSSProperties
}) {
  const [adding, setAdding] = useState(false)
  const [newDate, setNewDate] = useState(todayYMD())

  function addDate() {
    if (!newDate) return
    if (!dates.includes(newDate)) {
      onChange([...dates, newDate].sort())
    }
    setAdding(false)
    setNewDate(todayYMD())
  }

  function removeDate(d: string) {
    onChange(dates.filter(x => x !== d))
  }

  return (
    <div>
      {dates.length === 0 && !adding && (
        <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 8 }}>No dates added yet</div>
      )}
      {dates.map(d => (
        <div
          key={d}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px', background: t.cardAlt, border: `1px solid ${t.border}`,
            borderRadius: 8, marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: t.textPrimary }}>{d}</span>
          <button
            type="button"
            onClick={() => removeDate(d)}
            style={{
              background: 'transparent', border: 'none', color: t.red,
              cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
              minHeight: 44, minWidth: 44, justifyContent: 'center',
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={{ ...fieldStyle, flex: 1, colorScheme: 'dark' }}
          />
          <button
            type="button"
            onClick={addDate}
            style={{
              background: t.green, color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              minHeight: 44,
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            style={{
              background: t.border, color: t.textSecondary, border: 'none', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, cursor: 'pointer', minHeight: 44,
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: `${t.blue}1a`, border: `1px solid ${t.blue}4d`,
            color: t.blueActive, borderRadius: 8, padding: '9px 14px', fontSize: 13,
            cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', minHeight: 44,
          }}
        >
          + Add date
        </button>
      )}
    </div>
  )
}

// ─── Main Modal ──────────────────────────────────────────────────

interface AddBillModalProps {
  onClose: () => void
  onSave: (bill: CustomBill) => void
  existingBill?: CustomBill | null
  dark?: boolean
}

export default function AddBillModal({ onClose, onSave, existingBill, dark = false }: AddBillModalProps) {
  const isEdit = !!existingBill
  const t = dark ? DARK_MODAL : LIGHT_MODAL

  const [name, setName] = useState(existingBill?.name ?? '')
  const [amount, setAmount] = useState<number>(existingBill?.amount ?? 0)
  const [frequency, setFrequency] = useState<'monthly' | 'weekly' | 'one-off'>(existingBill?.frequency ?? 'monthly')
  const [category, setCategory] = useState<CustomBill['category']>(existingBill?.category ?? 'subscription')

  // Monthly
  const [dayOfMonth, setDayOfMonth] = useState<number>(existingBill?.dayOfMonth ?? 1)
  const [startsMonth, setStartsMonth] = useState<number>(existingBill?.startsMonth ?? currentMonth())
  const [startsYear, setStartsYear] = useState<number>(existingBill?.startsYear ?? currentYear())
  const [hasEndDate, setHasEndDate] = useState<boolean>(
    !!(existingBill?.endsMonth && existingBill?.endsYear)
  )
  const [endsMonth, setEndsMonth] = useState<number>(existingBill?.endsMonth ?? currentMonth())
  const [endsYear, setEndsYear] = useState<number>(existingBill?.endsYear ?? currentYear() + 1)

  // Weekly
  const [weekDays, setWeekDays] = useState<number[]>(existingBill?.weekDays ?? [])

  // One-off
  const [dates, setDates] = useState<string[]>(existingBill?.dates ?? [])

  const [error, setError] = useState<string | null>(null)

  const backdropRef = useRef<HTMLDivElement>(null)
  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const fieldStyle: React.CSSProperties = {
    background: t.cardAlt,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.textPrimary,
    padding: '10px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: t.textMuted,
    marginBottom: 4,
    display: 'block',
  }

  function validate(): boolean {
    if (!name.trim()) { setError('Name is required'); return false }
    if (!amount || amount <= 0) { setError('Amount must be greater than 0'); return false }
    if (frequency === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      setError('Day of month must be 1–31'); return false
    }
    if (frequency === 'weekly' && weekDays.length === 0) {
      setError('Select at least one day of the week'); return false
    }
    if (frequency === 'one-off' && dates.length === 0) {
      setError('Add at least one date'); return false
    }
    return true
  }

  function handleSave() {
    if (!validate()) return

    const bill: CustomBill = {
      id: isEdit ? existingBill!.id : generateId(),
      name: name.trim(),
      amount,
      frequency,
      category,
      ...(frequency === 'monthly' ? {
        dayOfMonth,
        startsMonth,
        startsYear,
        endsMonth: hasEndDate ? endsMonth : null,
        endsYear: hasEndDate ? endsYear : null,
      } : {}),
      ...(frequency === 'weekly' ? { weekDays } : {}),
      ...(frequency === 'one-off' ? { dates } : {}),
      hidden: existingBill?.hidden ?? false,
    }

    onSave(bill)
    onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: dark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        style={{
          background: t.card,
          border: `1px solid ${t.border}`,
          borderRadius: '16px 16px 0 0',
          width: '100%',
          maxWidth: 540,
          maxHeight: '92dvh',
          overflowY: 'auto',
          padding: '0 0 env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${t.border}`,
          position: 'sticky', top: 0, background: t.card, zIndex: 10,
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>
            {isEdit ? 'Edit bill' : 'Add bill'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: t.textMuted,
              cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center',
              minHeight: 44, minWidth: 44, justifyContent: 'center',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Netflix"
              style={fieldStyle}
              autoFocus
            />
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: t.textSecondary, fontSize: 14, pointerEvents: 'none',
              }}>£</span>
              <input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                placeholder="0.00"
                step="0.01"
                min="0"
                style={{ ...fieldStyle, paddingLeft: 26 }}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <Pill key={c.value} active={category === c.value} onClick={() => setCategory(c.value)} t={t}>
                  {c.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['monthly', 'weekly', 'one-off'] as const).map(f => (
                <Pill key={f} active={frequency === f} onClick={() => setFrequency(f)} t={t}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Pill>
              ))}
            </div>
          </div>

          {/* Monthly options */}
          {frequency === 'monthly' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Day of month</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value))}
                  style={{ ...fieldStyle, maxWidth: 100 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Starts (optional)</label>
                <MonthYearSelect
                  month={startsMonth}
                  year={startsYear}
                  onMonthChange={setStartsMonth}
                  onYearChange={setStartsYear}
                  fieldStyle={fieldStyle}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setHasEndDate(x => !x)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'transparent', border: 'none', color: t.textSecondary,
                    cursor: 'pointer', padding: 0, fontSize: 13, fontFamily: 'inherit',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${hasEndDate ? t.blue : t.border}`,
                    background: hasEndDate ? t.blue : 'transparent',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {hasEndDate && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="2,5 4,7 8,3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  Has end date
                </button>
              </div>
              {hasEndDate && (
                <div>
                  <label style={labelStyle}>Ends after</label>
                  <MonthYearSelect
                    month={endsMonth}
                    year={endsYear}
                    onMonthChange={setEndsMonth}
                    onYearChange={setEndsYear}
                    fieldStyle={fieldStyle}
                  />
                </div>
              )}
            </div>
          )}

          {/* Weekly options */}
          {frequency === 'weekly' && (
            <div>
              <label style={labelStyle}>Days of week</label>
              <WeekDayPicker selected={weekDays} onChange={setWeekDays} t={t} />
            </div>
          )}

          {/* One-off options */}
          {frequency === 'one-off' && (
            <div>
              <label style={labelStyle}>Dates</label>
              <OneOffDates dates={dates} onChange={setDates} t={t} fieldStyle={fieldStyle} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', background: `${t.red}1a`,
              border: `1px solid ${t.red}4d`, borderRadius: 8,
              fontSize: 13, color: t.red,
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                flex: 1, background: t.green, color: '#fff', border: 'none',
                borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', minHeight: 48,
              }}
            >
              {isEdit ? 'Save changes' : 'Add bill'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, background: t.border, color: t.textSecondary, border: 'none',
                borderRadius: 8, padding: '12px', fontSize: 14, cursor: 'pointer',
                minHeight: 48,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
