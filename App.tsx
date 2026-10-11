import { useEffect, useMemo, useState, ReactNode } from 'react'
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion'
import { Wallet, TrendingUp, ShieldAlert, HeartPulse, CalendarDays, Target, Repeat, Zap, FlaskConical, RotateCcw, ArrowRight } from 'lucide-react'
import { S, Act, init, apply, advance, metrics, DAYS, EVENTS, START } from './engine'

const fmt = (x: number) => (x < 0 ? '-' : '') + '₹' + Math.abs(Math.round(x)).toLocaleString('en-IN')
const RISK = [{ t: 'Low', c: 'text-emerald-400', b: 'bg-emerald-400' }, { t: 'Medium', c: 'text-amber-400', b: 'bg-amber-400' }, { t: 'High', c: 'text-rose-400', b: 'bg-rose-400' }]

function Num({ v }: { v: number }) {
  const mv = useMotionValue(v)
  const t = useTransform(mv, fmt)
  useEffect(() => { const c = animate(mv, v, { duration: 0.6 }); return () => c.stop() }, [v])
  return <motion.span>{t}</motion.span>
}
const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur ${className}`}>{children}</motion.div>
)
function Ring({ v }: { v: number }) {
  const r = 38, c = 2 * Math.PI * r, col = v >= 70 ? '#34d399' : v >= 40 ? '#fbbf24' : '#fb7185'
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
      <circle cx="50" cy="50" r={r} stroke="#ffffff18" strokeWidth="9" fill="none" />
      <motion.circle cx="50" cy="50" r={r} stroke={col} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c} animate={{ strokeDashoffset: c * (1 - v / 100) }} transition={{ duration: 0.8 }} />
    </svg>
  )
}
function Chart({ s, m }: { s: S; m: ReturnType<typeof metrics> }) {
  const W = 300, H = 90, max = START
  const x = (d: number) => (d / DAYS) * W, y = (v: number) => H - (Math.max(0, Math.min(max, v)) / max) * H
  const pts = s.hist.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const last = s.hist.length - 1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline points={pts} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" />
      <line x1={x(last)} y1={y(s.cash)} x2={W} y2={y(m.forecast)} stroke={m.forecast < 0 ? '#fb7185' : '#22d3ee'} strokeWidth="2" strokeDasharray="4 4" />
      <circle cx={x(last)} cy={y(s.cash)} r="4" fill="#fff" />
    </svg>
  )
}

export default function App() {
  const [s, setS] = useState<S>(init)
  const [mode, setMode] = useState<'spend' | 'sub' | 'save'>('spend')
  const [amt, setAmt] = useState(350)
  const [label, setLabel] = useState('Food delivery')
  const [subId, setSubId] = useState('prime')
  const [goalId, setGoalId] = useState('buds')
  const m = useMemo(() => metrics(s), [s])
  const done = s.day > DAYS

  const act: Act = mode === 'spend' ? { t: 'spend', amt, label, cat: 'spend' } : mode === 'sub' ? { t: 'sub', id: subId } : { t: 'save', id: goalId, amt }
  const sim = useMemo(() => apply(s, act), [s, mode, amt, label, subId, goalId])
  const sm = useMemo(() => metrics(sim), [sim])
  const goalSaved = (x: S) => x.goals.find(g => g.id === goalId)!

  const rows: [string, string, string, number][] = [
    ['Balance', fmt(s.cash), fmt(sim.cash), sim.cash - s.cash],
    ['Daily allowance', fmt(m.allowance), fmt(sm.allowance), sm.allowance - m.allowance],
    ['Month-end forecast', fmt(m.forecast), fmt(sm.forecast), sm.forecast - m.forecast],
    ['Risk', RISK[m.risk].t, RISK[sm.risk].t, m.risk - sm.risk],
    ['Health score', `${m.health}`, `${sm.health}`, sm.health - m.health],
    ...(mode === 'save' ? [['Goal progress', `${fmt(goalSaved(s).saved)} / ${fmt(goalSaved(s).plan)}`, `${fmt(goalSaved(sim).saved)} / ${fmt(goalSaved(sim).plan)}`, goalSaved(sim).saved - goalSaved(s).saved] as [string, string, string, number]] : []),
  ]
  const verdict = sm.risk > m.risk ? ['This pushes you into more risk. Think twice. 🚨', 'text-rose-300'] : sm.risk === 2 ? ["You're already in the red zone; fix this first.", 'text-rose-300'] : sm.health < m.health - 5 ? ['Affordable, but it dents your health score.', 'text-amber-300'] : ['Looks safe. Go ahead. ✅', 'text-emerald-300']

  const commit = () => { setS(apply(s, act)) }
  const choose = (o: { label: string; amt: number; fund?: boolean }) => setS(x => ({ ...apply(x, { t: 'spend', amt: o.amt, label: EVENTS[x.day].title + ': ' + o.label, cat: 'event', fund: o.fund }), event: null }))
  const ev = s.event ? EVENTS[s.event] : null
  const tip = m.risk === 2 ? 'Cancel a subscription or skip the next treat to get back on track.' : m.allowance < 100 ? 'Allowance is tight. Pick free plans this week.' : 'You are on track. Try putting spare cash into a goal.'

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold tracking-tight">Fin<span className="text-violet-400">Flow</span></h1><p className="text-sm text-slate-400">₹10,000 · 30 days · every decision has a consequence</p></div>
        <div className="flex items-center gap-3">
          <div className="min-w-40"><div className="mb-1 flex justify-between text-xs text-slate-400"><span><CalendarDays className="mr-1 inline h-3 w-3" />Day {Math.min(s.day, DAYS)}/{DAYS}</span><span>{m.left}d left</span></div>
            <div className="h-2 rounded-full bg-white/10"><motion.div className="h-2 rounded-full bg-violet-400" animate={{ width: `${(Math.min(s.day, DAYS) / DAYS) * 100}%` }} /></div></div>
          <button disabled={done || !!s.event} onClick={() => setS(advance(s))} className="flex items-center gap-1 rounded-full bg-violet-500 px-4 py-2 text-sm font-semibold transition hover:bg-violet-400 disabled:opacity-40">{s.day === DAYS ? 'Finish month' : 'Next day'} <ArrowRight className="h-4 w-4" /></button>
          <button onClick={() => setS(init())} title="Restart" className="rounded-full border border-white/10 p-2 hover:bg-white/10"><RotateCcw className="h-4 w-4" /></button>
        </div>
      </header>

      {done && <Card className="text-center"><div className="text-5xl">🏁</div><h2 className="mt-2 text-2xl font-bold">Month complete!</h2><p className="text-slate-300">Final balance {fmt(s.cash)} · Savings {fmt(s.goals.reduce((a, g) => a + g.saved, 0))} · Health {m.health}/100</p></Card>}

      <section className="grid gap-4 md:grid-cols-4">
        <Card><Wallet className="mb-2 h-5 w-5 text-violet-300" /><p className="text-xs text-slate-400">Balance</p><p className="text-3xl font-extrabold"><Num v={s.cash} /></p><p className="mt-1 text-xs text-slate-400">Committed: {fmt(m.unpaid)} bills + {fmt(m.goalRes)} goals</p></Card>
        <Card><Zap className="mb-2 h-5 w-5 text-cyan-300" /><p className="text-xs text-slate-400">Safe to spend / day</p><p className="text-3xl font-extrabold"><Num v={m.allowance} /></p><p className="mt-1 text-xs text-slate-400">{fmt(Math.max(0, m.safe))} free for {m.left} days</p></Card>
        <Card><ShieldAlert className={`mb-2 h-5 w-5 ${RISK[m.risk].c}`} /><p className="text-xs text-slate-400">Financial risk</p><p className={`text-3xl font-extrabold ${RISK[m.risk].c}`}>{RISK[m.risk].t}</p><div className="mt-2 flex gap-1">{[0, 1, 2].map(i => <div key={i} className={`h-1.5 flex-1 rounded ${i <= m.risk ? RISK[m.risk].b : 'bg-white/10'}`} />)}</div></Card>
        <Card className="flex items-center gap-3"><div className="relative"><Ring v={m.health} /><span className="absolute inset-0 grid place-items-center text-xl font-extrabold">{m.health}</span></div><div><HeartPulse className="mb-1 h-5 w-5 text-pink-300" /><p className="text-xs text-slate-400">Financial health</p><p className="text-sm font-semibold">{m.health >= 70 ? 'Thriving' : m.health >= 40 ? 'Okay' : 'Needs care'}</p></div></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="mb-3 flex items-center gap-2 font-semibold"><FlaskConical className="h-5 w-5 text-violet-300" />Decision Simulator <span className="text-xs font-normal text-slate-400">test before you commit</span></div>
          <div className="mb-4 flex gap-2">{(['spend', 'sub', 'save'] as const).map(k => <button key={k} onClick={() => setMode(k)} className={`rounded-full px-4 py-1.5 text-sm ${mode === k ? 'bg-violet-500' : 'bg-white/10 hover:bg-white/20'}`}>{k === 'spend' ? 'Spend' : k === 'sub' ? 'Subscription' : 'Save'}</button>)}</div>
          {mode === 'spend' && <div className="mb-4 flex flex-wrap gap-2">{[['Chai & snacks', 80], ['Food delivery', 350], ['Movie night', 600], ['Concert', 1500], ['Sneakers', 2500]].map(([l, a]) => <button key={l} onClick={() => { setLabel(l as string); setAmt(a as number) }} className={`rounded-full border px-3 py-1 text-xs ${label === l ? 'border-violet-400 bg-violet-500/20' : 'border-white/10 hover:bg-white/10'}`}>{l} · ₹{a}</button>)}</div>}
          {mode === 'sub' && <select value={subId} onChange={e => setSubId(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-2 text-sm">{s.subs.map(x => <option key={x.id} value={x.id}>{x.active ? 'Cancel' : 'Start'} {x.name} (₹{x.amt}/mo)</option>)}</select>}
          {mode === 'save' && <select value={goalId} onChange={e => setGoalId(e.target.value)} className="mb-4 w-full rounded-xl border border-white/10 bg-slate-900 p-2 text-sm">{s.goals.map(g => <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>)}</select>}
          {mode !== 'sub' && <div className="mb-4"><div className="mb-1 flex justify-between text-sm"><span>Amount</span><b>{fmt(amt)}</b></div><input type="range" min={0} max={3000} step={10} value={amt} onChange={e => setAmt(+e.target.value)} className="w-full accent-violet-400" /></div>}
          <div className="space-y-1.5 rounded-2xl bg-black/30 p-3 text-sm">
            <div className="grid grid-cols-4 text-xs text-slate-500"><span>Metric</span><span>Now</span><span>After</span><span className="text-right">Change</span></div>
            {rows.map(([n, a, b, d]) => <div key={n} className="grid grid-cols-4"><span className="text-slate-300">{n}</span><span>{a}</span><b>{b}</b><span className={`text-right ${d > 0 ? 'text-emerald-400' : d < 0 ? 'text-rose-400' : 'text-slate-500'}`}>{d === 0 ? '–' : (d > 0 ? '▲ ' : '▼ ') + (n === 'Risk' ? '' : Math.abs(Math.round(d)))}</span></div>)}
          </div>
          <p className={`mt-3 text-sm font-medium ${verdict[1]}`}>{verdict[0]}</p>
          <button disabled={done || !!s.event} onClick={commit} className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-40">Confirm this decision</button>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card><div className="mb-2 flex items-center gap-2 font-semibold"><TrendingUp className="h-5 w-5 text-cyan-300" />Forecast</div><Chart s={s} m={m} /><p className="mt-2 text-sm text-slate-300">Projected on day 30: <b className={m.forecast < 0 ? 'text-rose-400' : 'text-cyan-300'}>{fmt(m.forecast)}</b></p><p className="mt-1 text-xs text-slate-400">💡 {tip}</p></Card>
          <Card><div className="mb-2 flex items-center gap-2 font-semibold"><Target className="h-5 w-5 text-amber-300" />Goals</div>
            {s.goals.map(g => <div key={g.id} className="mb-3"><div className="mb-1 flex justify-between text-sm"><span>{g.emoji} {g.name}</span><span className="text-slate-400">{fmt(g.saved)} / {fmt(g.plan)}</span></div><div className="h-2 rounded-full bg-white/10"><motion.div className="h-2 rounded-full bg-amber-400" animate={{ width: `${Math.min(100, (g.saved / g.plan) * 100)}%` }} /></div>
              <div className="mt-1.5 flex gap-2">{[100, 500].map(a => <button key={a} disabled={done || !!s.event} onClick={() => setS(apply(s, { t: 'save', id: g.id, amt: a }))} className="rounded-full bg-white/10 px-3 py-0.5 text-xs hover:bg-white/20 disabled:opacity-40">+₹{a}</button>)}</div></div>)}</Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card><div className="mb-2 flex items-center gap-2 font-semibold"><Repeat className="h-5 w-5 text-pink-300" />Subscriptions & bills <span className="ml-auto text-xs font-normal text-slate-400">subs {fmt(m.subTot)}/mo</span></div>
          {s.bills.map(b => <div key={b.id} className="flex justify-between border-b border-white/5 py-1.5 text-sm"><span>{b.name} <span className="text-xs text-slate-500">day {b.due}</span></span><span className={b.paid ? 'text-slate-500 line-through' : ''}>{fmt(b.amt)}</span></div>)}
          {s.subs.map(x => <div key={x.id} className="flex items-center justify-between border-b border-white/5 py-1.5 text-sm"><span className={x.active ? '' : 'text-slate-500'}>{x.name} <span className="text-xs text-slate-500">day {x.due}</span></span>
            <span className="flex items-center gap-3">{fmt(x.amt)}<button disabled={done || !!s.event} onClick={() => setS(apply(s, { t: 'sub', id: x.id }))} className={`h-5 w-9 rounded-full p-0.5 transition ${x.active ? 'bg-violet-500' : 'bg-white/20'}`}><motion.span layout className={`block h-4 w-4 rounded-full bg-white ${x.active ? 'ml-auto' : ''}`} /></button></span></div>)}</Card>
        <Card><div className="mb-2 font-semibold">Activity</div><div className="max-h-56 space-y-1 overflow-auto text-sm"><AnimatePresence initial={false}>{s.tx.length === 0 && <p className="text-slate-500">No transactions yet. Try the simulator!</p>}{s.tx.slice(0, 30).map((t, i) => <motion.div key={s.tx.length - i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between"><span><span className="text-xs text-slate-500">D{t.day}</span> {t.label}</span><span className={t.cat === 'save' ? 'text-amber-300' : 'text-rose-300'}>{t.cat === 'save' ? '→' : '−'}{fmt(t.amt)}</span></motion.div>)}</AnimatePresence></div></Card>
      </section>

      <AnimatePresence>{ev && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-10 grid place-items-center bg-black/70 p-4">
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="text-5xl">{ev.emoji}</div><h3 className="mt-2 text-xl font-bold">Unexpected: {ev.title}</h3><p className="mb-4 text-slate-300">{ev.text}</p>
            <div className="space-y-2">{ev.opts.map(o => <button key={o.label} onClick={() => choose(o)} className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left hover:bg-violet-500/20"><b>{o.label}</b><span className="block text-xs text-slate-400">{o.hint}</span></button>)}</div>
          </motion.div></motion.div>)}</AnimatePresence>
    </div>
  )
}
