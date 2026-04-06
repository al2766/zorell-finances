'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BILLS, Bill, MONTH_SHORT } from '@/lib/data'

// ─── Types ─────────────────────────────────────────────────────

interface BillState extends Bill {
  day: number
}

// ─── Helpers ───────────────────────────────────────────────────

function fmt(n: number) {
  return '£' + n.toFixed(2)
}

function endBadge(bill: Bill): string | null {
  if (bill.endsMonth === null || bill.endsYear === null) return null
  return MONTH_SHORT[bill.endsMonth - 1] + ' ' + String(bill.endsYear).slice(2)
}

/** Convert sorted position index to interpolated day number */
function interpolateDay(index: number, total: number, bills: BillState[]): number {
  if (total <= 1) return bills[0]?.day ?? 8
  const minDay = Math.min(...bills.map(b => b.day))
  const maxDay = Math.max(...bills.map(b => b.day))
  return Math.round(minDay + (index / (total - 1)) * (maxDay - minDay))
}

/** Get cycle-ordered days (8→7) */
function cycleDay(day: number): number {
  return day >= 8 ? day : day + 31
}

/** Sort bills in cycle order */
function sortBillsByCycle(bills: BillState[]): BillState[] {
  return [...bills].sort((a, b) => cycleDay(a.day) - cycleDay(b.day))
}

/** Group bills by day for the spread view */
function groupByDay(bills: BillState[]): Map<number, BillState[]> {
  const map = new Map<number, BillState[]>()
  for (const b of bills) {
    const existing = map.get(b.day) ?? []
    map.set(b.day, [...existing, b])
  }
  return map
}

/** Generate all cycle days in order: 8..31, 1..7 */
function cycleDays(): number[] {
  const days: number[] = []
  for (let d = 8; d <= 31; d++) days.push(d)
  for (let d = 1; d <= 7; d++) days.push(d)
  return days
}

// ─── Drag Handle ───────────────────────────────────────────────

function DragHandle({ listeners, attributes }: { listeners?: DraggableSyntheticListeners; attributes?: DraggableAttributes }) {
  return (
    <div
      {...listeners}
      {...attributes}
      className="flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
      style={{ width: 28, height: 36, color: '#334155' }}
    >
      <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
        <circle cx="2" cy="2" r="1.5" />
        <circle cx="8" cy="2" r="1.5" />
        <circle cx="2" cy="7" r="1.5" />
        <circle cx="8" cy="7" r="1.5" />
        <circle cx="2" cy="12" r="1.5" />
        <circle cx="8" cy="12" r="1.5" />
      </svg>
    </div>
  )
}

// ─── Sortable Bill Row ──────────────────────────────────────────

function SortableBillRow({
  bill,
  onDayChange,
  isDragging,
}: {
  bill: BillState
  onDayChange: (id: string, day: number) => void
  isDragging: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: selfDragging,
  } = useSortable({ id: bill.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 200ms ease',
    opacity: selfDragging ? 0.3 : 1,
    zIndex: selfDragging ? 999 : undefined,
  }

  const badge = endBadge(bill)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-3 py-2.5 select-none"
    >
      {/* 6-dot drag handle — ONLY drag initiator */}
      <DragHandle listeners={listeners} attributes={attributes} />

      {/* Lock icon for non-moveable */}
      {!bill.moveable && (
        <div title="This bill date may be harder to change" style={{ color: '#475569' }} className="shrink-0">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="5" width="8" height="6" rx="1.5" />
            <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}

      {/* Bill name */}
      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>
        {bill.name}
      </span>

      {/* End badge */}
      {badge && (
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
          style={{ background: '#1e293b', color: '#64748b' }}
        >
          ends {badge}
        </span>
      )}

      {/* Amount */}
      <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: '#f1f5f9' }}>
        {fmt(bill.amount)}
      </span>

      {/* Day input */}
      <input
        type="number"
        value={bill.day}
        min={1}
        max={31}
        onChange={e => {
          const v = parseInt(e.target.value)
          if (!isNaN(v) && v >= 1 && v <= 31) onDayChange(bill.id, v)
        }}
        className="w-10 text-center text-xs"
        style={{
          background: '#0d1117',
          border: '1px solid #1e293b',
          color: '#94a3b8',
          borderRadius: 6,
          padding: '2px 0',
        }}
      />
    </div>
  )
}

// ─── Drag Overlay Row ──────────────────────────────────────────

