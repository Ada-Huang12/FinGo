import { useEffect, useRef, useState } from 'react'
import { useData } from '../../contexts/DataContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, formatCurrency } from '../../lib/format'
import {
  ocrReceiptImage,
  parseCsvTransactions,
  parseReceiptText,
  prepareImportRows,
  readFileAsText,
  type ParsedTransaction,
} from '../../lib/importParsers'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const confidenceStyle = {
  high: 'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

type Panel = 'home' | 'receipt-choice' | 'camera'

export function ImportScanButton() {
  const { addTransaction } = useData()
  const csvRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraFileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('home')
  const [rows, setRows] = useState<ParsedTransaction[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [ocrPct, setOcrPct] = useState(0)
  const [dateNote, setDateNote] = useState('')

  function resetMessages() {
    setError('')
    setSuccess('')
    setDateNote('')
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  useEffect(() => {
    if (panel !== 'camera') return

    let cancelled = false

    ;(async () => {
      stopCamera()
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        if (cancelled) return
        setPanel('receipt-choice')
        setError(
          'Could not open the live camera. Try “Take photo” with the system camera, or upload an image.',
        )
      }
    })()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [panel])

  function openLiveCamera() {
    resetMessages()
    setError('')
    setPanel('camera')
    setOpen(true)
  }

  function openNativeCamera() {
    resetMessages()
    setPanel('home')
    setOpen(true)
    cameraFileRef.current?.click()
  }

  async function snapPhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) {
      setError('Camera is not ready yet.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    stopCamera()
    setPanel('home')
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) {
      setError('Could not capture photo.')
      return
    }
    const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await handleReceipt(file)
  }

  async function handleCsv(file: File) {
    resetMessages()
    setBusy(true)
    setProgress('Reading CSV…')
    setPanel('home')
    try {
      const text = await readFileAsText(file)
      const parsed = parseCsvTransactions(text)
      const { rows: aligned, shiftedCount } = prepareImportRows(parsed)
      setRows(aligned)
      setDateNote(
        shiftedCount > 0
          ? `${shiftedCount} row${shiftedCount > 1 ? 's were' : ' was'} moved into this month so Home income/spending updates. Edit dates if you want to keep the originals.`
          : '',
      )
      setOpen(true)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV import failed.')
      setOpen(true)
    } finally {
      setBusy(false)
      if (csvRef.current) csvRef.current.value = ''
    }
  }

  async function handleReceipt(file: File) {
    resetMessages()
    if (!file.type.startsWith('image/')) {
      setError('Please use a receipt image (JPG, PNG, HEIC, or WebP).')
      setOpen(true)
      setPanel('home')
      return
    }
    setBusy(true)
    setOcrPct(0)
    setProgress('Scanning receipt with OCR…')
    setOpen(true)
    setPanel('home')
    try {
      const text = await ocrReceiptImage(file, setOcrPct)
      const parsed = parseReceiptText(text)
      const { rows: aligned } = prepareImportRows([parsed])
      setRows(aligned)
      setDateNote('Receipt dated for today so it counts toward this month’s Home totals. Change the date if needed.')
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Receipt scan failed.')
      setRows([])
      setProgress('')
    } finally {
      setBusy(false)
      setOcrPct(0)
      if (uploadRef.current) uploadRef.current.value = ''
      if (cameraFileRef.current) cameraFileRef.current.value = ''
    }
  }

  function openReceiptChoice() {
    resetMessages()
    stopCamera()
    setPanel('receipt-choice')
    setOpen(true)
  }

  function closeModal() {
    if (busy) return
    stopCamera()
    setOpen(false)
    setPanel('home')
    setRows([])
    setError('')
    setSuccess('')
    setProgress('')
    setDateNote('')
  }

  function updateRow(id: string, patch: Partial<ParsedTransaction>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, ...patch }
        if (patch.type && patch.type !== r.type) {
          next.category = 'Other'
        }
        return next
      }),
    )
  }

  async function logSelected() {
    resetMessages()
    const selected = rows.filter((r) => r.selected && r.amount > 0)
    if (!selected.length) {
      setError('Select at least one transaction to log.')
      return
    }
    setBusy(true)
    setProgress(`Logging ${selected.length} transaction${selected.length > 1 ? 's' : ''}…`)
    try {
      for (const row of selected) {
        await addTransaction({
          type: row.type,
          amount: Number(row.amount),
          category: row.category,
          description: row.description || row.category,
          date: row.date,
        })
      }
      setSuccess(
        `Logged ${selected.length} transaction${selected.length > 1 ? 's' : ''} — Home income/spending updated.`,
      )
      setRows([])
      setDateNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log transactions.')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const selectedCount = rows.filter((r) => r.selected).length

  return (
    <>
      <input
        ref={csvRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleCsv(file)
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleReceipt(file)
        }}
      />
      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleReceipt(file)
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="w-full sm:w-auto" disabled={busy} onClick={openReceiptChoice}>
          <Icon name="photo_camera" />
          Scan receipt
        </Button>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => csvRef.current?.click()}
        >
          <Icon name="upload_file" />
          Import CSV
        </Button>
      </div>

      <Modal open={open} wide title="Import & scan" onClose={closeModal}>
        <div className="space-y-4">
          {panel === 'receipt-choice' && (
            <>
              <p className="text-sm text-fingo-muted">
                Scan a receipt by taking a new photo or uploading one from your device.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={openLiveCamera}
                  className="card-raised flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fingo-green-soft text-fingo-green">
                    <Icon name="photo_camera" className="text-[1.6rem]" />
                  </span>
                  <span className="font-display font-bold">Take photo</span>
                  <span className="text-xs text-fingo-muted">Use your camera to snap the receipt</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => uploadRef.current?.click()}
                  className="card-raised flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fingo-blue-soft text-fingo-blue">
                    <Icon name="image" className="text-[1.6rem]" />
                  </span>
                  <span className="font-display font-bold">Upload photo</span>
                  <span className="text-xs text-fingo-muted">Choose an existing image from your files</span>
                </button>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-fingo-muted hover:text-fingo-ink"
                onClick={openNativeCamera}
              >
                Prefer the system camera app instead?
              </button>
            </>
          )}

          {panel === 'camera' && (
            <>
              <p className="text-sm text-fingo-muted">Line up the receipt, then capture.</p>
              <div className="overflow-hidden rounded-3xl bg-slate-900 shadow-inner">
                <video ref={videoRef} playsInline muted className="aspect-[3/4] w-full object-cover sm:aspect-video" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => void snapPhoto()}>
                  <Icon name="camera" />
                  Capture & scan
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    stopCamera()
                    setPanel('receipt-choice')
                  }}
                >
                  Back
                </Button>
              </div>
            </>
          )}

          {panel === 'home' && (
            <>
              <p className="text-sm text-fingo-muted">
                Upload a bank/export CSV or a receipt photo. FinGo extracts the details so you can review
                and log them in one tap.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="!py-2 text-sm"
                  disabled={busy}
                  onClick={() => setPanel('receipt-choice')}
                >
                  <Icon name="photo_camera" />
                  Receipt
                </Button>
                <Button
                  variant="secondary"
                  className="!py-2 text-sm"
                  disabled={busy}
                  onClick={() => csvRef.current?.click()}
                >
                  <Icon name="upload_file" />
                  CSV
                </Button>
                <a
                  href="/sample-transactions.csv"
                  download
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-fingo-blue hover:bg-fingo-blue-soft"
                >
                  <Icon name="download" className="text-[1rem]" />
                  Sample CSV
                </a>
              </div>
            </>
          )}

          {busy && (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-fingo-muted">
              <div className="mb-2 flex items-center gap-2">
                <Icon name="progress_activity" className="animate-spin" />
                {progress || 'Working…'}
              </div>
              {ocrPct > 0 && (
                <div className="progress-track">
                  <div className="progress-fill blue" style={{ width: `${ocrPct}%` }} />
                </div>
              )}
            </div>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>}
          {success && (
            <p className="rounded-2xl bg-fingo-green-soft px-3 py-2 text-sm font-semibold text-fingo-green-dark">
              {success}
            </p>
          )}
          {dateNote && !error && (
            <p className="rounded-2xl bg-fingo-blue-soft px-3 py-2 text-sm font-medium text-fingo-blue">
              {dateNote}
            </p>
          )}

          {panel === 'home' && rows.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fingo-ink">
                  {rows.length} detected · {selectedCount} selected
                </p>
                <button
                  type="button"
                  className="text-xs font-bold text-fingo-blue"
                  onClick={() =>
                    setRows((prev) => prev.map((r) => ({ ...r, selected: selectedCount < prev.length })))
                  }
                >
                  {selectedCount === rows.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {rows.map((row) => {
                  const cats = row.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
                  return (
                    <div
                      key={row.id}
                      className={`rounded-2xl border p-3 ${
                        row.selected ? 'border-fingo-green/40 bg-white' : 'border-slate-100 bg-slate-50 opacity-70'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm font-bold">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                          />
                          {row.source === 'receipt' ? 'Receipt' : 'CSV row'}
                        </label>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${confidenceStyle[row.confidence]}`}
                        >
                          {row.confidence} confidence
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          className="input-field"
                          value={row.description}
                          onChange={(e) => updateRow(row.id, { description: e.target.value })}
                          placeholder="Description"
                        />
                        <input
                          className="input-field"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                        />
                        <input
                          className="input-field"
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.id, { date: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="input-field"
                            value={row.type}
                            onChange={(e) =>
                              updateRow(row.id, { type: e.target.value as 'income' | 'expense' })
                            }
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                          <select
                            className="input-field"
                            value={row.category}
                            onChange={(e) => updateRow(row.id, { category: e.target.value })}
                          >
                            {cats.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-fingo-muted">
                        Preview: {row.type} · {formatCurrency(row.amount)} · {row.category} · {row.date}
                      </p>
                    </div>
                  )
                })}
              </div>

              <Button className="w-full" disabled={busy || selectedCount === 0} onClick={() => void logSelected()}>
                <Icon name="check_circle" />
                Log {selectedCount || ''} transaction{selectedCount === 1 ? '' : 's'}
              </Button>
            </>
          )}

          {panel === 'home' && !busy && rows.length === 0 && !success && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-fingo-muted">
              Choose a receipt photo or CSV to auto-fill transactions.
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
