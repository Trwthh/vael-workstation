# VAEL Workstation

Advanced autonomous AI engineering workstation. Built with Electron, React, and Claude.

VAEL is an all-in-one desktop app for AI-powered development — search, code, reverse engineering, game modding, cybersecurity, and more, all driven by local AI agents.

## Features

- **AI Agent Chat** — Claude-powered conversational agent with model cascade (Haiku → Sonnet → Opus)
- **AI Search** — Deep search with automatic source finding, image analysis, and built-in browser
- **Code Editor** — Monaco-based editor with AI assistance
- **Reverse Engineering** — Binary analysis and decompilation tools
- **Game Modding** — Mod creation and management
- **Cybersecurity** — Malware analysis, hash lookups, vulnerability scanning
- **Auto-Updates** — Built-in update system

## Stack

- **Frontend:** React 18, Tailwind CSS, Zustand, Framer Motion
- **Backend:** Electron 33, better-sqlite3
- **AI:** Claude CLI integration (no API keys needed)
- **Build:** Vite, electron-builder, NSIS installer

## Getting Started

```bash
pnpm install
pnpm run dev
```

## Building

```bash
pnpm run package
```

Produces `VAEL-Workstation-Setup.exe` (installer) and `VAEL-Workstation.exe` (portable).

## License

MIT — see [LICENSE](LICENSE)

---

Made by [VAEL](https://github.com/TRW-HUB)
