export interface PageAnalysis {
  captchas: string[]
  adWalls: { selector: string; text: string }[]
  downloadLinks: { href: string; text: string }[]
  shortenerPage: boolean
  externalLinks: number
  pageTitle: string
}

export interface BrowserNotification {
  id: string
  type: 'info' | 'warning' | 'captcha' | 'download' | 'bypass' | 'success'
  message: string
  persistent?: boolean
}

export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
]

export const SHORTENER_DOMAINS = new Set([
  'linkvertise.com', 'link-to.net', 'direct-link.net', 'link-center.net',
  'link-target.net', 'link-hub.net', 'loot-link.com', 'lootlinks.co', 'lootlink.org',
  'ouo.io', 'ouo.press', 'sub2get.com', 'sub2unlock.com', 'sub4unlock.com',
  'bit.ly', 'tinyurl.com', 'is.gd', 'v.gd', 'ow.ly', 'buff.ly',
  'cutt.ly', 'short.io', 'rebrand.ly', 'tiny.cc', 'shrtn.link',
  'adf.ly', 'adfly.com', 'bc.vc', 'gestyy.com', 'exe.io',
  'fc.lc', 'ay.link', 'cpm.link', 'zee.gl',
  'boosty.to', 'ko-fi.com',
])

export function isShortenerDomain(hostname: string): boolean {
  for (const d of SHORTENER_DOMAINS) {
    if (hostname === d || hostname.endsWith('.' + d)) return true
  }
  return false
}

export const PAGE_ANALYZER_SCRIPT = `
(function() {
  try {
    const r = { captchas: [], adWalls: [], downloadLinks: [], shortenerPage: false, externalLinks: 0, pageTitle: document.title || '' };

    function isVisible(el) {
      if (!el) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return false;
      var style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }
    var recapEl = document.querySelector('.g-recaptcha');
    var recapFrame = document.querySelector('iframe[src*="recaptcha/api2/anchor"], iframe[src*="recaptcha/enterprise/anchor"]');
    if ((recapEl && isVisible(recapEl)) || (recapFrame && isVisible(recapFrame)))
      r.captchas.push('reCAPTCHA');
    var hcapEl = document.querySelector('.h-captcha');
    var hcapFrame = document.querySelector('iframe[src*="hcaptcha.com/captcha"]');
    if ((hcapEl && isVisible(hcapEl)) || (hcapFrame && isVisible(hcapFrame)))
      r.captchas.push('hCaptcha');
    var cfEl = document.querySelector('#cf-turnstile');
    var cfFrame = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
    if ((cfEl && isVisible(cfEl)) || (cfFrame && isVisible(cfFrame)))
      r.captchas.push('Cloudflare Turnstile');

    var adSel = ['[class*="adblock-overlay"]','[id*="adblock-overlay"]','[class*="adblock-modal"]',
      '[class*="anti-adblock"]','[id*="anti-adblock"]','[class*="adblock-notice"]',
      '[class*="adblocker-detected"]','[class*="disable-adblock"]','[class*="ad-blocker"]',
      '[class*="adblock_detector"]','[id*="adblock_detector"]'];
    adSel.forEach(function(sel) {
      try {
        var el = document.querySelector(sel);
        if (el && el.offsetHeight > 50) r.adWalls.push({ selector: sel, text: (el.textContent||'').slice(0,200).trim() });
      } catch(e) {}
    });

    var bodyText = (document.body && document.body.textContent || '').toLowerCase();
    if (!r.adWalls.length && (bodyText.includes('ad blocker') || bodyText.includes('adblocker')) &&
        (bodyText.includes('disable') || bodyText.includes('turn off') || bodyText.includes('whitelist'))) {
      r.adWalls.push({ selector: 'text-match', text: 'Ad blocker detection via page text' });
    }

    var dlPat = /\\.(exe|zip|rar|7z|msi|iso|apk|dmg|pkg|torrent|xapk)$/i;
    var dlText = /download|direct.?link|get.?file|mirror/i;
    document.querySelectorAll('a[href]').forEach(function(a) {
      var href = a.getAttribute('href') || '';
      var text = (a.textContent||'').trim();
      if (href.startsWith('magnet:') || dlPat.test(href) || (dlText.test(text) && href.length > 5)) {
        r.downloadLinks.push({ href: href.slice(0,500), text: text.slice(0,100) });
      }
    });

    var sInd = ['linkvertise','loot-link','lootlink','sub2unlock','sub2get','ouo.io','ouo.press',
      'direct-link','link-center','link-target','link-hub','adf.ly','exe.io','bc.vc'];
    var host = window.location.hostname.toLowerCase();
    r.shortenerPage = sInd.some(function(s){ return host.includes(s); });

    var timer = document.querySelector('[class*="timer"]') || document.querySelector('[id*="timer"]') ||
                document.querySelector('[class*="countdown"]') || document.querySelector('[id*="countdown"]');
    if (timer && r.shortenerPage) r.shortenerPage = true;

    r.externalLinks = document.querySelectorAll('a[href^="http"]').length;

    return JSON.stringify(r);
  } catch(e) { return JSON.stringify({ captchas:[], adWalls:[], downloadLinks:[], shortenerPage:false, externalLinks:0, pageTitle:'' }); }
})()
`