function OverlayRow({ bill }: { bill: BillState }) {
  const badge = endBadge(bill)
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        background: '#0d1117',
        border: '1px solid #334155',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      <DragHandle />
      {!bill.moveable && (
        <div style={{ color: '#475569' }} className="shrink-0">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="5" width="8" height="6" rx="1.5" />
            <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
      <span className="flex-1 text-sm font-medium truncate" style={{ color: '#93c5fd' }}>{bill.name}</span>
      {badge && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0" style={{ background: '#1e293b', color: '#64748b' }}>
          ends {badge}
        </span>
      )}
      <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: '#f1f5f9' }}>{fmt(bill.amount)}</span>
      <div className="w-10" />
    </div>
  )
}

// ─── Spread View ───────────────────────────────────────────────

function SpreadView({ bills }: { bills: BillState[] }) {
  const days = cycleDays()
  const grouped = groupByDay(bills)

  // Subtotal every 3 days
  let runningGroup: number[] = []

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      <div className="px-1">
        {days.map((day, i) => {
          const dayBills = grouped.get(day) ?? []
          const total = dayBills.reduce((s, b) => s + b.amount, 0)
          const isHeavy = total > 100
          const isLight = total > 0 && total < 20
          const showSubtotal = (i + 1) % 3 === 0

          // Accumulate for subtotal
          if (total > 0) {
            // no-op for display purposes
          }

          return (
            <div key={day}>
              <div
                className="flex items-start gap-2 py-2 px-2 rounded-lg transition-colors"
                style={{
                  borderBottom: '1px solid #0f1923',
                  background: dayBills.length > 0
                    ? isHeavy ? 'rgba(255,59,48,0.04)' : isLight ? 'rgba(52,199,89,0.04)' : 'transparent'
                    : 'transparent',
                }}
              >
                {/* Day number + indicator */}
                <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 36 }}>
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: dayBills.length > 0 ? '#f1f5f9' : '#1e293b' }}
                  >
                    {day}
                  </span>
                  {isHeavy && (
                    <div className="rounded-full" style={{ width: 4, height: 4, background: '#ff3b30' }} />
                  )}
                  {isLight && (
                    <div className="rounded-full" style={{ width: 4, height: 4, background: '#34c759' }} />
                  )}
                </div>

                {/* Bills */}
                <div className="flex-1 min-w-0">
                  {dayBills.length === 0 ? (
                    <span className="text-xs" style={{ color: '#1e293b' }}>—</span>
                  ) : (
                    <div className="space-y-0.5">
                      {dayBills.map(b => (
                        <div key={b.id} className="flex justify-between gap-2">
                          <span className="text-xs truncate" style={{ color: '#64748b' }}>{b.name}</span>
                          <span className="text-xs font-mono shrink-0" style={{ color: '#94a3b8' }}>{fmt(b.amount)}</span>
                        </div>
                      ))}
                      {dayBills.length > 0 && (
                        <div className="flex justify-end pt-0.5">
                          <span
                            className="text-xs font-semibold font-mono"
                            style={{ color: isHeavy ? '#ff3b30' : isLight ? '#34c759' : '#f1f5f9' }}
                          >
                            {fmt(total)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Every 3 days: subtotal band */}
              {showSubtotal && (() => {
                const sliceDays = days.slice(Math.max(0, i - 2), i + 1)
                const sliceTotal = sliceDays.reduce((s, d) => {
                  const db = grouped.get(d) ?? []
                  return s + db.reduce((ss, b) => ss + b.amount, 0)
                }, 0)
                if (sliceTotal === 0) return null
                return (
                  <div
                    className="flex justify-between items-center px-2 py-1.5"
                    style={{ background: '#0a0f1a', borderBottom: '1px solid #1e293b' }}
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#334155' }}>
                      D{days[Math.max(0, i - 2)]}–D{day} subtotal
                    </span>
                    <span className="text-xs font-mono font-semibold" style={{ color: '#475569' }}>
                      {fmt(sliceTotal)}
                    </span>
                  </div>
                )
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Summary Strip ──────────────────────────────────────────────

function SummaryStrip({ bills }: { bills: BillState[] }) {
  const totalMonthly = bills.reduce((s, b) => s + b.amount, 0)
  const paydayCluster = bills.filter(b => b.day >= 8 && b.day <= 10).reduce((s, b) => s + b.amount, 0)
  const sodBills = totalMonthly - paydayCluster
  const minAFJ = 765
  const shortfall = paydayCluster > minAFJ ? paydayCluster - minAFJ : 0

  return (
    <div
      className="px-4 py-3 mt-4 rounded-xl"
      style={{ background: '#0d1117', border: '1px solid #1e293b' }}
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Total monthly</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>{fmt(totalMonthly)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Payday cluster D8–10</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>{fmt(paydayCluster)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Daily SO (D11–D7)</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: '#f1f5f9' }}>{fmt(sodBills)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#475569' }}>Min AFJ (Easter)</p>
          <p className="text-lg font-semibold tabular-nums" style={{ color: '#94a3b8' }}>£{minAFJ}</p>
        </div>
      </div>

      {shortfall > 0 ? (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}
        >
          <span style={{ color: '#fbbf24' }} className="text-sm font-semibold">
            Shortfall risk: {fmt(shortfall)} on low-AFJ months
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)' }}
        >
          <span style={{ color: '#34c759' }} className="text-sm font-semibold">
            Payday safe even in Easter month
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main BillsTab ──────────────────────────────────────────────

const STORAGE_KEY = 'finances-bills-v1'

export default function BillsTab() {
  const [bills, setBills] = useState<BillState[]>(() => {
    // Init sorted by cycle day
    return sortBillsByCycle(BILLS as BillState[])
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  // Persist to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as BillState[]
        // Merge stored days into BILLS (don't trust stored amounts/names, only day values)
        const dayMap = new Map(parsed.map(b => [b.id, b.day]))
        const merged = BILLS.map(b => ({
          ...b,
          day: dayMap.get(b.id) ?? b.day,
        })) as BillState[]
        setBills(sortBillsByCycle(merged))
      }
    } catch {
      // ignore
    }
  }, [])

  const saveBills = useCallback((newBills: BillState[]) => {
    setBills(newBills)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBills))
    } catch {
      // ignore
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    })
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(_event: DragOverEvent) {
    // handled in dragEnd
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    setBills(prev => {
      const oldIndex = prev.findIndex(b => b.id === active.id)
      const newIndex = prev.findIndex(b => b.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)

      // Interpolate new day values based on position
      const updated = reordered.map((bill, idx) => {
        // Keep the interpolated day — use neighbour days
        const prevBill = reordered[idx - 1]
        const nextBill = reordered[idx + 1]
        if (idx === 0) return bill
        if (idx === reordered.length - 1) return bill
        // If this bill was moved, interpolate day between neighbours
        if (bill.id === active.id) {
          const prevDay = prevBill ? cycleDay(prevBill.day) : cycleDay(bill.day)
          const nextDay = nextBill ? cycleDay(nextBill.day) : cycleDay(bill.day)
          const mid = Math.round((prevDay + nextDay) / 2)
          const actualDay = mid > 31 ? mid - 31 : mid
          return { ...bill, day: actualDay }
        }
        return bill
      })

      const sorted = sortBillsByCycle(updated)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
      } catch {
        // ignore
      }
      return sorted
    })
  }

  const handleDayChange = useCallback((id: string, day: number) => {
    setBills(prev => {
      const updated = prev.map(b => b.id === id ? { ...b, day } : b)
      const sorted = sortBillsByCycle(updated)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
      } catch {
        // ignore
      }
      return sorted
    })
  }, [])

  const activeBill = bills.find(b => b.id === activeId)

  return (
    <div className="px-4 pt-4">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
          Bills — {bills.length} items
        </h2>
        <span className="text-xs" style={{ color: '#334155' }}>
          Drag handle to reorder · Edit day directly
        </span>
      </div>

      {/* Two-panel layout: list + spread */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* LEFT: Sortable bill list */}
        <div className="lg:w-[60%]">
          {/* Column labels */}
          <div
            className="flex items-center gap-2 px-3 pb-2 mb-1"
            style={{ borderBottom: '1px solid #1e293b' }}
          >
            <div style={{ width: 28 }} />
            <span className="flex-1 text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#334155' }}>Bill</span>
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#334155' }}>Amount</span>
            <span className="w-10 text-center text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#334155' }}>Day</span>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={bills.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#0d1117', border: '1px solid #1e293b' }}
              >
                {bills.map((bill, i) => (
                  <div
                    key={bill.id}
                    style={{ borderBottom: i < bills.length - 1 ? '1px solid #0f1923' : 'none' }}
                  >
                    <SortableBillRow
                      bill={bill}
                      onDayChange={handleDayChange}
                      isDragging={activeId === bill.id}
                    />
                  </div>
                ))}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeBill && <OverlayRow bill={activeBill} />}
            </DragOverlay>
          </DndContext>

          {/* Summary strip below list */}
          <SummaryStrip bills={bills} />
        </div>

        {/* RIGHT: Cycle spread */}
        <div className="lg:w-[40%]">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: '#0d1117', border: '1px solid #1e293b' }}
          >
            <div
              className="px-3 py-2.5 flex items-center justify-between"
              style={{ borderBottom: '1px solid #1e293b' }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
                Cycle spread
              </h3>
              <span className="text-[10px]" style={{ color: '#334155' }}>8th → 7th</span>
            </div>
            <SpreadView bills={bills} />
          </div>
        </div>
      </div>
    </div>
  )
}
