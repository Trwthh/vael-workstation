import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app'
import { VaelMark, VaelText } from '@/components/ui/VaelLogo'
import { Camera, Check, ChevronRight, Monitor, Rocket, Sparkles, User } from 'lucide-react'

type Step = 'welcome' | 'profile' | 'preferences' | 'done'
const STEPS: Step[] = ['welcome', 'profile', 'preferences', 'done']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
}

export default function SetupWizard() {
  const { updateProfile, completeSetup, profile } = useAppStore()
  const [step, setStep] = useState<Step>('welcome')
  const [dir, setDir] = useState(1)
  const [name, setName] = useState(profile.name === 'User' ? '' : profile.name)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(profile.avatar)
  const [addDesktop, setAddDesktop] = useState(true)
  const [launchOnStartup, setLaunchOnStartup] = useState(false)
  const [startupAnim, setStartupAnim] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  const stepIdx = STEPS.indexOf(step)

  function goNext() {
    const next = STEPS[stepIdx + 1]
    if (!next) return
    if (step === 'profile') {
      updateProfile({ name: name.trim() || 'User', avatar: avatarSrc })
    }
    setDir(1)
    setStep(next)
  }

  function goBack() {
    const prev = STEPS[stepIdx - 1]
    if (!prev) return
    setDir(-1)
    setStep(prev)
  }

  function handleFinish() {
    completeSetup()
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const inputCls = 'h-11 bg-bg-0 border border-white/[0.08] rounded-xl px-4 text-sm text-fg-0 placeholder:text-fg-3 focus:outline-none focus:border-white/[0.2] transition-colors w-full'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-0 overflow-hidden">
      <div className="ambient-bg"><div className="ambient-accent" /></div>

      <div className="relative z-10 w-full max-w-[480px] px-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIdx ? 'bg-fg-0 w-6' : 'bg-white/[0.12] w-1.5'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 'welcome' && (
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-fg-0"
                >
                  <VaelMark size={48} />
                </motion.div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold text-fg-0">Welcome to <VaelText size={22} className="ml-1" /></h1>
                  <p className="text-fg-2 text-[14px] leading-relaxed max-w-[360px] mx-auto">
                    Your AI-powered workstation for research, development, and everything in between.
                  </p>
                </div>
                <button
                  onClick={goNext}
                  className="inline-flex items-center gap-2 h-11 px-8 rounded-xl bg-fg-0 text-bg-0 text-sm font-medium hover:bg-fg-1 transition-colors active:scale-[0.98]"
                >
                  Get Started
                  <ChevronRight size={16} />
                </button>
              </div>
            )}

            {step === 'profile' && (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-fg-0">What should we call you?</h2>
                  <p className="text-fg-3 text-[13px]">Set your display name and avatar</p>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center group overflow-hidden"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <User size={32} className="text-fg-3" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      <Camera size={20} className="text-fg-2" />
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                  </button>

                  <input
                    className={inputCls}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') goNext() }}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={goBack} className="flex-1 h-11 rounded-xl border border-white/[0.08] text-fg-2 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                    Back
                  </button>
                  <button onClick={goNext} className="flex-1 h-11 rounded-xl bg-fg-0 text-bg-0 text-sm font-medium hover:bg-fg-1 transition-colors active:scale-[0.98]">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'preferences' && (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-fg-0">Preferences</h2>
                  <p className="text-fg-3 text-[13px]">Customize your experience</p>
                </div>

                <div className="space-y-3">
                  <Checkbox icon={Monitor} label="Add to desktop" desc="Create a desktop shortcut" checked={addDesktop} onChange={setAddDesktop} />
                  <Checkbox icon={Rocket} label="Launch on startup" desc="Start VAEL when you log in" checked={launchOnStartup} onChange={setLaunchOnStartup} />
                  <Checkbox icon={Sparkles} label="Startup animation" desc="Show the VAEL intro on launch" checked={startupAnim} onChange={setStartupAnim} />
                </div>

                <div className="flex gap-3">
                  <button onClick={goBack} className="flex-1 h-11 rounded-xl border border-white/[0.08] text-fg-2 text-sm font-medium hover:bg-white/[0.04] transition-colors">
                    Back
                  </button>
                  <button onClick={goNext} className="flex-1 h-11 rounded-xl bg-fg-0 text-bg-0 text-sm font-medium hover:bg-fg-1 transition-colors active:scale-[0.98]">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center space-y-8">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20"
                >
                  <Check size={36} className="text-green-400" />
                </motion.div>
                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-fg-0">You're all set!</h2>
                  <p className="text-fg-2 text-[14px] leading-relaxed max-w-[320px] mx-auto">
                    Welcome aboard{name.trim() ? `, ${name.trim()}` : ''}. VAEL is ready to work.
                  </p>
                </div>
                <button
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 h-11 px-8 rounded-xl bg-fg-0 text-bg-0 text-sm font-medium hover:bg-fg-1 transition-colors active:scale-[0.98]"
                >
                  Launch VAEL
                  <Rocket size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Checkbox({ icon: Icon, label, desc, checked, onChange }: {
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all duration-150 text-left group"
    >
      <Icon size={18} className="shrink-0 text-fg-2" />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-fg-0">{label}</div>
        <div className="text-[11px] text-fg-3 mt-0.5">{desc}</div>
      </div>
      <div className={`shrink-0 w-5 h-5 rounded-md border transition-all duration-200 flex items-center justify-center ${
        checked ? 'bg-fg-0 border-fg-0' : 'border-white/[0.15] bg-transparent'
      }`}>
        {checked && <Check size={12} className="text-bg-0" />}
      </div>
    </button>
  )
}
