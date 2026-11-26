import { useState, useCallback } from 'react'
import PageShell from '@/components/ui/PageShell'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Shield, Search, Hash, FileText, Globe, Bug, ExternalLink, Loader2, AlertTriangle, CheckCircle, Copy } from 'lucide-react'

type Tab = 'lookup' | 'intel' | 'tools' | 'analysis'

const HASH_REGEX = /^[a-f0-9]{32}$|^[a-f0-9]{40}$|^[a-f0-9]{64}$/i

const THREAT_INTEL_SOURCES = [
  { name: 'VirusTotal', url: 'https://www.virustotal.com', desc: 'Multi-engine file/URL/hash analysis' },
  { name: 'MalwareBazaar', url: 'https://bazaar.abuse.ch', desc: 'Malware sample sharing platform' },
  { name: 'Hybrid Analysis', url: 'https://www.hybrid-analysis.com', desc: 'Free automated malware sandbox' },
  { name: 'ANY.RUN', url: 'https://any.run', desc: 'Interactive malware analysis sandbox' },
  { name: 'URLhaus', url: 'https://urlhaus.abuse.ch', desc: 'Malicious URL tracking' },
  { name: 'ThreatFox', url: 'https://threatfox.abuse.ch', desc: 'IOC sharing platform' },
  { name: 'OTX AlienVault', url: 'https://otx.alienvault.com', desc: 'Open threat intelligence' },
  { name: 'Malpedia', url: 'https://malpedia.caad.fkie.fraunhofer.de', desc: 'Malware encyclopedia' },
  { name: 'Tria.ge', url: 'https://tria.ge', desc: 'Automated malware sandbox' },
  { name: 'MalShare', url: 'https://malshare.com', desc: 'Free malware repository' },
]

const RE_TOOLS = [
  { name: 'Ghidra', desc: 'NSA reverse engineering framework', url: 'https://ghidra-sre.org' },
  { name: 'IDA Free', desc: 'Interactive disassembler', url: 'https://hex-rays.com/ida-free' },
  { name: 'x64dbg', desc: 'Open-source x64/x32 debugger', url: 'https://x64dbg.com' },
  { name: 'Binary Ninja', desc: 'Binary analysis platform', url: 'https://binary.ninja' },
  { name: 'Radare2 / Cutter', desc: 'Open-source RE framework + GUI', url: 'https://rada.re' },
  { name: 'PE-bear', desc: 'PE file analysis tool', url: 'https://github.com/hasherezade/pe-bear' },
  { name: 'FLARE VM', desc: 'Windows malware analysis distro', url: 'https://github.com/mandiant/flare-vm' },
  { name: 'REMnux', desc: 'Linux malware analysis toolkit', url: 'https://remnux.org' },
]

const YARA_SIGMA = [
  { name: 'YARA', desc: 'Pattern matching for malware identification', url: 'https://virustotal.github.io/yara' },
  { name: 'Sigma', desc: 'Generic signature format for SIEM', url: 'https://github.com/SigmaHQ/sigma' },
  { name: 'Snort / Suricata', desc: 'Network intrusion detection rules', url: 'https://www.snort.org' },
  { name: 'ClamAV', desc: 'Open-source antivirus signatures', url: 'https://www.clamav.net' },
]

