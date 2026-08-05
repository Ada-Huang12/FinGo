import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, currentMonth, todayISO } from './format'

export type ParsedTxnType = 'income' | 'expense'

export interface ParsedTransaction {
  id: string
  type: ParsedTxnType
  amount: number
  category: string
  description: string
  date: string
  source: 'csv' | 'receipt'
  confidence: 'high' | 'medium' | 'low'
  selected: boolean
  raw?: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: [
    'grocery',
    'grocer',
    'market',
    'restaurant',
    'cafe',
    'coffee',
    'starbucks',
    'mcdonald',
    'pizza',
    'sushi',
    'bakery',
    'food',
    'dining',
    'snack',
    'snacks',
    'candy',
    'chips',
    'uber eats',
    'doordash',
    'chipotle',
    'whole foods',
    'trader joe',
    'kroger',
    'walmart',
  ],
  Transport: [
    'uber',
    'lyft',
    'gas',
    'shell',
    'chevron',
    'exxon',
    'parking',
    'transit',
    'metro',
    'airline',
    'taxi',
    'toll',
    'fuel',
  ],
  Shopping: [
    'amazon',
    'target',
    'best buy',
    'mall',
    'store',
    'retail',
    'clothing',
    'nike',
    'apple store',
    'etsy',
  ],
  Entertainment: [
    'netflix',
    'spotify',
    'movie',
    'cinema',
    'theater',
    'game',
    'steam',
    'concert',
    'ticket',
    'hulu',
    'disney',
  ],
  Utilities: [
    'electric',
    'utility',
    'water',
    'internet',
    'comcast',
    'verizon',
    'at&t',
    'phone',
    'gas bill',
    'wifi',
  ],
  Health: [
    'pharmacy',
    'cvs',
    'walgreens',
    'doctor',
    'clinic',
    'hospital',
    'dental',
    'health',
    'fitness',
    'gym',
  ],
  Housing: ['rent', 'mortgage', 'landlord', 'apartment', 'hoa'],
  Education: ['tuition', 'school', 'university', 'udemy', 'course', 'bookstore'],
  Salary: ['payroll', 'salary', 'direct dep', 'paycheck', 'wage'],
  Freelance: ['invoice', 'freelance', 'client payment', 'upwork', 'fiverr'],
}

function uid() {
  return crypto.randomUUID()
}

export function inferCategory(text: string, type: ParsedTxnType): string {
  const hay = text.toLowerCase()
  const pool = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  for (const category of pool) {
    const keys = CATEGORY_KEYWORDS[category] ?? []
    if (keys.some((k) => hay.includes(k))) return category
  }
  return type === 'income' ? 'Other' : 'Other'
}

function parseAmountToken(raw: string): number | null {
  const cleaned = raw
    .replace(/[^0-9.,()-]/g, '')
    .replace(/\((.*)\)/, '-$1')
    .replace(/,/g, '')
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n === 0) return null
  return Math.round(Math.abs(n) * 100) / 100
}

function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // YYYY-MM-DD
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }

  // MM/DD/YYYY or M/D/YY
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3]
    return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  }

  // DD Mon YYYY / Mon DD, YYYY — parse as local noon to avoid UTC day shift
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
  }
  return null
}

/** Map a date into the current calendar month (keeps day-of-month when possible). */
export function alignDateToCurrentMonth(date: string): string {
  const month = currentMonth()
  if (date.startsWith(month)) return date
  const dayToken = Number(date.slice(8, 10))
  const day = Number.isFinite(dayToken) && dayToken >= 1 && dayToken <= 31 ? dayToken : 1
  const year = Number(month.slice(0, 4))
  const mo = Number(month.slice(5, 7))
  const maxDay = new Date(year, mo, 0).getDate()
  const clamped = Math.min(day, maxDay)
  return `${month}-${String(clamped).padStart(2, '0')}`
}

/** Prefer current-month dates so Home income/spending cards update after import. */
export function prepareImportRows(rows: ParsedTransaction[]): {
  rows: ParsedTransaction[]
  shiftedCount: number
} {
  let shiftedCount = 0
  const month = currentMonth()
  const next = rows.map((r) => {
    if (r.date.startsWith(month)) return r
    shiftedCount += 1
    return { ...r, date: alignDateToCurrentMonth(r.date) }
  })
  return { rows: next, shiftedCount }
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '')
}

type ColMap = {
  date?: number
  amount?: number
  description?: number
  category?: number
  type?: number
  debit?: number
  credit?: number
}

function detectColumns(headers: string[]): ColMap {
  const map: ColMap = {}
  headers.forEach((h, i) => {
    const key = normalizeHeader(h)
    if (/(^date$|posted|transactiondate|transdate)/.test(key) && map.date == null) map.date = i
    else if (/(^amount$|amt|value|sum)/.test(key) && map.amount == null) map.amount = i
    else if (/(desc|memo|payee|merchant|name|details|narration)/.test(key) && map.description == null)
      map.description = i
    else if (/category|cat/.test(key) && map.category == null) map.category = i
    else if (/^(type|transactiontype|drcr)$/.test(key) && map.type == null) map.type = i
    else if (/(debit|withdrawal|outflow|spent)/.test(key) && map.debit == null) map.debit = i
    else if (/(credit|deposit|inflow)/.test(key) && map.credit == null) map.credit = i
  })
  return map
}

function guessType(rawType: string | undefined, amountSigned: number, description: string): ParsedTxnType {
  const t = (rawType ?? '').toLowerCase()
  if (/(income|credit|deposit|payroll|salary)/.test(t)) return 'income'
  if (/(expense|debit|withdrawal|purchase|payment)/.test(t)) return 'expense'
  if (amountSigned < 0) return 'expense'
  if (/(payroll|salary|deposit|refund|transfer from)/i.test(description)) return 'income'
  return 'expense'
}

