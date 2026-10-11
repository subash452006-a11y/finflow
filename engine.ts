// Pure finance engine: every number in the UI is derived from one state object.
export type Tx = { day: number; label: string; amt: number; cat: string }
export type Bill = { id: string; name: string; amt: number; due: number; paid: boolean }
export type Sub = Bill & { active: boolean }
export type Goal = { id: string; name: string; emoji: string; plan: number; saved: number }
export type S = { day: number; cash: number; tx: Tx[]; bills: Bill[]; subs: Sub[]; goals: Goal[]; hist: number[]; event: number | null }
export type Act =
  | { t: 'spend'; amt: number; label: string; cat: string; fund?: boolean }
  | { t: 'sub'; id: string }
  | { t: 'save'; id: string; amt: number }

export const START = 10000, DAYS = 30
export const init = (): S => ({
  day: 1, cash: START, tx: [], hist: [START], event: null,
  bills: [
    { id: 'mess', name: 'Mess / Food plan', amt: 2200, due: 3, paid: false },
    { id: 'bus', name: 'Transport pass', amt: 600, due: 5, paid: false },
    { id: 'rch', name: 'Phone recharge', amt: 299, due: 10, paid: false },
  ],
  subs: [
    { id: 'cloud', name: 'Cloud storage', amt: 75, due: 6, paid: false, active: true },
    { id: 'spot', name: 'Spotify', amt: 119, due: 12, paid: false, active: true },
    { id: 'nflx', name: 'Netflix', amt: 199, due: 18, paid: false, active: true },
    { id: 'prime', name: 'Prime', amt: 149, due: 20, paid: false, active: false },
    { id: 'gym', name: 'Gym', amt: 499, due: 25, paid: false, active: true },
  ],
  goals: [
    { id: 'emg', name: 'Emergency fund', emoji: '🛟', plan: 1000, saved: 0 },
    { id: 'buds', name: 'New earbuds', emoji: '🎧', plan: 800, saved: 0 },
  ],
})

export const EVENTS: Record<number, { title: string; emoji: string; text: string; opts: { label: string; hint: string; amt: number; fund?: boolean }[] }> = {
  8: { title: 'Phone screen cracked', emoji: '📱', text: 'Oops. The repair shop quoted ₹1,200.', opts: [
    { label: 'Full repair', hint: '₹1,200 from balance', amt: 1200 },
    { label: 'Cheap local fix', hint: '₹600, might not last', amt: 600 },
    { label: 'Use Emergency Fund', hint: '₹1,200 from savings first', amt: 1200, fund: true }] },
  15: { title: "Best friend's birthday", emoji: '🎂', text: 'Everyone is chipping in for a party.', opts: [
    { label: 'Join the party', hint: '₹1,000', amt: 1000 },
    { label: 'Small gift', hint: '₹400', amt: 400 },
    { label: 'Skip it', hint: '₹0 (guilt +1 😅)', amt: 0 }] },
  22: { title: 'Sudden fever', emoji: '🤒', text: 'Doctor visit + medicines come to ₹900.', opts: [
    { label: 'Pay from balance', hint: '₹900', amt: 900 },
    { label: 'Use Emergency Fund', hint: '₹900 from savings first', amt: 900, fund: true }] },
}

export function apply(s: S, a: Act): S {
  const n = structuredClone(s)
  if (a.t === 'spend') {
    let amt = a.amt
    if (a.fund) { const g = n.goals.find(g => g.id === 'emg')!; const take = Math.min(g.saved, amt); g.saved -= take; amt -= take }
    n.cash -= amt
    if (a.amt > 0) n.tx.unshift({ day: n.day, label: a.label, amt: a.amt, cat: a.cat })
  } else if (a.t === 'sub') {
    const x = n.subs.find(x => x.id === a.id)!
    x.active = !x.active
    if (x.active && x.due <= n.day) x.paid = true // no charge for a month already passed
  } else {
    const g = n.goals.find(g => g.id === a.id)!
    const amt = Math.min(a.amt, Math.max(0, n.cash))
    g.saved += amt; n.cash -= amt
    if (amt > 0) n.tx.unshift({ day: n.day, label: `Saved → ${g.name}`, amt, cat: 'save' })
  }
  return n
}

export function advance(s: S): S {
  const n = structuredClone(s)
  n.day += 1
  for (const b of [...n.bills, ...n.subs.filter(x => x.active)]) {
    if (!b.paid && b.due <= n.day) { b.paid = true; n.cash -= b.amt; n.tx.unshift({ day: n.day, label: b.name, amt: b.amt, cat: 'fixed' }) }
  }
  if (n.cash < 0) { n.cash -= 50; n.tx.unshift({ day: n.day, label: 'Overdraft fee', amt: 50, cat: 'fee' }) }
  n.hist.push(n.cash)
  n.event = EVENTS[n.day] ? n.day : null
  return n
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
export function metrics(s: S) {
  const unpaid = s.bills.filter(b => !b.paid).reduce((a, b) => a + b.amt, 0) + s.subs.filter(x => x.active && !x.paid).reduce((a, b) => a + b.amt, 0)
  const goalRes = s.goals.reduce((a, g) => a + Math.max(0, g.plan - g.saved), 0)
  const left = Math.max(1, DAYS - s.day + 1)
  const safe = s.cash - unpaid - goalRes
  const allowance = Math.max(0, safe) / left
  const small = s.tx.filter(t => t.cat === 'spend' && t.amt <= 500).reduce((a, t) => a + t.amt, 0)
  const pace = Math.max(90, small / s.day) // typical everyday spend per day
  const forecast = s.cash - unpaid - goalRes - pace * left
  const risk = s.cash < 0 || forecast < 0 ? 2 : forecast < 800 ? 1 : 0
  const subTot = s.subs.filter(x => x.active).reduce((a, b) => a + b.amt, 0)
  const planTot = s.goals.reduce((a, g) => a + g.plan, 0)
  const saved = s.goals.reduce((a, g) => a + g.saved, 0)
  let health = clamp(forecast / 2000) * 40 + clamp(saved / planTot) * 25 + 20 * clamp(allowance / pace) + 15 * (1 - clamp(subTot / 1500))
  if (s.cash < 0) health -= 30
  return { unpaid, goalRes, left, safe, allowance, pace, forecast, risk, subTot, health: Math.round(clamp(health, 0, 100) * 1) }
}
