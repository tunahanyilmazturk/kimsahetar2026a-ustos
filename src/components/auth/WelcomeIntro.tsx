import { useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, EyeOff, Users, Sparkles, X } from 'lucide-react'
import { Button } from '../common/Button'

const SLIDES = [
  { icon: <Sparkles className="h-10 w-10" />, title: 'Sahtekar Kim?', text: 'Arkadaşlarınla kelimeyi bulmaya çalış. Ama aranızda kelimeyi bilmeyen biri var!', color: 'from-indigo-500/25 to-cyan-500/10' },
  { icon: <EyeOff className="h-10 w-10" />, title: 'Rolünü gizli tut', text: 'Rolünü yalnızca sen gör. Cihazı sıradaki oyuncuya ver ve şüpheleri üzerine çekme.', color: 'from-rose-500/25 to-purple-500/10' },
  { icon: <Users className="h-10 w-10" />, title: 'İpucunu ver, oyla!', text: 'Akıllı bir ipucu yaz, diğerlerini dinle ve sahtekarı doğru tahmin et.', color: 'from-emerald-500/25 to-cyan-500/10' },
]

export function WelcomeIntro({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]!
  const finish = () => { localStorage.setItem('sahtekar:intro-seen', '1'); onDone() }
  return <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-950 px-5 text-slate-100"><div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/15 blur-3xl" /><div className="relative w-full max-w-sm"><button type="button" onClick={finish} className="absolute right-0 top-0 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /> Atla</button><div className="pt-12 text-center"><motion.div key={index} initial={{ opacity: 0, scale: .85, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} className={`mx-auto flex h-36 w-36 items-center justify-center rounded-[2.25rem] border border-white/10 bg-linear-to-br ${slide.color} text-cyan-300 shadow-2xl shadow-indigo-950/50`}>{slide.icon}</motion.div><motion.div key={`text-${index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8"><p className="mb-2 text-xs font-semibold uppercase tracking-[.25em] text-indigo-300">Sahtekar Kim?</p><h1 className="text-3xl font-bold">{slide.title}</h1><p className="mt-4 text-sm leading-6 text-slate-400">{slide.text}</p></motion.div></div><div className="mt-10 flex justify-center gap-2">{SLIDES.map((_, i) => <span key={i} className={`h-2 rounded-full transition-all ${i === index ? 'w-7 bg-cyan-400' : 'w-2 bg-slate-700'}`} />)}</div><Button fullWidth size="lg" className="mt-8" onClick={() => index === SLIDES.length - 1 ? finish() : setIndex(index + 1)}>{index === SLIDES.length - 1 ? 'Oyuna Başla' : 'Devam Et'}<ArrowRight className="h-5 w-5" /></Button></div></main>
}
