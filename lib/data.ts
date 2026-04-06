export interface Bill {
  id: string
  name: string
  day: number
  amount: number
  category: 'subscription' | 'utility' | 'debt' | 'housing' | 'personal'
  startsMonth?: number
  startsYear?: number
  endsMonth: number | null
  endsYear: number | null
  moveable: boolean
}

export interface CustomBill {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'one-off'
  category: 'subscription' | 'utility' | 'debt' | 'housing' | 'personal'
  // monthly
  dayOfMonth?: number
  startsMonth?: number
  startsYear?: number
  endsMonth?: number | null
  endsYear?: number | null
  // weekly
  weekDays?: number[]  // 0=Sun, 1=Mon ... 6=Sat
  // one-off
  dates?: string[]     // 'YYYY-MM-DD'
  hidden?: boolean
}

export interface Holiday {
  name: string
  startDate: string
  endDate: string
  workingDaysLost: number
  afjLost: number
}

// Static BILLS kept empty — all bills are now managed as CustomBill in localStorage (seeded from SEED_CUSTOM_BILLS on first load)
export const BILLS: Bill[] = []

export const SEED_CUSTOM_BILLS: CustomBill[] = [
  { id: 'apple-storage', name: 'Apple storage',   frequency: 'monthly', dayOfMonth: 1,  amount: 8.99,   category: 'subscription' },
  { id: 'wifi',          name: 'WiFi',             frequency: 'monthly', dayOfMonth: 2,  amount: 24.00,  category: 'utility' },
  { id: 'cat-lenses',    name: 'Catarina lenses',  frequency: 'monthly', dayOfMonth: 3,  amount: 23.00,  category: 'personal' },
  { id: 'klarna-new',    name: 'Klarna',            frequency: 'monthly', dayOfMonth: 3,  amount: 11.55,  category: 'debt',         endsMonth: 6,  endsYear: 2026 },
  { id: 'cat-apple',     name: 'Catarina Apple',   frequency: 'monthly', dayOfMonth: 5,  amount: 5.99,   category: 'personal' },
  { id: 'channel4',      name: 'Channel 4',         frequency: 'monthly', dayOfMonth: 5,  amount: 3.99,   category: 'subscription', startsMonth: 5, startsYear: 2026 },
  { id: 'amazon-prime',  name: 'Amazon Prime',      frequency: 'monthly', dayOfMonth: 6,  amount: 8.99,   category: 'subscription' },
  { id: 'rent',          name: 'Rent',              frequency: 'monthly', dayOfMonth: 8,  amount: 407.56, category: 'housing' },
  { id: 'ionos',         name: 'Ionos',             frequency: 'monthly', dayOfMonth: 8,  amount: 7.50,   category: 'subscription' },
  { id: 'chatgpt',       name: 'ChatGPT',           frequency: 'monthly', dayOfMonth: 9,  amount: 20.00,  category: 'subscription' },
  { id: 'lowell',        name: 'Lowell',            frequency: 'monthly', dayOfMonth: 9,  amount: 10.00,  category: 'debt' },
  { id: 'pra-monzo',     name: 'Pra Monzo',         frequency: 'monthly', dayOfMonth: 9,  amount: 15.00,  category: 'debt' },
  { id: 'jaja',          name: 'Jaja',              frequency: 'monthly', dayOfMonth: 10, amount: 391.00, category: 'debt',         endsMonth: 7,  endsYear: 2026 },
  { id: 'ao-plan-1',     name: 'AO Plan 1',         frequency: 'monthly', dayOfMonth: 10, amount: 51.50,  category: 'debt',         endsMonth: 6,  endsYear: 2026 },
  { id: 'ao-plan-2',     name: 'AO Plan 2',         frequency: 'monthly', dayOfMonth: 10, amount: 21.59,  category: 'debt',         endsMonth: 11, endsYear: 2026 },
  { id: 'ao-plan-3',     name: 'AO Plan 3',         frequency: 'monthly', dayOfMonth: 10, amount: 45.67,  category: 'debt',         endsMonth: 5,  endsYear: 2026 },
  { id: 'ao-plan-4',     name: 'AO Plan 4',         frequency: 'monthly', dayOfMonth: 10, amount: 78.59,  category: 'debt',         endsMonth: 8,  endsYear: 2026 },
  { id: 'sofa-novuna',   name: 'Sofa/Novuna',       frequency: 'monthly', dayOfMonth: 10, amount: 76.50,  category: 'debt',         endsMonth: 11, endsYear: 2027 },
  { id: 'my-phone',      name: 'My phone',          frequency: 'monthly', dayOfMonth: 10, amount: 15.00,  category: 'personal' },
  { id: 'kindle',        name: 'Kindle',            frequency: 'monthly', dayOfMonth: 13, amount: 9.49,   category: 'subscription' },
  { id: 'council-tax',   name: 'Council tax',       frequency: 'monthly', dayOfMonth: 16, amount: 70.28,  category: 'housing' },
  { id: 'cat-mobile',    name: 'Cat mobile',        frequency: 'monthly', dayOfMonth: 20, amount: 12.00,  category: 'personal' },
  { id: 'electric',      name: 'Electric',          frequency: 'monthly', dayOfMonth: 21, amount: 34.00,  category: 'utility' },
  { id: 'water',         name: 'Water',             frequency: 'monthly', dayOfMonth: 26, amount: 24.46,  category: 'utility' },
  { id: 'gas',           name: 'Gas',               frequency: 'monthly', dayOfMonth: 27, amount: 65.98,  category: 'utility' },
  { id: 'claude',        name: 'Claude',            frequency: 'monthly', dayOfMonth: 28, amount: 18.00,  category: 'subscription' },
]

