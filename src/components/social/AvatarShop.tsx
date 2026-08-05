import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import {
  AVATAR_SHOP,
  goalCompletionPoints,
  type AccessorySlot,
} from '../../lib/avatarCatalog'
import { AvatarFigure, AvatarSkinSwatches } from '../avatar/AvatarFigure'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'

const SLOTS: { id: AccessorySlot; label: string }[] = [
  { id: 'hat', label: 'Hats' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'cheeks', label: 'Cheeks' },
  { id: 'scarf', label: 'Scarves' },
  { id: 'pet', label: 'Pets' },
  { id: 'backdrop', label: 'Backdrops' },
]

export function AvatarShopSection() {
  const { user } = useAuth()
  const { goals, purchaseAccessory, equipAccessory, setAvatarSkin, lastPointsEarned, clearPointsToast } =
    useData()
  const [shopOpen, setShopOpen] = useState(false)
  const [slot, setSlot] = useState<AccessorySlot | 'all'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const items = useMemo(
    () => (slot === 'all' ? AVATAR_SHOP : AVATAR_SHOP.filter((i) => i.slot === slot)),
    [slot],
  )

  const nearlyDone = goals
    .filter((g) => !g.points_awarded && Number(g.current_amount) < Number(g.target_amount))
    .sort(
      (a, b) =>
        Number(b.current_amount) / Number(b.target_amount) -
        Number(a.current_amount) / Number(a.target_amount),
    )[0]

  if (!user) return null

  async function buy(id: string) {
    setError('')
    setNotice('')
    setBusyId(id)
    try {
      await purchaseAccessory(id)
      setNotice('Purchased and equipped!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleEquip(id: string, itemSlot: AccessorySlot, owned: boolean) {
    if (!user || !owned) return
    setError('')
    setBusyId(id)
    try {
      const currentlyOn = user.avatar_equipped[itemSlot] === id
      await equipAccessory(currentlyOn ? null : id, itemSlot)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update outfit.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-fingo-green-soft via-white to-fingo-blue-soft px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <AvatarFigure
              name={user.full_name}
              skin={user.avatar_skin}
              equipped={user.avatar_equipped}
              size={88}
              className="shadow-md"
            />
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fingo-green-dark shadow-sm">
                <Icon name="face" className="text-[0.95rem]" />
                Your avatar
              </div>
              <h2 className="font-display text-xl font-extrabold text-fingo-ink">Avatar shop</h2>
              <p className="mt-0.5 text-sm text-fingo-muted">
                Spend goal points on accessories.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1 text-sm font-display font-bold text-amber-800">
                <Icon name="stars" className="text-[1rem] text-amber-500" filled />
                {user.points} points
              </div>
            </div>
          </div>
          <Button variant="primary" onClick={() => setShopOpen(true)}>
            <Icon name="storefront" />
            Open shop
          </Button>
        </div>

        {(lastPointsEarned || nearlyDone) && (
          <div className="space-y-2 border-t border-slate-100 px-5 py-3 sm:px-6">
            {lastPointsEarned != null && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-fingo-green-soft px-4 py-3 text-sm font-semibold text-fingo-green-dark">
                <span>Goal complete! +{lastPointsEarned} points added to your wallet.</span>
                <button type="button" className="text-xs underline" onClick={clearPointsToast}>
                  Dismiss
                </button>
              </div>
            )}
            {nearlyDone && (
              <p className="text-xs font-semibold text-fingo-muted">
                Finish “{nearlyDone.title}” for +{goalCompletionPoints(Number(nearlyDone.target_amount))} pts
              </p>
            )}
          </div>
        )}
      </Card>

      <Modal open={shopOpen} title="Avatar shop" onClose={() => setShopOpen(false)} size="xl">
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <AvatarFigure
              name={user.full_name}
              skin={user.avatar_skin}
              equipped={user.avatar_equipped}
              size={120}
              className="shadow-md"
            />
            <div className="flex-1">
              <p className="text-sm text-fingo-muted">
                Earn points by completing savings goals, then spend them on cute accessories.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 font-display font-bold text-amber-800">
                <Icon name="stars" className="text-amber-500" filled />
                {user.points} points
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-fingo-muted">Skin tone</p>
                <AvatarSkinSwatches value={user.avatar_skin} onChange={(s) => void setAvatarSkin(s)} />
              </div>
            </div>
          </div>

          {(notice || error) && (
            <div className="space-y-2">
              {notice && (
                <div className="rounded-2xl bg-fingo-blue-soft px-4 py-2 text-sm font-semibold text-fingo-blue-dark">
                  {notice}
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">{error}</div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSlot('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                slot === 'all' ? 'bg-fingo-ink text-white' : 'bg-slate-100 text-fingo-muted'
              }`}
            >
              All
            </button>
            {SLOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlot(s.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  slot === s.id ? 'bg-fingo-ink text-white' : 'bg-slate-100 text-fingo-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const owned = user.owned_accessories.includes(item.id)
              const equipped = user.avatar_equipped[item.slot] === item.id
              const canAfford = user.points >= item.price
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-3xl border border-slate-100 bg-slate-50 p-4 shadow-sm"
                >
                  <div
                    className="mb-3 grid h-14 w-14 place-items-center rounded-2xl text-3xl shadow-inner"
                    style={{ background: item.accent }}
                  >
                    {item.emoji}
                  </div>
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h3 className="font-display font-bold text-fingo-ink">{item.name}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-fingo-muted">
                      {item.slot}
                    </span>
                  </div>
                  <p className="mb-3 flex-1 text-xs text-fingo-muted">{item.description}</p>
                  <div className="mb-3 flex items-center gap-1 text-sm font-bold text-amber-700">
                    <Icon name="stars" className="text-[1rem] text-amber-500" filled />
                    {item.price}
                  </div>
                  {owned ? (
                    <Button
                      variant={equipped ? 'secondary' : 'primary'}
                      className="w-full !py-2 text-sm"
                      disabled={busyId === item.id}
                      onClick={() => void toggleEquip(item.id, item.slot, owned)}
                    >
                      {equipped ? 'Unequip' : 'Equip'}
                    </Button>
                  ) : (
                    <Button
                      className="w-full !py-2 text-sm"
                      disabled={!canAfford || busyId === item.id}
                      onClick={() => void buy(item.id)}
                    >
                      {canAfford ? 'Buy' : 'Need more points'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </>
  )
}
