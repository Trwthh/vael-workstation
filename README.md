<p align="center">
  <img src="build/icon.png" alt="VAEL" width="80" />
</p>

<h1 align="center">VAEL Workstation</h1>

<p align="center">
  <strong>Advanced Autonomous AI Engineering Workstation</strong>
</p>

<p align="center">
  <a href="https://github.com/Trwthh/vael-workstation/releases">
    <img src="https://img.shields.io/github/v/release/Trwthh/vael-workstation?style=flat-square&color=blue" alt="Release" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT License" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Windows" />
  <img src="https://img.shields.io/badge/electron-33-purple?style=flat-square" alt="Electron 33" />
</p>

---

VAEL is an all-in-one desktop app for AI-powered development. Search, code, reverse engineer, mod games, analyze malware — all driven by local AI agents with no API keys required.

## Features

| Feature | Description |
|---------|-------------|
| **AI Agent** | Claude-powered chat with model cascade (Haiku → Sonnet → Opus) |
| **Deep Search** | AI search with source finding, image analysis, ranked links |
| **Built-in Browser** | Browse the web without leaving the app |
| **Code Editor** | Monaco-based editor with AI assistance |
| **Reverse Engineering** | Binary analysis and decompilation |
| **Game Modding** | Mod creation and management tools |
| **Cybersecurity** | Malware analysis, hash lookups, vulnerability scanning |
| **Auto-Updates** | Built-in update system via NSIS installer |

## Tech Stack

- **Frontend:** React 18 · Tailwind CSS · Zustand · Framer Motion
- **Backend:** Electron 33 · better-sqlite3
- **AI:** Claude CLI (no API keys needed)
- **Build:** Vite · electron-builder · NSIS

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development
pnpm run dev

# Build for production
pnpm run package
```

The build produces `VAEL-Workstation-Setup.exe` (installer) and a portable executable.

## Project Structure

```
electron/          # Main process — agents, IPC, database
src/
├── components/    # Reusable UI components
├── pages/         # App pages (agent, search, code, etc.)
├── stores/        # Zustand state management
├── hooks/         # Custom React hooks
└── styles/        # Global styles and Tailwind config
```

## License

[MIT](LICENSE) — free to use, modify, and distribute.

---

<p align="center">
  Built by <a href="https://github.com/Trwthh">VAEL</a>
</p>
