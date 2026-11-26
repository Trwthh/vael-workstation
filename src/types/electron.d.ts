declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string
      partition?: string
      allowpopups?: string
      preload?: string
      useragent?: string
      httpreferrer?: string
      nodeintegration?: string
      plugins?: string
      disablewebsecurity?: string
      webpreferences?: string
    }
  }
}

interface WebviewElement extends HTMLElement {
  src: string
  loadURL(url: string): Promise<void>
  getURL(): string
  getTitle(): string
  goBack(): void
  goForward(): void
  reload(): void
  stop(): void
  canGoBack(): boolean
  canGoForward(): boolean
  isLoading(): boolean
  insertCSS(css: string): Promise<string>
  executeJavaScript(code: string): Promise<unknown>
  addEventListener(event: string, callback: (...args: unknown[]) => void): void
  removeEventListener(event: string, callback: (...args: unknown[]) => void): void
}