export function parseCsvTransactions(text: string): ParsedTransaction[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) throw new Error('CSV needs a header row and at least one data row.')

  const headers = splitCsvLine(lines[0])
  const map = detectColumns(headers)
  if (map.date == null || (map.amount == null && map.debit == null && map.credit == null)) {
    throw new Error(
      'Could not detect date/amount columns. Include headers like Date, Amount, Description (or Debit/Credit).',
    )
  }

  const results: ParsedTransaction[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i])
    if (cells.every((c) => !c)) continue

    const date = parseFlexibleDate(cells[map.date!] ?? '')
    if (!date) continue

    let signed = 0
    if (map.amount != null) {
      const amt = parseAmountToken(cells[map.amount] ?? '')
      if (amt == null) continue
      signed = /^-/.test((cells[map.amount] ?? '').trim()) || /\(.*\)/.test(cells[map.amount] ?? '')
        ? -amt
        : amt
      // Many bank CSVs use positive amounts with a type column
      const typeHint = map.type != null ? cells[map.type] : ''
      if (/(debit|withdrawal|expense)/i.test(typeHint ?? '')) signed = -Math.abs(amt)
      if (/(credit|deposit|income)/i.test(typeHint ?? '')) signed = Math.abs(amt)
    } else {
      const debit = map.debit != null ? parseAmountToken(cells[map.debit] ?? '') : null
      const credit = map.credit != null ? parseAmountToken(cells[map.credit] ?? '') : null
      if (debit && debit > 0) signed = -debit
      else if (credit && credit > 0) signed = credit
      else continue
    }

    const description =
      (map.description != null ? cells[map.description] : '') ||
      (map.category != null ? cells[map.category] : '') ||
      `CSV row ${i}`
    const type = guessType(map.type != null ? cells[map.type] : undefined, signed, description)
    const amount = Math.abs(signed)
    if (amount <= 0) continue

    const categoryRaw = map.category != null ? cells[map.category] : ''
    const category =
      categoryRaw &&
      [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].some(
        (c) => c.toLowerCase() === categoryRaw.toLowerCase(),
      )
        ? [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(
            (c) => c.toLowerCase() === categoryRaw.toLowerCase(),
          )!
        : inferCategory(`${description} ${categoryRaw}`, type)

    results.push({
      id: uid(),
      type,
      amount,
      category,
      description: description.slice(0, 120),
      date,
      source: 'csv',
      confidence: map.description != null ? 'high' : 'medium',
      selected: true,
      raw: lines[i],
    })
  }

  if (!results.length) throw new Error('No valid transactions found in this CSV.')
  return results
}

function extractReceiptAmount(text: string): { amount: number; confidence: ParsedTransaction['confidence'] } | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const totalPatterns = [
    /(?:grand\s*)?total\s*[:\-]?\s*\$?\s*([0-9]+(?:[.,][0-9]{2})?)/i,
    /amount\s*due\s*[:\-]?\s*\$?\s*([0-9]+(?:[.,][0-9]{2})?)/i,
    /balance\s*due\s*[:\-]?\s*\$?\s*([0-9]+(?:[.,][0-9]{2})?)/i,
    /(?:^|\s)total\s*\$?\s*([0-9]+(?:[.,][0-9]{2})?)/i,
  ]

  for (const line of lines) {
    for (const re of totalPatterns) {
      const m = line.match(re)
      if (m) {
        const amount = parseAmountToken(m[1])
        if (amount && amount > 0) return { amount, confidence: 'high' }
      }
    }
  }

  // Fallback: largest currency-looking number
  const money = [...text.matchAll(/\$\s*([0-9]{1,5}(?:[.,][0-9]{2})?)/g)]
    .map((m) => parseAmountToken(m[1]))
    .filter((n): n is number => n != null && n > 0)
    .sort((a, b) => b - a)
  if (money[0]) return { amount: money[0], confidence: 'medium' }
  return null
}

function extractReceiptDate(text: string): string {
  const patterns = [
    /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/,
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{2,4})\b/i,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const parsed = parseFlexibleDate(m[1])
      if (parsed) return parsed
    }
  }
  return todayISO()
}

function extractMerchant(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[\d$.,\-\s]+$/.test(l))
  const skip = /^(receipt|invoice|thank|welcome|tel|phone|www|http|store\s*#|cashier)/i
  const merchant = lines.find((l) => !skip.test(l) && /[a-zA-Z]/.test(l))
  return (merchant ?? 'Receipt purchase').slice(0, 80)
}

export function parseReceiptText(text: string): ParsedTransaction {
  const cleaned = text.replace(/\u0000/g, ' ').trim()
  if (!cleaned) throw new Error('No text found on this receipt. Try a clearer photo.')

  const found = extractReceiptAmount(cleaned)
  if (!found) throw new Error('Could not find a total amount on this receipt.')

  const description = extractMerchant(cleaned)
  const type: ParsedTxnType = 'expense'
  const category = inferCategory(cleaned, type)
  // Default to today so Home "this month" income/spending updates; user can edit in review.
  const ocrDate = extractReceiptDate(cleaned)
  const date = todayISO()

  return {
    id: uid(),
    type,
    amount: found.amount,
    category,
    description,
    date,
    source: 'receipt',
    confidence: found.confidence,
    selected: true,
    raw: `ocr_date=${ocrDate}\n${cleaned.slice(0, 500)}`,
  }
}

export async function ocrReceiptImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100))
      }
    },
  })
  try {
    const { data } = await worker.recognize(file)
    return data.text
  } finally {
    await worker.terminate()
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}
