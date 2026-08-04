import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { format, subMonths } from 'date-fns'
import { useAuth } from './AuthContext'
import { generateCoachReply } from '../lib/aiCoach'
import {
  AVATAR_SHOP,
  goalCompletionPoints,
  type AccessorySlot,
  type AvatarSkin,
} from '../lib/avatarCatalog'
import { CATEGORY_COLORS, currentMonth, uid } from '../lib/format'
import { loadStore, saveStore } from '../lib/localStore'
import { supabase } from '../lib/supabase'
import type {
  AiMessage,
  Bill,
  BillStatus,
  BillingCycle,
  Budget,
  CategorySlice,
  Challenge,
  Friendship,
  Goal,
  GoalContribution,
  MonthlyChartPoint,
  Profile,
  Subscription,
  Transaction,
  TransactionType,
} from '../lib/types'

interface DataContextValue {
  loading: boolean
  transactions: Transaction[]
  budgets: Budget[]
  bills: Bill[]
  subscriptions: Subscription[]
  goals: Goal[]
  contributions: GoalContribution[]
  friendships: Friendship[]
  friends: Profile[]
  challenges: Challenge[]
  aiMessages: AiMessage[]
  chartData: MonthlyChartPoint[]
  categoryData: CategorySlice[]
  lastPointsEarned: number | null
  refresh: () => Promise<void>
  addTransaction: (input: {
    type: TransactionType
    amount: number
    category: string
    description: string
    date: string
  }) => Promise<void>
  updateBudget: (id: string, limit_amount: number) => Promise<void>
  updateBillStatus: (id: string, status: BillStatus) => Promise<void>
  addBill: (input: {
    name: string
    amount: number
    due_date: string
    status: BillStatus
    category: string
    icon: string
  }) => Promise<void>
  toggleSubscription: (id: string) => Promise<void>
  addSubscription: (input: {
    name: string
    amount: number
    billing_cycle: BillingCycle
    next_billing_date: string
    active: boolean
    icon: string
    color: string
  }) => Promise<void>
  createGoal: (input: {
    title: string
    target_amount: number
    deadline: string | null
    is_collaborative: boolean
    icon: string
    color: string
  }) => Promise<void>
  contributeToGoal: (goalId: string, amount: number, note: string) => Promise<void>
  inviteFriendToGoal: (goalId: string, friendId: string) => Promise<void>
  acceptFriendship: (id: string) => Promise<void>
  declineFriendship: (id: string) => Promise<void>
  sendFriendRequest: (email: string) => Promise<void>
  sendAiMessage: (content: string) => Promise<void>
  purchaseAccessory: (accessoryId: string) => Promise<void>
  equipAccessory: (accessoryId: string | null, slot: AccessorySlot) => Promise<void>
  setAvatarSkin: (skin: AvatarSkin) => Promise<void>
  clearPointsToast: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

function buildChart(transactions: Transaction[]): MonthlyChartPoint[] {
  const points: MonthlyChartPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    const key = format(d, 'yyyy-MM')
    const label = format(d, 'MMM')
    const monthTx = transactions.filter((t) => t.date.startsWith(key))
    points.push({
      month: label,
      income: monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
      spending: monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
    })
  }
  return points
}