export const ANTI_ADBLOCK_CSS = `
[class*="adblock-overlay"], [id*="adblock-overlay"],
[class*="adblock-modal"], [id*="adblock-modal"],
[class*="anti-adblock"], [id*="anti-adblock"],
[class*="adblock-notice"], [id*="adblock-notice"],
[class*="adblocker-detected"], [id*="adblocker-detected"],
[class*="disable-adblock"], [id*="disable-adblock"],
[class*="ad-blocker-notice"], [id*="ad-blocker-notice"],
[class*="adblock_detector"], [id*="adblock_detector"],
.swal2-container[class*="adblock"],
div[class*="adblock"][style*="z-index"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  height: 0 !important;
  overflow: hidden !important;
}
body.no-scroll, body.modal-open, body.overflow-hidden,
body[style*="overflow: hidden"], body[style*="overflow:hidden"] {
  overflow: auto !important;
  position: static !important;
}
html.no-scroll, html[style*="overflow: hidden"], html[style*="overflow:hidden"] {
  overflow: auto !important;
}
`

export const SHORTENER_BYPASS_SCRIPT = `
(function() {
  try {
    var links = [];
    document.querySelectorAll('a[href]').forEach(function(a) {
      var h = a.getAttribute('href') || '';
      var t = (a.textContent||'').trim().toLowerCase();
      if ((t.includes('continue') || t.includes('skip') || t.includes('go to') || t.includes('proceed') ||
           t.includes('get link') || t.includes('free access') || t.includes('direct')) && h.length > 5) {
        links.push({ href: h, text: t.slice(0,100), priority: 'high' });
      }
    });
    var btns = document.querySelectorAll('button, [role="button"]');
    btns.forEach(function(b) {
      var t = (b.textContent||'').trim().toLowerCase();
      if (t.includes('continue') || t.includes('skip') || t.includes('get link') || t.includes('free access')) {
        links.push({ href: '#button', text: t.slice(0,100), priority: 'button' });
      }
    });
    var meta = document.querySelector('meta[http-equiv="refresh"]');
    if (meta) {
      var content = meta.getAttribute('content') || '';
      var match = content.match(/url=(.+)/i);
      if (match) links.push({ href: match[1].trim(), text: 'meta-refresh', priority: 'redirect' });
    }
    return JSON.stringify(links);
  } catch(e) { return '[]'; }
})()
`

export function processAnalysis(url: string, analysis: PageAnalysis): BrowserNotification[] {
  const notifications: BrowserNotification[] = []
  const hostname = new URL(url).hostname.toLowerCase()

  if (analysis.captchas.length > 0) {
    notifications.push({
      id: 'captcha-' + Date.now(),
      type: 'captcha',
      message: `${analysis.captchas.join(', ')} detected — solve it and the agent will continue automatically`,
      persistent: true,
    })
  }

  if (analysis.adWalls.length > 0) {
    notifications.push({
      id: 'adwall-' + Date.now(),
      type: 'bypass',
      message: 'Ad-blocker wall detected — injecting bypass...',
    })
  }

  if (analysis.shortenerPage) {
    notifications.push({
      id: 'shortener-' + Date.now(),
      type: 'info',
      message: 'Link shortener page detected — scanning for direct link...',
    })
  }

  if (analysis.downloadLinks.length > 0 && !analysis.shortenerPage) {
    notifications.push({
      id: 'downloads-' + Date.now(),
      type: 'download',
      message: `Found ${analysis.downloadLinks.length} download link${analysis.downloadLinks.length > 1 ? 's' : ''} on this page`,
    })
  }

  return notifications
}
