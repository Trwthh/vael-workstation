import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/app'

type AnimationStyle = 'shatter' | 'pulse' | 'glitch'

const LOGO_TRIANGLE = 'M30 54 H226 L128 226 Z'
const LOGO_CENTER = 'M128 54 V152'
const LOGO_STROKE = 18

export default function StartupScreen({ onDone }: { onDone: () => void }) {
  const startupAnimation = useAppStore((s) => s.startupAnimation ?? 'shatter')
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timings = {
      shatter: [120, 900, 2000, 3200, 4000],
      pulse: [100, 800, 1800, 2600, 3100],
      glitch: [80, 600, 1600, 2800, 3300],
    }
    const t = timings[startupAnimation]
    const timers = [
      setTimeout(() => setPhase(1), t[0]),
      setTimeout(() => setPhase(2), t[1]),
      setTimeout(() => setPhase(3), t[2]),
      setTimeout(() => setPhase(4), t[3]),
      setTimeout(onDone, t[4]),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onDone, startupAnimation])

  if (startupAnimation === 'pulse') return <PulseAnimation phase={phase} />
  if (startupAnimation === 'glitch') return <GlitchAnimation phase={phase} />
  return <ForgeAnimation phase={phase} />
}

/* ─── Clean startup animation (default / shatter slot) ───────────────── */