export default function Cybersecurity() {
  const [tab, setTab] = useState<Tab>('lookup')
  const [hashInput, setHashInput] = useState('')
  const [lookupResult, setLookupResult] = useState<string | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  const lookupHash = useCallback(async () => {
    const val = hashInput.trim()
    if (!val) return
    setLookupLoading(true)
    setLookupResult(null)

    try {
      const isHash = HASH_REGEX.test(val)
      const query = isHash
        ? `${val} malware hash analysis VirusTotal`
        : `"${val}" threat intelligence IOC`
      await window.electronAPI?.searchAgent.run(query)
    } catch {
      setLookupResult('Lookup failed. Try searching directly on VirusTotal or MalwareBazaar.')
    } finally {
      setLookupLoading(false)
    }
  }, [hashInput])

  const openExternal = (url: string) => {
    window.open(url, '_blank')
  }

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: 'lookup', label: 'Hash / IOC Lookup', icon: Hash },
    { id: 'intel', label: 'Threat Intel', icon: Globe },
    { id: 'tools', label: 'RE Tools', icon: Bug },
    { id: 'analysis', label: 'Rules & Signatures', icon: FileText },
  ]

  return (
    <PageShell
      title="Security Research"
      subtitle="Threat intelligence, malware analysis, and security research tools"
    >
      <div className="flex flex-col gap-4">
        {/* Tab bar */}
        <div className="flex gap-1 p-0.5 bg-bg-1 rounded-md border border-white/[0.06] w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-white/[0.08] text-fg-0' : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Lookup tab */}
        {tab === 'lookup' && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-col gap-3">
                <p className="text-xs text-fg-3">Enter a file hash (MD5/SHA1/SHA256), IP address, domain, or URL to look up across threat intelligence sources.</p>
                <div className="flex gap-2">
                  <input
                    value={hashInput}
                    onChange={e => setHashInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupHash()}
                    placeholder="Hash, IP, domain, or URL..."
                    className="flex-1 h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-0 placeholder:text-fg-4 focus:border-white/[0.12] focus:outline-none"
                  />
                  <Button variant="primary" size="sm" icon={lookupLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} onClick={lookupHash} disabled={lookupLoading || !hashInput.trim()}>
                    Lookup
                  </Button>
                </div>
                {hashInput.trim() && HASH_REGEX.test(hashInput.trim()) && (
                  <div className="flex items-center gap-2 text-xs text-fg-3">
                    <CheckCircle size={12} className="text-emerald-500" />
                    Detected: {hashInput.trim().length === 32 ? 'MD5' : hashInput.trim().length === 40 ? 'SHA1' : 'SHA256'} hash
                  </div>
                )}
              </div>
            </Card>

            {/* Quick lookup links */}
            <div className="grid grid-cols-4 gap-3">
              {['VirusTotal', 'MalwareBazaar', 'Hybrid Analysis', 'ThreatFox'].map(name => {
                const source = THREAT_INTEL_SOURCES.find(s => s.name === name)!
                const val = hashInput.trim()
                let directUrl = source.url
                if (val && HASH_REGEX.test(val)) {
                  if (name === 'VirusTotal') directUrl = `https://www.virustotal.com/gui/search/${val}`
                  else if (name === 'MalwareBazaar') directUrl = `https://bazaar.abuse.ch/browse.php?search=sha256:${val}`
                  else if (name === 'Hybrid Analysis') directUrl = `https://www.hybrid-analysis.com/search?query=${val}`
                  else if (name === 'ThreatFox') directUrl = `https://threatfox.abuse.ch/browse.php?search=ioc:${val}`
                }
                return (
                  <button
                    key={name}
                    onClick={() => openExternal(directUrl)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-bg-1 border border-white/[0.06] rounded-md hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <ExternalLink size={12} className="text-fg-4 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-fg-1">{name}</p>
                      <p className="text-[10px] text-fg-4">{source.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {lookupResult && (
              <Card>
                <pre className="text-xs text-fg-2 whitespace-pre-wrap">{lookupResult}</pre>
              </Card>
            )}
          </div>
        )}

        {/* Threat Intel tab */}
        {tab === 'intel' && (
          <div className="grid grid-cols-2 gap-3">
            {THREAT_INTEL_SOURCES.map(source => (
              <button
                key={source.name}
                onClick={() => openExternal(source.url)}
                className="flex items-center gap-3 px-4 py-3 bg-bg-1 border border-white/[0.06] rounded-md hover:bg-white/[0.04] transition-colors text-left"
              >
                <Globe size={16} className="text-fg-3 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg-0">{source.name}</p>
                  <p className="text-xs text-fg-4 truncate">{source.desc}</p>
                </div>
                <ExternalLink size={12} className="text-fg-4 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* RE Tools tab */}
        {tab === 'tools' && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-medium text-fg-2 mb-2 uppercase tracking-wider">Reverse Engineering</h3>
              <div className="grid grid-cols-2 gap-3">
                {RE_TOOLS.map(tool => (
                  <button
                    key={tool.name}
                    onClick={() => openExternal(tool.url)}
                    className="flex items-center gap-3 px-4 py-3 bg-bg-1 border border-white/[0.06] rounded-md hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <Bug size={16} className="text-fg-3 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg-0">{tool.name}</p>
                      <p className="text-xs text-fg-4 truncate">{tool.desc}</p>
                    </div>
                    <ExternalLink size={12} className="text-fg-4 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rules & Signatures tab */}
        {tab === 'analysis' && (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-fg-3">Use the search agent to find YARA rules, Sigma signatures, or Snort rules for specific threats. Enter a malware family name, CVE, or threat actor below.</p>
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="e.g. Emotet YARA rule, CVE-2024-1234 sigma, APT28 snort..."
                  className="flex-1 h-control bg-bg-1 border border-white/[0.06] rounded-sm px-3 text-sm text-fg-0 placeholder:text-fg-4 focus:border-white/[0.12] focus:outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val) window.electronAPI?.searchAgent.run(`${val} detection rule signature`)
                    }
                  }}
                />
                <Button variant="ghost" size="sm" icon={<Search size={14} />}>Search</Button>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              {YARA_SIGMA.map(tool => (
                <button
                  key={tool.name}
                  onClick={() => openExternal(tool.url)}
                  className="flex items-center gap-3 px-4 py-3 bg-bg-1 border border-white/[0.06] rounded-md hover:bg-white/[0.04] transition-colors text-left"
                >
                  <FileText size={16} className="text-fg-3 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-0">{tool.name}</p>
                    <p className="text-xs text-fg-4 truncate">{tool.desc}</p>
                  </div>
                  <ExternalLink size={12} className="text-fg-4 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