export const HOLIDAYS: Holiday[] = [
  { name: 'Easter', startDate: '2026-04-03', endDate: '2026-04-17', workingDaysLost: 11, afjLost: 935 },
  { name: 'Summer half term', startDate: '2026-05-26', endDate: '2026-05-29', workingDaysLost: 4, afjLost: 340 },
  { name: 'Teacher training', startDate: '2026-07-26', endDate: '2026-07-29', workingDaysLost: 2, afjLost: 170 },
  { name: 'Summer holidays', startDate: '2026-08-23', endDate: '2026-08-31', workingDaysLost: 7, afjLost: 595 },
  { name: 'Teacher training', startDate: '2026-09-01', endDate: '2026-09-02', workingDaysLost: 2, afjLost: 170 },
  { name: 'Autumn half term', startDate: '2026-10-27', endDate: '2026-10-31', workingDaysLost: 5, afjLost: 425 },
  { name: 'Christmas', startDate: '2026-12-18', endDate: '2027-01-02', workingDaysLost: 12, afjLost: 1020 },
]

// Car costs
export function getCarCost(month: number, year: number): { weekly: number; monthly: number; fuel: number } {
  // April 2026: Seat Leon £100/wk
  if (year === 2026 && month === 4) {
    return { weekly: 100, monthly: 433, fuel: 525 }
  }
  // May 2026 onwards: Corolla £250/wk rent-to-buy
  return { weekly: 250, monthly: 1083, fuel: 525 }
}

// AFJ rate
export const AFJ_DAILY_RATE = 85
export const AFJ_FULL_TERM_DAYS = 20
export const AFJ_FULL_TERM = 1700

// Default Uber/Bolt target
export const DEFAULT_DAILY_TARGET = 70

// Category colors
export const CATEGORY_COLORS: Record<string, string> = {
  debt: '#ff3b30',
  housing: '#007aff',
  utility: '#34c759',
  subscription: '#ff9500',
  personal: '#8e8e93',
}

export const CATEGORY_BG: Record<string, string> = {
  debt: 'bg-red-100 text-red-700',
  housing: 'bg-blue-100 text-blue-700',
  utility: 'bg-green-100 text-green-700',
  subscription: 'bg-amber-100 text-amber-700',
  personal: 'bg-gray-100 text-gray-600',
}

// Month names
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]