function buildCategories(transactions: Transaction[]): CategorySlice[] {
  const month = currentMonth()
  const map = new Map<string, number>()
  transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(month))
    .forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount)))
  return [...map.entries()]
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] ?? '#94A3B8',
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, mode, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [contributions, setContributions] = useState<GoalContribution[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [friends, setFriends] = useState<Profile[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([])
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null)
  const activeUserIdRef = useRef<string | null>(null)

  const clearData = useCallback(() => {
    setTransactions([])
    setBudgets([])
    setBills([])
    setSubscriptions([])
    setGoals([])
    setContributions([])
    setFriendships([])
    setFriends([])
    setChallenges([])
    setAiMessages([])
    setLastPointsEarned(null)
  }, [])

  const refreshLocal = useCallback(() => {
    if (!user) return
    const store = loadStore()
    const uid_ = user.id
    const txs = store.transactions.filter((t) => t.user_id === uid_)
    const userGoals = store.goals.filter(
      (g) =>
        g.owner_id === uid_ ||
        store.goalMembers.some((m) => m.goal_id === g.id && m.user_id === uid_),
    )
    const goalIds = new Set(userGoals.map((g) => g.id))
    const contribs = store.contributions
      .filter((c) => goalIds.has(c.goal_id))
      .map((c) => ({
        ...c,
        profile: store.profiles.find((p) => p.id === c.user_id),
      }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))

    const fs = store.friendships.filter(
      (f) => f.requester_id === uid_ || f.addressee_id === uid_,
    )
    const friendProfiles = fs
      .filter((f) => f.status === 'accepted')
      .map((f) => {
        const friendId = f.requester_id === uid_ ? f.addressee_id : f.requester_id
        return store.profiles.find((p) => p.id === friendId)
      })
      .filter(Boolean) as Profile[]

    const enrichedFriendships = fs.map((f) => {
      const friendId = f.requester_id === uid_ ? f.addressee_id : f.requester_id
      return { ...f, friend: store.profiles.find((p) => p.id === friendId) }
    })

    const enrichedGoals = userGoals.map((g) => ({
      ...g,
      members: store.goalMembers
        .filter((m) => m.goal_id === g.id)
        .map((m) => ({ ...m, profile: store.profiles.find((p) => p.id === m.user_id) })),
    }))

    const userChallenges = store.challenges
      .filter(
        (c) =>
          c.creator_id === uid_ ||
          store.challengeParticipants.some((p) => p.challenge_id === c.id && p.user_id === uid_) ||
          friendProfiles.some((f) => f.id === c.creator_id),
      )
      .map((c) => {
        const parts = store.challengeParticipants.filter((p) => p.challenge_id === c.id)
        const mine = parts.find((p) => p.user_id === uid_)
        return {
          ...c,
          progress: mine?.progress ?? 0,
          participants_count: parts.length,
        }
      })

    setTransactions(txs)
    setBudgets(store.budgets.filter((b) => b.user_id === uid_))
    setBills(store.bills.filter((b) => b.user_id === uid_))
    setSubscriptions(store.subscriptions.filter((s) => s.user_id === uid_))
    setGoals(enrichedGoals)
    setContributions(contribs)
    setFriendships(enrichedFriendships)
    setFriends(friendProfiles)
    setChallenges(userChallenges)
    setAiMessages(store.aiMessages.filter((m) => m.user_id === uid_))
  }, [user])

  const refreshSupabase = useCallback(async () => {
    if (!user || !supabase) return
    const uid_ = user.id
    const month = currentMonth()

    const [
      txRes,
      budgetRes,
      billRes,
      subRes,
      goalRes,
      memberRes,
      contribRes,
      friendRes,
      challengeRes,
      aiRes,
    ] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', uid_).order('date', { ascending: false }),
      supabase.from('budgets').select('*').eq('user_id', uid_).eq('month', month),
      supabase.from('bills').select('*').eq('user_id', uid_).order('due_date'),
      supabase.from('subscriptions').select('*').eq('user_id', uid_),
      supabase.from('goals').select('*'),
      supabase.from('goal_members').select('*'),
      supabase.from('goal_contributions').select('*, profile:profiles(*)').order('created_at', { ascending: false }),
      supabase.from('friendships').select('*'),
      supabase.from('challenges').select('*').order('created_at', { ascending: false }),
      supabase.from('ai_messages').select('*').eq('user_id', uid_).order('created_at'),
    ])

    const memberships = (memberRes.data ?? []) as { goal_id: string; user_id: string; role: string; id: string; joined_at: string }[]
    const myGoalIds = new Set(
      memberships.filter((m) => m.user_id === uid_).map((m) => m.goal_id).concat(
        ((goalRes.data ?? []) as Goal[]).filter((g) => g.owner_id === uid_).map((g) => g.id),
      ),
    )
    const goalsData = ((goalRes.data ?? []) as Goal[])
      .filter((g) => myGoalIds.has(g.id) || g.owner_id === uid_)
      .map((g) => ({
        ...g,
        members: memberships
          .filter((m) => m.goal_id === g.id)
          .map((m) => ({ ...m, role: m.role as 'owner' | 'member' })),
      }))

    const friendshipsData = ((friendRes.data ?? []) as Friendship[]).filter(
      (f) => f.requester_id === uid_ || f.addressee_id === uid_,
    )
    const friendIds = friendshipsData
      .filter((f) => f.status === 'accepted')
      .map((f) => (f.requester_id === uid_ ? f.addressee_id : f.requester_id))

    let friendProfiles: Profile[] = []
    if (friendIds.length) {
      const { data } = await supabase.from('profiles').select('*').in('id', friendIds)
      friendProfiles = (data ?? []) as Profile[]
    }

    // Also resolve friendship.friend for pending requests
    const relatedIds = [
      ...new Set(
        friendshipsData.map((f) => (f.requester_id === uid_ ? f.addressee_id : f.requester_id)),
      ),
    ]
    let relatedProfiles: Profile[] = friendProfiles
    if (relatedIds.length) {
      const { data } = await supabase.from('profiles').select('*').in('id', relatedIds)
      relatedProfiles = (data ?? []) as Profile[]
    }

    setTransactions((txRes.data ?? []) as Transaction[])
    setBudgets((budgetRes.data ?? []) as Budget[])
    setBills((billRes.data ?? []) as Bill[])
    setSubscriptions((subRes.data ?? []) as Subscription[])
    setGoals(goalsData)
    setContributions(
      ((contribRes.data ?? []) as Array<GoalContribution & { profile: Profile }>)
        .filter((c) => myGoalIds.has(c.goal_id))
        .map((c) => ({ ...c, profile: c.profile })),
    )
    setFriendships(
      friendshipsData.map((f) => ({
        ...f,
        friend: relatedProfiles.find(
          (p) => p.id === (f.requester_id === uid_ ? f.addressee_id : f.requester_id),
        ),
      })),
    )
    setFriends(friendProfiles)
    setChallenges((challengeRes.data ?? []) as Challenge[])
    setAiMessages((aiRes.data ?? []) as AiMessage[])
  }, [user])

  const refresh = useCallback(async () => {
    if (!user) {
      activeUserIdRef.current = null
      clearData()
      setLoading(false)
      return
    }

    // Switching accounts: wipe previous user's in-memory data immediately.
    if (activeUserIdRef.current !== user.id) {
      activeUserIdRef.current = user.id
      clearData()
    }

    setLoading(true)
    try {
      if (mode === 'local') refreshLocal()
      else await refreshSupabase()
    } finally {
      setLoading(false)
    }
  }, [user, mode, refreshLocal, refreshSupabase, clearData])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addTransaction: DataContextValue['addTransaction'] = async (input) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      const tx: Transaction = {
        id: uid(),
        user_id: user.id,
        ...input,
        created_at: new Date().toISOString(),
      }
      store.transactions.unshift(tx)
      if (input.type === 'expense') {
        const month = input.date.slice(0, 7)
        const budget = store.budgets.find(
          (b) => b.user_id === user.id && b.category === input.category && b.month === month,
        )
        if (budget) budget.spent_amount = Number(budget.spent_amount) + input.amount
      }
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return

    // Optimistic update so Home income/spending cards refresh immediately.
    const optimistic: Transaction = {
      id: uid(),
      user_id: user.id,
      type: input.type,
      amount: input.amount,
      category: input.category,
      description: input.description,
      date: input.date,
      created_at: new Date().toISOString(),
    }
    setTransactions((prev) => [optimistic, ...prev])
    if (input.type === 'expense') {
      const month = input.date.slice(0, 7)
      setBudgets((prev) =>
        prev.map((b) =>
          b.category === input.category && b.month === month
            ? { ...b, spent_amount: Number(b.spent_amount) + input.amount }
            : b,
        ),
      )
    }

    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      ...input,
    })
    if (error) {
      setTransactions((prev) => prev.filter((t) => t.id !== optimistic.id))
      throw error
    }
    if (input.type === 'expense') {
      const month = input.date.slice(0, 7)
      const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', input.category)
        .eq('month', month)
        .maybeSingle()
      if (budget) {
        await supabase
          .from('budgets')
          .update({ spent_amount: Number(budget.spent_amount) + input.amount })
          .eq('id', budget.id)
      }
    }
    await refreshSupabase()
  }

  const updateBudget: DataContextValue['updateBudget'] = async (id, limit_amount) => {
    if (mode === 'local') {
      const store = loadStore()
      const b = store.budgets.find((x) => x.id === id)
      if (b) b.limit_amount = limit_amount
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const { error } = await supabase.from('budgets').update({ limit_amount }).eq('id', id)
    if (error) throw error
    await refreshSupabase()
  }

  const updateBillStatus: DataContextValue['updateBillStatus'] = async (id, status) => {
    if (mode === 'local') {
      const store = loadStore()
      const bill = store.bills.find((b) => b.id === id)
      if (bill) bill.status = status
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const { error } = await supabase.from('bills').update({ status }).eq('id', id)
    if (error) throw error
    await refreshSupabase()
  }

  const addBill: DataContextValue['addBill'] = async (input) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      store.bills.push({
        id: uid(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        ...input,
      })
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const { error } = await supabase.from('bills').insert({ user_id: user.id, ...input })
    if (error) throw error
    await refreshSupabase()
  }

  const toggleSubscription: DataContextValue['toggleSubscription'] = async (id) => {
    if (mode === 'local') {
      const store = loadStore()
      const sub = store.subscriptions.find((s) => s.id === id)
      if (sub) sub.active = !sub.active
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const current = subscriptions.find((s) => s.id === id)
    if (!current) return
    const { error } = await supabase
      .from('subscriptions')
      .update({ active: !current.active })
      .eq('id', id)
    if (error) throw error
    await refreshSupabase()
  }

  const addSubscription: DataContextValue['addSubscription'] = async (input) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      store.subscriptions.push({
        id: uid(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        ...input,
      })
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const { error } = await supabase.from('subscriptions').insert({ user_id: user.id, ...input })
    if (error) throw error
    await refreshSupabase()
  }

  const createGoal: DataContextValue['createGoal'] = async (input) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      const goal: Goal = {
        id: uid(),
        owner_id: user.id,
        current_amount: 0,
        points_awarded: false,
        created_at: new Date().toISOString(),
        ...input,
      }
      store.goals.push(goal)
      store.goalMembers.push({
        id: uid(),
        goal_id: goal.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString(),
      })
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const { data, error } = await supabase
      .from('goals')
      .insert({ owner_id: user.id, current_amount: 0, points_awarded: false, ...input })
      .select()
      .single()
    if (error) throw error
    await supabase.from('goal_members').insert({
      goal_id: data.id,
      user_id: user.id,
      role: 'owner',
    })
    await refreshSupabase()
  }

  const contributeToGoal: DataContextValue['contributeToGoal'] = async (goalId, amount, note) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      store.contributions.unshift({
        id: uid(),
        goal_id: goalId,
        user_id: user.id,
        amount,
        note,
        created_at: new Date().toISOString(),
      })
      const goal = store.goals.find((g) => g.id === goalId)
      if (goal) {
        const before = Number(goal.current_amount)
        const after = before + amount
        goal.current_amount = after
        if (!goal.points_awarded && before < Number(goal.target_amount) && after >= Number(goal.target_amount)) {
          const earned = goalCompletionPoints(Number(goal.target_amount))
          goal.points_awarded = true
          const profile = store.profiles.find((p) => p.id === user.id)
          if (profile) profile.points = Number(profile.points) + earned
          setLastPointsEarned(earned)
        }
      }
      saveStore(store)
      refreshLocal()
      await refreshProfile()
      return
    }
    if (!supabase) return
    const { data: goalBefore } = await supabase.from('goals').select('*').eq('id', goalId).maybeSingle()
    const { error } = await supabase.from('goal_contributions').insert({
      goal_id: goalId,
      user_id: user.id,
      amount,
      note,
    })
    if (error) throw error

    if (goalBefore && !goalBefore.points_awarded) {
      const before = Number(goalBefore.current_amount)
      const after = before + amount
      if (before < Number(goalBefore.target_amount) && after >= Number(goalBefore.target_amount)) {
        const earned = goalCompletionPoints(Number(goalBefore.target_amount))
        await supabase.from('goals').update({ points_awarded: true }).eq('id', goalId)
        const { data: profile } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', user.id)
          .maybeSingle()
        await supabase
          .from('profiles')
          .update({ points: Number(profile?.points ?? 0) + earned })
          .eq('id', user.id)
        setLastPointsEarned(earned)
        await refreshProfile()
      }
    }
    await refreshSupabase()
  }

  const purchaseAccessory: DataContextValue['purchaseAccessory'] = async (accessoryId) => {
    if (!user) return
    const item = AVATAR_SHOP.find((a) => a.id === accessoryId)
    if (!item) throw new Error('Item not found.')
    if (user.owned_accessories.includes(accessoryId)) throw new Error('You already own this.')
    if (user.points < item.price) throw new Error('Not enough points.')

    if (mode === 'local') {
      const store = loadStore()
      const profile = store.profiles.find((p) => p.id === user.id)
      if (!profile) return
      profile.points = Number(profile.points) - item.price
      profile.owned_accessories = [...profile.owned_accessories, accessoryId]
      profile.avatar_equipped = {
        ...profile.avatar_equipped,
        [item.slot]: accessoryId,
      }
      saveStore(store)
      refreshLocal()
      await refreshProfile()
      return
    }
    if (!supabase) return
    const owned = [...user.owned_accessories, accessoryId]
    const equipped = { ...user.avatar_equipped, [item.slot]: accessoryId }
    const { error } = await supabase
      .from('profiles')
      .update({
        points: user.points - item.price,
        owned_accessories: owned,
        avatar_equipped: equipped,
      })
      .eq('id', user.id)
    if (error) throw error
    await refreshProfile()
  }

  const equipAccessory: DataContextValue['equipAccessory'] = async (accessoryId, slot) => {
    if (!user) return
    if (accessoryId && !user.owned_accessories.includes(accessoryId)) {
      throw new Error('Purchase this accessory first.')
    }
    const equipped = { ...user.avatar_equipped, [slot]: accessoryId }
    if (mode === 'local') {
      const store = loadStore()
      const profile = store.profiles.find((p) => p.id === user.id)
      if (!profile) return
      profile.avatar_equipped = equipped
      saveStore(store)
      await refreshProfile()
      return
    }
    if (!supabase) return
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_equipped: equipped })
      .eq('id', user.id)
    if (error) throw error
    await refreshProfile()
  }

  const setAvatarSkin: DataContextValue['setAvatarSkin'] = async (skin) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      const profile = store.profiles.find((p) => p.id === user.id)
      if (!profile) return
      profile.avatar_skin = skin
      saveStore(store)
      await refreshProfile()
      return
    }
    if (!supabase) return
    const { error } = await supabase.from('profiles').update({ avatar_skin: skin }).eq('id', user.id)
    if (error) throw error
    await refreshProfile()
  }

  const clearPointsToast = () => setLastPointsEarned(null)

  const inviteFriendToGoal: DataContextValue['inviteFriendToGoal'] = async (goalId, friendId) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      const goal = store.goals.find((g) => g.id === goalId)
      if (goal) goal.is_collaborative = true
      if (!store.goalMembers.some((m) => m.goal_id === goalId && m.user_id === friendId)) {
        store.goalMembers.push({
          id: uid(),
          goal_id: goalId,
          user_id: friendId,
          role: 'member',
          joined_at: new Date().toISOString(),
        })
      }
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    await supabase.from('goals').update({ is_collaborative: true }).eq('id', goalId)
    const { error } = await supabase.from('goal_members').insert({
      goal_id: goalId,
      user_id: friendId,
      role: 'member',
    })
    if (error) throw error
    await refreshSupabase()
  }

  const acceptFriendship: DataContextValue['acceptFriendship'] = async (id) => {
    if (mode === 'local') {
      const store = loadStore()
      const f = store.friendships.find((x) => x.id === id)
      if (f) f.status = 'accepted'
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id)
    await refreshSupabase()
  }

  const declineFriendship: DataContextValue['declineFriendship'] = async (id) => {
    if (mode === 'local') {
      const store = loadStore()
      store.friendships = store.friendships.filter((f) => f.id !== id)
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', id)
    await refreshSupabase()
  }

  const sendFriendRequest: DataContextValue['sendFriendRequest'] = async (email) => {
    if (!user) return
    if (mode === 'local') {
      const store = loadStore()
      const target = store.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase())
      if (!target) throw new Error('No user found with that email in local demo mode.')
      if (target.id === user.id) throw new Error('You cannot friend yourself.')
      store.friendships.push({
        id: uid(),
        requester_id: user.id,
        addressee_id: target.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    const normalized = email.trim().toLowerCase()
    const { data: matches, error: findErr } = await supabase.rpc('find_profile_by_email', {
      p_email: normalized,
    })
    if (findErr) throw new Error(findErr.message || 'Could not look up that email.')
    const target = Array.isArray(matches) ? matches[0] : matches
    if (!target) throw new Error('No user found with that email.')
    if (target.id === user.id) throw new Error('You cannot friend yourself.')

    // Ensure the current user has a profiles row (FK on friendships.requester_id).
    const { error: selfErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      points: user.points,
      avatar_skin: user.avatar_skin,
      avatar_equipped: user.avatar_equipped,
      owned_accessories: user.owned_accessories,
    })
    if (selfErr) {
      throw new Error(
        selfErr.message ||
          'Your profile is missing in the database. Run migration 005_backfill_profiles.sql, then try again.',
      )
    }

    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: target.id,
      status: 'pending',
    })
    if (error) {
      if (error.code === '23505') throw new Error('You already sent a request to this user.')
      if (error.code === '23503') {
        throw new Error(
          'One of the accounts is missing a profile. Run migration 005_backfill_profiles.sql, then try again.',
        )
      }
      throw new Error(error.message || 'Could not send request.')
    }
    await refreshSupabase()
  }

  const sendAiMessage: DataContextValue['sendAiMessage'] = async (content) => {
    if (!user) return
    const userMsg: AiMessage = {
      id: uid(),
      user_id: user.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    const reply = generateCoachReply(content, {
      name: user.full_name,
      transactions,
      budgets,
      bills,
      subscriptions,
      goals,
    })
    const assistantMsg: AiMessage = {
      id: uid(),
      user_id: user.id,
      role: 'assistant',
      content: reply,
      created_at: new Date().toISOString(),
    }

    if (mode === 'local') {
      const store = loadStore()
      store.aiMessages.push(userMsg, assistantMsg)
      saveStore(store)
      refreshLocal()
      return
    }
    if (!supabase) return
    await supabase.from('ai_messages').insert([
      { user_id: user.id, role: 'user', content },
      { user_id: user.id, role: 'assistant', content: reply },
    ])
    await refreshSupabase()
  }

  const chartData = useMemo(() => buildChart(transactions), [transactions])
  const categoryData = useMemo(() => buildCategories(transactions), [transactions])

  const value: DataContextValue = {
    loading,
    transactions,
    budgets,
    bills,
    subscriptions,
    goals,
    contributions,
    friendships,
    friends,
    challenges,
    aiMessages,
    chartData,
    categoryData,
    lastPointsEarned,
    refresh,
    addTransaction,
    updateBudget,
    updateBillStatus,
    addBill,
    toggleSubscription,
    addSubscription,
    createGoal,
    contributeToGoal,
    inviteFriendToGoal,
    acceptFriendship,
    declineFriendship,
    sendFriendRequest,
    sendAiMessage,
    purchaseAccessory,
    equipAccessory,
    setAvatarSkin,
    clearPointsToast,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
