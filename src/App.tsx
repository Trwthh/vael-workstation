import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app'
import { useThemeEffect } from '@/hooks/useTheme'
import { useProfileStore } from '@/stores/profile'
import Layout from '@/components/layout/Layout'
import StartupScreen from '@/components/ui/StartupScreen'
import SetupWizard from '@/components/setup/SetupWizard'
import SettingsModal from '@/components/ui/SettingsModal'
import AgentSettings from '@/components/agent/AgentSettings'
import DropZone from '@/components/ui/DropZone'
import DownloadManager from '@/components/ui/DownloadManager'
import UpdateNotification from '@/components/ui/UpdateNotification'
import Dashboard from '@/pages/Dashboard'
import MainAgent from '@/pages/MainAgent'
import Supervisor from '@/pages/Supervisor'
import AgentManager from '@/pages/AgentManager'
import Personas from '@/pages/Personas'
import CodeEditor from '@/pages/CodeEditor'
import ProjectManager from '@/pages/ProjectManager'
import GameModding from '@/pages/GameModding'
import Cybersecurity from '@/pages/Cybersecurity'
import ReverseEngineering from '@/pages/ReverseEngineering'
import ObsidianMemory from '@/pages/ObsidianMemory'
import ModelManager from '@/pages/ModelManager'
import ToolIntegrations from '@/pages/ToolIntegrations'
import TerminalPage from '@/pages/TerminalPage'
import TaskQueue from '@/pages/TaskQueue'
import BuildManager from '@/pages/BuildManager'
import Support from '@/pages/Support'
import Search from '@/pages/Search'
import SettingsPage from '@/pages/SettingsPage'

const pages = {
  'dashboard': Dashboard,
  'main-agent': MainAgent,
  'search': Search,
  'supervisor': Supervisor,
  'agent-manager': AgentManager,
  'personas': Personas,
  'code-editor': CodeEditor,
  'project-manager': ProjectManager,
  'game-modding': GameModding,
  'cybersecurity': Cybersecurity,
  'reverse-engineering': ReverseEngineering,
  'obsidian-memory': ObsidianMemory,
  'model-manager': ModelManager,
  'tool-integrations': ToolIntegrations,
  'terminal': TerminalPage,
  'task-queue': TaskQueue,
  'build-manager': BuildManager,
  'support': Support,
  'settings': SettingsPage,
} as const

export default function App() {
  const page = useAppStore((s) => s.page)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const setupComplete = useAppStore((s) => s.setupComplete)
  const [showStartup, setShowStartup] = useState(true)
  const PageComponent = pages[page]

  useThemeEffect()

  const handleStartupDone = useCallback(() => {
    setShowStartup(false)
    useAppStore.getState().setStartupDone()
  }, [])

  useEffect(() => {
    useAppStore.getState().loadSessions()
    useProfileStore.getState().load().then(() => {
      useAppStore.getState().hydrateProfileFromIPC()
    })
  }, [])

  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', block)
    return () => document.removeEventListener('contextmenu', block)
  }, [])

  if (!setupComplete) {
    return <SetupWizard />
  }

  return (
    <>
      <Layout>
        {/* Keep Search mounted so webviews persist across page switches */}
        <div className={`h-full ${page === 'search' ? '' : 'hidden'}`}>
          <Search />
        </div>
        <AnimatePresence mode="wait">
          {page !== 'search' && (
            <motion.div
              key={page === 'main-agent' ? `${page}-${activeSessionId}` : page}
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <PageComponent />
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
      <SettingsModal />
      <AgentSettings />
      <DropZone />
      <DownloadManager />
      <UpdateNotification />
      {showStartup && <StartupScreen onDone={handleStartupDone} />}
    </>
  )
}