function ForgeAnimation({ phase }: { phase: number }) {
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg-0 transition-opacity duration-700 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

      {/* Center content */}
      <div className="flex flex-col items-center relative">

        {/* Soft glow behind logo */}
        <div
          className={`absolute -inset-20 rounded-full transition-opacity duration-1000 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'radial-gradient(circle, rgba(224,224,227,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div className="relative" style={{ width: 72, height: 72 }}>
          <svg
            width={72} height={72} viewBox="0 0 256 256"
            fill="none" stroke="currentColor" strokeWidth={LOGO_STROKE}
            strokeLinejoin="round" strokeLinecap="round"
            className={`text-fg-0 transition-opacity duration-700 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
          >
            <path
              d={LOGO_TRIANGLE}
              strokeDasharray={600}
              strokeDashoffset={phase >= 1 ? 0 : 600}
              style={{ transition: phase >= 1 ? 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' : 'none' }}
            />
            <path
              d={LOGO_CENTER}
              strokeDasharray={100}
              strokeDashoffset={phase >= 1 ? 0 : 100}
              style={{ transition: phase >= 1 ? 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s' : 'none' }}
            />
          </svg>
        </div>

        {/* VAEL wordmark */}
        <div className={`mt-6 transition-all duration-700 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <span className="font-mono text-[20px] font-light text-fg-0 tracking-[0.28em]">VAEL</span>
        </div>

        {/* Subtitle */}
        <div className={`mt-2 transition-all duration-500 ${phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`} style={{ transitionDelay: '100ms' }}>
          <span className="text-[11px] text-fg-3 tracking-[0.12em]">WORKSTATION</span>
        </div>

        {/* Loading bar */}
        <div className={`mt-6 w-32 h-px bg-white/[0.06] rounded-full overflow-hidden transition-opacity duration-400 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="h-full bg-fg-2/40 rounded-full"
            style={{
              width: phase >= 3 ? '100%' : phase >= 2 ? '60%' : '0%',
              transition: phase >= 2 ? 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Version */}
      <div className={`absolute bottom-6 transition-opacity duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[10px] text-fg-4/20 font-mono tracking-[0.3em]">v0.1.0</span>
      </div>
    </div>
  )
}

/* ─── Pulse (unchanged) ───────────────────────────────────────────────── */

function PulseAnimation({ phase }: { phase: number }) {
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg-0 transition-opacity duration-500 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex flex-col items-center">
        <div className="relative">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`absolute inset-0 -m-16 rounded-full border border-white/[0.04] transition-all ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}
              style={{ animation: phase >= 2 ? `pulseRing 2s ease-out ${i * 0.4}s infinite` : 'none' }}
            />
          ))}
          <div
            className={`absolute inset-0 -m-8 rounded-full transition-all duration-1200 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
            style={{
              background: 'radial-gradient(circle, rgba(224,224,227,0.12) 0%, transparent 70%)',
              animation: phase >= 1 ? 'breathe 2.5s ease-in-out infinite' : 'none',
            }}
          />
          <svg
            width={96} height={96} viewBox="0 0 256 256"
            fill="none" stroke="currentColor" strokeWidth={LOGO_STROKE} strokeLinejoin="round" strokeLinecap="round"
            className={`relative text-fg-0 transition-all duration-800 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
          >
            <path d={LOGO_TRIANGLE} />
            <path d={LOGO_CENTER} />
          </svg>
        </div>
        <div className={`mt-6 transition-all duration-600 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <span className="font-mono text-[22px] font-light tracking-[0.24em] text-fg-0" style={{ transform: 'scaleX(1.08)', display: 'inline-block' }}>VAEL</span>
        </div>
        <div className={`mt-6 transition-opacity duration-400 delay-200 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="startup-loading-bar" />
        </div>
      </div>
      <div className={`absolute bottom-6 transition-opacity duration-300 delay-300 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[10px] text-fg-4/30 font-mono">v0.1.0</span>
      </div>
    </div>
  )
}

/* ─── Glitch (unchanged) ──────────────────────────────────────────────── */

function GlitchAnimation({ phase }: { phase: number }) {
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-bg-0 transition-opacity duration-500 ${phase >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${phase >= 1 && phase < 3 ? 'opacity-100' : 'opacity-0'}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-[1px] bg-white/[0.04]"
            style={{
              top: `${15 + i * 10}%`,
              left: 0, right: 0,
              animation: `glitchLine 0.3s ease ${i * 0.08}s ${phase >= 1 ? 'forwards' : 'none'}`,
            }}
          />
        ))}
      </div>
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            width={96} height={96} viewBox="0 0 256 256"
            fill="none" stroke="currentColor" strokeWidth={LOGO_STROKE} strokeLinejoin="round" strokeLinecap="round"
            className={`absolute inset-0 text-red-500/20 ${phase >= 1 && phase < 3 ? 'startup-glitch-r' : 'opacity-0'}`}
          >
            <path d={LOGO_TRIANGLE} />
            <path d={LOGO_CENTER} />
          </svg>
          <svg
            width={96} height={96} viewBox="0 0 256 256"
            fill="none" stroke="currentColor" strokeWidth={LOGO_STROKE} strokeLinejoin="round" strokeLinecap="round"
            className={`absolute inset-0 text-blue-500/20 ${phase >= 1 && phase < 3 ? 'startup-glitch-b' : 'opacity-0'}`}
          >
            <path d={LOGO_TRIANGLE} />
            <path d={LOGO_CENTER} />
          </svg>
          <svg
            width={96} height={96} viewBox="0 0 256 256"
            fill="none" stroke="currentColor" strokeWidth={LOGO_STROKE} strokeLinejoin="round" strokeLinecap="round"
            className={`relative text-fg-0 transition-all duration-300 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
          >
            <path d={LOGO_TRIANGLE} />
            <path d={LOGO_CENTER} />
          </svg>
          <div
            className={`absolute inset-0 -m-6 rounded-full transition-all duration-600 ${phase >= 3 ? 'opacity-60' : 'opacity-0'}`}
            style={{ background: 'radial-gradient(circle, rgba(224,224,227,0.2) 0%, transparent 60%)', filter: 'blur(12px)' }}
          />
        </div>
        <div className={`mt-6 transition-all duration-400 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <span
            className={`font-mono text-[22px] font-light tracking-[0.24em] text-fg-0 ${phase >= 2 && phase < 3 ? 'startup-text-glitch' : ''}`}
            style={{ transform: 'scaleX(1.08)', display: 'inline-block' }}
          >VAEL</span>
        </div>
        <div className={`mt-6 transition-opacity duration-400 delay-200 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="startup-loading-bar" />
        </div>
      </div>
      <div className={`absolute bottom-6 transition-opacity duration-300 delay-300 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-[10px] text-fg-4/30 font-mono">v0.1.0</span>
      </div>
    </div>
  )
}
