import type { AvatarEquipped, AvatarSkin } from './avatarCatalog'

export type TransactionType = 'income' | 'expense'
export type BillStatus = 'pending' | 'paid' | 'overdue'
export type BillingCycle = 'weekly' | 'monthly' | 'yearly'
export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  points: number
  avatar_skin: AvatarSkin
  avatar_equipped: AvatarEquipped
  owned_accessories: string[]
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  limit_amount: number
  spent_amount: number
  month: string
  created_at: string
}

export interface Bill {
  id: string
  user_id: string
  name: string
  amount: number
  due_date: string
  status: BillStatus
  category: string
  icon: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  name: string
  amount: number
  billing_cycle: BillingCycle
  next_billing_date: string
  active: boolean
  icon: string
  color: string
  created_at: string
}

export interface Goal {
  id: string
  owner_id: string
  title: string
  target_amount: number
  current_amount: number
  deadline: string | null
  is_collaborative: boolean
  icon: string
  color: string
  points_awarded: boolean
  created_at: string
  members?: GoalMember[]
}

export interface GoalMember {
  id: string
  goal_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
  profile?: Profile
}

export interface GoalContribution {
  id: string
  goal_id: string
  user_id: string
  amount: number
  note: string
  created_at: string
  profile?: Profile
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  friend?: Profile
}

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description: string
  goal_amount: number | null
  ends_at: string | null
  created_at: string
  progress?: number
  participants_count?: number
}

export interface AiMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface MonthlyChartPoint {
  month: string
  income: number
  spending: number
}

export interface CategorySlice {
  category: string
  amount: number
  color: string
}

export function defaultAvatarProfileFields() {
  return {
    points: 0,
    avatar_skin: 'peach' as AvatarSkin,
    avatar_equipped: {
      hat: null,
      glasses: null,
      scarf: null,
      pet: null,
      cheeks: null,
      backdrop: null,
    } satisfies AvatarEquipped,
    owned_accessories: [] as string[],
  }
}
