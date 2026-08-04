export type AccessorySlot = 'hat' | 'glasses' | 'scarf' | 'pet' | 'cheeks' | 'backdrop'

export interface AvatarAccessory {
  id: string
  name: string
  description: string
  slot: AccessorySlot
  price: number
  emoji: string
  accent: string
}

export interface AvatarEquipped {
  hat: string | null
  glasses: string | null
  scarf: string | null
  pet: string | null
  cheeks: string | null
  backdrop: string | null
}

export type AvatarSkin = 'peach' | 'honey' | 'cocoa' | 'olive' | 'rose'

export const AVATAR_SKINS: { id: AvatarSkin; label: string; color: string }[] = [
  { id: 'peach', label: 'Peach', color: '#F8C8A0' },
  { id: 'honey', label: 'Honey', color: '#D4A373' },
  { id: 'cocoa', label: 'Cocoa', color: '#8D5524' },
  { id: 'olive', label: 'Olive', color: '#C2B280' },
  { id: 'rose', label: 'Rose', color: '#E8A0A0' },
]

export const EMPTY_EQUIPPED: AvatarEquipped = {
  hat: null,
  glasses: null,
  scarf: null,
  pet: null,
  cheeks: null,
  backdrop: null,
}

export const AVATAR_SHOP: AvatarAccessory[] = [
  {
    id: 'hat-frog',
    name: 'Froggy Cap',
    description: 'A tiny lily-pad beanie for lucky savers.',
    slot: 'hat',
    price: 80,
    emoji: '🐸',
    accent: '#86EFAC',
  },
  {
    id: 'hat-crown',
    name: 'Budget Crown',
    description: 'Royal vibes for finishing a savings quest.',
    slot: 'hat',
    price: 160,
    emoji: '👑',
    accent: '#FDE68A',
  },
  {
    id: 'hat-beanie',
    name: 'Cozy Beanie',
    description: 'Soft, stripey, and winter-budget approved.',
    slot: 'hat',
    price: 60,
    emoji: '🧶',
    accent: '#93C5FD',
  },
  {
    id: 'glasses-round',
    name: 'Round Specs',
    description: 'See your goals more clearly.',
    slot: 'glasses',
    price: 70,
    emoji: '👓',
    accent: '#CBD5E1',
  },
  {
    id: 'glasses-star',
    name: 'Star Shades',
    description: 'Sparkle while you stack points.',
    slot: 'glasses',
    price: 110,
    emoji: '🕶️',
    accent: '#F9A8D4',
  },
  {
    id: 'cheeks-blush',
    name: 'Happy Blush',
    description: 'Soft pink cheeks for good money days.',
    slot: 'cheeks',
    price: 40,
    emoji: '😊',
    accent: '#FDA4AF',
  },
  {
    id: 'cheeks-sparkle',
    name: 'Sparkle Dust',
    description: 'A little glitter for big milestones.',
    slot: 'cheeks',
    price: 55,
    emoji: '✨',
    accent: '#FDE047',
  },
  {
    id: 'scarf-mint',
    name: 'Mint Scarf',
    description: 'Fresh green wrap for chilly bill seasons.',
    slot: 'scarf',
    price: 75,
    emoji: '🧣',
    accent: '#6EE7B7',
  },
  {
    id: 'scarf-heart',
    name: 'Heart Bow',
    description: 'A sweet bow for shared savings wins.',
    slot: 'scarf',
    price: 90,
    emoji: '🎀',
    accent: '#FB7185',
  },
  {
    id: 'pet-piggy',
    name: 'Mini Piggy',
    description: 'Your tiny bank buddy tags along.',
    slot: 'pet',
    price: 140,
    emoji: '🐷',
    accent: '#FDA4AF',
  },
  {
    id: 'pet-cat',
    name: 'Coin Cat',
    description: 'Purrs whenever a goal fills up.',
    slot: 'pet',
    price: 150,
    emoji: '🐱',
    accent: '#FDBA74',
  },
  {
    id: 'pet-sprout',
    name: 'Money Sprout',
    description: 'A leafy friend that grows with you.',
    slot: 'pet',
    price: 95,
    emoji: '🌱',
    accent: '#86EFAC',
  },
  {
    id: 'backdrop-clouds',
    name: 'Dream Clouds',
    description: 'Floaty clouds behind your avatar.',
    slot: 'backdrop',
    price: 65,
    emoji: '☁️',
    accent: '#E0F2FE',
  },
  {
    id: 'backdrop-stars',
    name: 'Night Stars',
    description: 'A twinkly sky for night owls who save.',
    slot: 'backdrop',
    price: 85,
    emoji: '⭐',
    accent: '#C4B5FD',
  },
  {
    id: 'backdrop-garden',
    name: 'Goal Garden',
    description: 'Soft meadow vibes for steady growers.',
    slot: 'backdrop',
    price: 100,
    emoji: '🌷',
    accent: '#BBF7D0',
  },
]

export function getAccessory(id: string | null | undefined) {
  if (!id) return null
  return AVATAR_SHOP.find((item) => item.id === id) ?? null
}

export function goalCompletionPoints(targetAmount: number): number {
  return 100 + Math.min(200, Math.floor(Number(targetAmount) / 20))
}

export function normalizeEquipped(raw: Partial<AvatarEquipped> | null | undefined): AvatarEquipped {
  return {
    hat: raw?.hat ?? null,
    glasses: raw?.glasses ?? null,
    scarf: raw?.scarf ?? null,
    pet: raw?.pet ?? null,
    cheeks: raw?.cheeks ?? null,
    backdrop: raw?.backdrop ?? null,
  }
}
