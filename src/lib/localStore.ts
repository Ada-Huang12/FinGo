import { addDays, format, subMonths } from 'date-fns'
import { EMPTY_EQUIPPED, normalizeEquipped } from './avatarCatalog'
import { currentMonth, uid } from './format'
import type { QuestClaim } from './quests'
import {
  defaultAvatarProfileFields,
  EMPTY_COACH_PREFS,
  normalizeCoachPrefs,
  type AiMessage,
  type Bill,
  type Budget,
  type Challenge,
  type Friendship,
  type Goal,
  type GoalContribution,
  type GoalMember,
  type Profile,
  type Subscription,
  type Transaction,
} from './types'

const STORAGE_KEY = 'fingo.local.v1'

function normalizeProfile(raw: Partial<Profile> & Pick<Profile, 'id' | 'email' | 'full_name'>): Profile {
  const defaults = defaultAvatarProfileFields()
  return {
    id: raw.id,
    email: raw.email,
    full_name: raw.full_name,
    avatar_url: raw.avatar_url ?? null,
    points: Number(raw.points ?? defaults.points),
    xp: Number(raw.xp ?? defaults.xp),
    avatar_skin: raw.avatar_skin ?? defaults.avatar_skin,
    avatar_equipped: normalizeEquipped(raw.avatar_equipped ?? defaults.avatar_equipped),
    owned_accessories: Array.isArray(raw.owned_accessories) ? raw.owned_accessories : defaults.owned_accessories,
    coach_prefs: normalizeCoachPrefs(raw.coach_prefs ?? EMPTY_COACH_PREFS),
    // Existing local profiles skip the survey; new signups set this to false explicitly.
    onboarding_completed: raw.onboarding_completed ?? true,
    created_at: raw.created_at ?? new Date().toISOString(),
  }
}

export interface LocalStore {
  profiles: Profile[]
  sessions: { userId: string; email: string; password: string }[]
  currentUserId: string | null
  transactions: Transaction[]
  budgets: Budget[]
  bills: Bill[]
  subscriptions: Subscription[]
  goals: Goal[]
  goalMembers: GoalMember[]
  contributions: GoalContribution[]
  friendships: Friendship[]
  challenges: Challenge[]
  challengeParticipants: { challenge_id: string; user_id: string; progress: number }[]
  aiMessages: AiMessage[]
  questClaims: (QuestClaim & { id: string; user_id: string })[]
}

function today() {
  return format(new Date(), 'yyyy-MM-dd')
}

function monthKey(offset = 0) {
  const d = subMonths(new Date(), -offset)
  return format(d, 'yyyy-MM')
}

export function createBlankAccount(
  userId: string,
  email: string,
  fullName: string,
): { profile: Profile; aiMessages: AiMessage[] } {
  const defaults = defaultAvatarProfileFields()
  const profile = normalizeProfile({
    id: userId,
    email,
    full_name: fullName,
    avatar_url: null,
    ...defaults,
    coach_prefs: EMPTY_COACH_PREFS,
    onboarding_completed: false,
    created_at: new Date().toISOString(),
  })

  return {
    profile,
    aiMessages: [
      {
        id: uid(),
        user_id: userId,
        role: 'assistant',
        content: `Hey ${fullName.split(' ')[0] || 'there'}! I'm your FinGo AI Coach. Your account starts fresh — add transactions, budgets, bills, or goals anytime, or tell me about your job and income so I can personalize tips.`,
        created_at: new Date().toISOString(),
      },
    ],
  }
}

export function createDemoData(userId: string, email: string, fullName: string): Partial<LocalStore> {
  const month = currentMonth()
  const friendId = uid()
  const friend2Id = uid()
  const goal1 = uid()
  const goal2 = uid()
  const challengeId = uid()

  const profile: Profile = normalizeProfile({
    id: userId,
    email,
    full_name: fullName,
    avatar_url: null,
    points: 0,
    avatar_skin: 'peach',
    avatar_equipped: { ...EMPTY_EQUIPPED },
    owned_accessories: [],
    created_at: new Date().toISOString(),
  })

  const friend: Profile = normalizeProfile({
    id: friendId,
    email: 'jordan@example.com',
    full_name: 'Jordan Lee',
    avatar_url: null,
    points: 80,
    avatar_skin: 'honey',
    avatar_equipped: { ...EMPTY_EQUIPPED, hat: 'hat-beanie' },
    owned_accessories: ['hat-beanie'],
    created_at: new Date().toISOString(),
  })

  const friend2: Profile = normalizeProfile({
    id: friend2Id,
    email: 'sam@example.com',
    full_name: 'Sam Rivera',
    avatar_url: null,
    points: 40,
    avatar_skin: 'rose',
    created_at: new Date().toISOString(),
  })

  const transactions: Transaction[] = [
    { id: uid(), user_id: userId, type: 'income', amount: 4200, category: 'Salary', description: 'Monthly paycheck', date: `${month}-01`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'income', amount: 350, category: 'Freelance', description: 'Logo design gig', date: `${month}-08`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 86.4, category: 'Food', description: 'Groceries', date: `${month}-03`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 42, category: 'Transport', description: 'Transit pass', date: `${month}-05`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 128, category: 'Shopping', description: 'New headphones', date: `${month}-07`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 35, category: 'Entertainment', description: 'Movie night', date: `${month}-10`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 95, category: 'Utilities', description: 'Electric bill', date: `${month}-12`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 60, category: 'Health', description: 'Pharmacy', date: `${month}-14`, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, type: 'expense', amount: 1450, category: 'Housing', description: 'Rent', date: `${month}-01`, created_at: new Date().toISOString() },
  ]

  // Historical chart data via older transactions
  for (let i = 1; i <= 5; i++) {
    const m = monthKey(-i)
    transactions.push(
      { id: uid(), user_id: userId, type: 'income', amount: 4000 + i * 50, category: 'Salary', description: 'Paycheck', date: `${m}-01`, created_at: new Date().toISOString() },
      { id: uid(), user_id: userId, type: 'expense', amount: 2200 + i * 80, category: 'Housing', description: 'Living costs', date: `${m}-05`, created_at: new Date().toISOString() },
      { id: uid(), user_id: userId, type: 'expense', amount: 400 + i * 20, category: 'Food', description: 'Food', date: `${m}-12`, created_at: new Date().toISOString() },
      { id: uid(), user_id: userId, type: 'expense', amount: 250 + i * 15, category: 'Transport', description: 'Commute', date: `${m}-18`, created_at: new Date().toISOString() },
    )
  }

  const budgets: Budget[] = [
    { id: uid(), user_id: userId, category: 'Food', limit_amount: 450, spent_amount: 86.4, month, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, category: 'Transport', limit_amount: 180, spent_amount: 42, month, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, category: 'Entertainment', limit_amount: 150, spent_amount: 35, month, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, category: 'Shopping', limit_amount: 200, spent_amount: 128, month, created_at: new Date().toISOString() },
    { id: uid(), user_id: userId, category: 'Utilities', limit_amount: 220, spent_amount: 95, month, created_at: new Date().toISOString() },
  ]

  const bills: Bill[] = []
  const subscriptions: Subscription[] = []

  const goals: Goal[] = [
    { id: goal1, owner_id: userId, title: 'Emergency Fund', target_amount: 5000, current_amount: 2450, deadline: format(addDays(new Date(), 120), 'yyyy-MM-dd'), is_collaborative: false, icon: 'shield', color: '#22C55E', points_awarded: false, created_at: new Date().toISOString() },
    { id: goal2, owner_id: userId, title: 'Japan Trip', target_amount: 3200, current_amount: 1180, deadline: format(addDays(new Date(), 200), 'yyyy-MM-dd'), is_collaborative: true, icon: 'flight', color: '#3B82F6', points_awarded: false, created_at: new Date().toISOString() },
    { id: uid(), owner_id: userId, title: 'New Laptop', target_amount: 1600, current_amount: 640, deadline: format(addDays(new Date(), 90), 'yyyy-MM-dd'), is_collaborative: false, icon: 'laptop_mac', color: '#8B5CF6', points_awarded: false, created_at: new Date().toISOString() },
    { id: uid(), owner_id: userId, title: 'Coffee Challenge', target_amount: 50, current_amount: 35, deadline: format(addDays(new Date(), 14), 'yyyy-MM-dd'), is_collaborative: false, icon: 'local_cafe', color: '#F59E0B', points_awarded: false, created_at: new Date().toISOString() },
  ]

  const goalMembers: GoalMember[] = [
    { id: uid(), goal_id: goal2, user_id: userId, role: 'owner', joined_at: new Date().toISOString() },
    { id: uid(), goal_id: goal2, user_id: friendId, role: 'member', joined_at: new Date().toISOString() },
  ]

  const contributions: GoalContribution[] = [
    { id: uid(), goal_id: goal1, user_id: userId, amount: 500, note: 'Payday boost', created_at: format(addDays(new Date(), -12), "yyyy-MM-dd'T'HH:mm:ss") },
    { id: uid(), goal_id: goal2, user_id: userId, amount: 200, note: 'Weekend save', created_at: format(addDays(new Date(), -5), "yyyy-MM-dd'T'HH:mm:ss") },
    { id: uid(), goal_id: goal2, user_id: friendId, amount: 150, note: 'Hotel fund', created_at: format(addDays(new Date(), -2), "yyyy-MM-dd'T'HH:mm:ss") },
    { id: uid(), goal_id: goal2, user_id: userId, amount: 80, note: 'Coffee cuts', created_at: format(addDays(new Date(), -1), "yyyy-MM-dd'T'HH:mm:ss") },
  ]

  const friendships: Friendship[] = [
    { id: uid(), requester_id: userId, addressee_id: friendId, status: 'accepted', created_at: new Date().toISOString() },
    { id: uid(), requester_id: friend2Id, addressee_id: userId, status: 'pending', created_at: new Date().toISOString() },
  ]

  const challenges: Challenge[] = [
    { id: challengeId, creator_id: friendId, title: 'No-Spend Weekend', description: 'Skip discretionary purchases this weekend and log your wins.', goal_amount: 100, ends_at: format(addDays(new Date(), 3), 'yyyy-MM-dd'), created_at: new Date().toISOString() },
    { id: uid(), creator_id: userId, title: 'Save $200 this month', description: 'Move $200 into any savings goal before month end.', goal_amount: 200, ends_at: format(addDays(new Date(), 18), 'yyyy-MM-dd'), created_at: new Date().toISOString() },
  ]

  return {
    profiles: [profile, friend, friend2],
    transactions,
    budgets,
    bills,
    subscriptions,
    goals,
    goalMembers,
    contributions,
    friendships,
    challenges,
    challengeParticipants: [
      { challenge_id: challengeId, user_id: userId, progress: 40 },
      { challenge_id: challengeId, user_id: friendId, progress: 70 },
    ],
    aiMessages: [
      {
        id: uid(),
        user_id: userId,
        role: 'assistant',
        content: `Hey ${fullName.split(' ')[0]}! I'm your FinGo AI Coach. Ask me about budgets, bills, savings goals, or spending habits anytime.`,
        created_at: new Date().toISOString(),
      },
    ],
    questClaims: [],
  }
}

function emptyStore(): LocalStore {
  return {
    profiles: [],
    sessions: [],
    currentUserId: null,
    transactions: [],
    budgets: [],
    bills: [],
    subscriptions: [],
    goals: [],
    goalMembers: [],
    contributions: [],
    friendships: [],
    challenges: [],
    challengeParticipants: [],
    aiMessages: [],
    questClaims: [],
  }
}

export function loadStore(): LocalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = { ...emptyStore(), ...JSON.parse(raw) } as LocalStore
    parsed.profiles = (parsed.profiles ?? []).map((p) => {
      const normalized = normalizeProfile(p)
      return normalized
    })
    parsed.goals = (parsed.goals ?? []).map((g) => ({
      ...g,
      points_awarded: Boolean(g.points_awarded),
    }))
    parsed.questClaims = parsed.questClaims ?? []
    return parsed
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: LocalStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function localSignUp(fullName: string, email: string, password: string) {
  const store = loadStore()
  if (store.sessions.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.')
  }
  const userId = uid()
  const blank = createBlankAccount(userId, email, fullName)
  store.profiles.push(blank.profile)
  store.sessions.push({ userId, email, password })
  store.currentUserId = userId
  store.aiMessages.push(...blank.aiMessages)
  saveStore(store)
  return blank.profile
}

export function localSignIn(email: string, password: string) {
  const store = loadStore()
  const session = store.sessions.find(
    (s) => s.email.toLowerCase() === email.toLowerCase() && s.password === password,
  )
  if (!session) throw new Error('Invalid email or password.')
  store.currentUserId = session.userId
  saveStore(store)
  return store.profiles.find((p) => p.id === session.userId)!
}

export function localSignOut() {
  const store = loadStore()
  store.currentUserId = null
  saveStore(store)
}

export function localCurrentProfile(): Profile | null {
  const store = loadStore()
  if (!store.currentUserId) return null
  const profile = store.profiles.find((p) => p.id === store.currentUserId)
  return profile ? normalizeProfile(profile) : null
}

export function localUpdateCoachPrefs(
  prefs: Partial<import('./types').CoachPrefs>,
  options?: { complete?: boolean },
): Profile {
  const store = loadStore()
  if (!store.currentUserId) throw new Error('Not signed in.')
  const profile = store.profiles.find((p) => p.id === store.currentUserId)
  if (!profile) throw new Error('Profile not found.')
  profile.coach_prefs = normalizeCoachPrefs({ ...profile.coach_prefs, ...prefs })
  if (options?.complete) profile.onboarding_completed = true
  saveStore(store)
  return normalizeProfile(profile)
}

export function localCompleteOnboarding(): Profile {
  const store = loadStore()
  if (!store.currentUserId) throw new Error('Not signed in.')
  const profile = store.profiles.find((p) => p.id === store.currentUserId)
  if (!profile) throw new Error('Profile not found.')
  profile.onboarding_completed = true
  saveStore(store)
  return normalizeProfile(profile)
}

export { today }
