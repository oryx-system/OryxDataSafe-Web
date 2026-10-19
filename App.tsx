import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import OnePage from "./views/OnePage";
import { FreeToolDetail } from "./views/FreeTools";
import { useRevealMotion } from "./hooks/useRevealMotion";
import { useLanguage } from "./i18n";
import "./styles.css";
import "./one-page.css";

const sections = ["home", "about", "datastation", "lockdown", "calibration", "free-tools", "brochures", "implementation", "validation", "privacy", "contact"];
const legacyAnchors: Record<string, string> = {
  "/": "home", "/home": "home", "/products": "datastation", "/solutions": "datastation",
  "/equipment": "datastation", "/necessity": "datastation", "/datastation": "datastation",
  "/lockdown": "lockdown", "/calibration": "calibration", "/resources": "brochures", "/brochures": "brochures",
  "/implementation": "implementation", "/validation": "validation", "/guide": "validation",
  "/concept": "validation", "/security": "validation", "/podcast": "validation", "/blog": "validation",
  "/about": "about", "/contact": "contact", "/pricing": "contact", "/support": "contact",
  "/portal": "contact", "/demo": "contact", "/comparison": "datastation", "/privacy": "privacy",
};

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const initialDocument = useRef(true);
  useEffect(() => {
    initialDocument.current = false;
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  if (hash.startsWith('#free-tools/')) return <FreeToolDetail slug={hash.slice('#free-tools/'.length)} />;
  return <MainSite initialDocument={initialDocument.current} />;
}

function MainSite({ initialDocument }: { initialDocument: boolean }) {
  const { t } = useLanguage();
  useEffect(() => {
    document.title = t('Oryx DataSafe | 전자기록·전자서명·데이터 무결성');
  }, [t]);
  const mainRef = useRef<HTMLElement>(null);
  const pendingRestoration = useRef<ScrollRestoration | null>(null);
  const [currentSection, setCurrentSection] = useState("home");
  useRevealMotion(mainRef);

  useLayoutEffect(() => {
    const navigation = initialDocument ? performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined : undefined;
    const restoringDocument = navigation?.type === 'reload' || navigation?.type === 'back_forward';
    // The browser can attempt restoration before React has rendered a tall document.
    // Retain this tab's reading position for reloads; history traversal stays native.
    const positionKey = 'oryx-datasafe-reload-position';
    let saved: { url?: string; x?: number; y?: number } | null = null;
    try { saved = JSON.parse(window.sessionStorage.getItem(positionKey) || 'null'); } catch { /* Storage may be unavailable. */ }
    if (navigation?.type === 'reload' && saved?.url === window.location.href && typeof saved.x === 'number' && typeof saved.y === 'number' && Number.isFinite(saved.x) && Number.isFinite(saved.y) && saved.x >= 0 && saved.y >= 0) {
      pendingRestoration.current = window.history.scrollRestoration;
      window.history.scrollRestoration = 'manual';
      if (Math.abs(window.scrollX - saved.x) > 1 || Math.abs(window.scrollY - saved.y) > 1) {
        window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      }
    }
    let historyFrame = 0;
    let restoringHistory = false;
    let resumeHistoryMotion = false;
    let nativeHistoryRestoration: ScrollRestoration | null = null;
    let historyPosition: { left: number; top: number; behavior: 'instant' } | null = null;
    let activeEntry: string | null = null;
    let activeUrl = window.location.href;
    const entryPositionKey = 'oryx-datasafe-history-position:';
    const rememberDocumentPosition = () => {
      if (restoringHistory || historyFrame) return;
      try {
        const position = JSON.stringify({ url: window.location.href, x: window.scrollX, y: window.scrollY });
        window.sessionStorage.setItem(positionKey, position);
        const entry = window.history.state?.oryxDataSafeEntry;
        if (typeof entry === 'string') window.sessionStorage.setItem(entryPositionKey + entry, position);
      } catch { /* Native restoration remains available when storage is disabled. */ }
    };
    const resolveAnchor = (initial = false) => {
      const hash = window.location.hash.slice(1);
      const legacy = hash.startsWith("/");
      const anchor = legacy ? legacyAnchors[hash.replace(/\/+$/, "") || "/"] ?? "home" : sections.includes(hash) ? hash : "home";
      if (legacy) window.history.replaceState(window.history.state, "", `#${anchor}`);
      const target = document.getElementById(anchor);
      if (hash && target && (!initial || !restoringDocument)) {
        target.focus({ preventScroll: true });
        if (initial || legacy) target.scrollIntoView({ block: "start", behavior: initial || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        // Enlarged translations can make the adjacent flow much taller than
        // the vertically centered product heading. Keep that heading visible
        // when the section's native anchor would leave it below the viewport.
        if (anchor === "datastation" && !historyFrame) {
          const heading = document.getElementById("ds-product-title");
          const inset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          if (heading && heading.getBoundingClientRect().bottom - target.getBoundingClientRect().top > innerHeight - inset) {
            window.scrollTo({ top: window.scrollY + heading.getBoundingClientRect().top - inset, behavior: initial || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }
        }
      }
      setCurrentSection(anchor);
    };
    const markHistoryEntry = () => {
      const state = window.history.state;
      activeUrl = window.location.href;
      activeEntry = null;
      if (state !== null && (typeof state !== 'object' || Array.isArray(state))) return;
      const entry = typeof state?.oryxDataSafeEntry === 'string'
        ? state.oryxDataSafeEntry : `${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
      try {
        if (entry !== state?.oryxDataSafeEntry) window.history.replaceState({ ...state, oryxDataSafeEntry: entry }, '');
        activeEntry = entry;
      } catch { /* Native history navigation remains available. */ }
    };
    const restoreNativeHistoryMode = () => {
      if (nativeHistoryRestoration !== null) {
        window.history.scrollRestoration = nativeHistoryRestoration;
        nativeHistoryRestoration = null;
      }
    };
    const stabilizeHistoryPosition = () => {
      // Preserve the entry's reading position, including positions away from
      // its fragment heading. Cancel motion remaining from the departed entry.
      const position = historyPosition ?? { left: window.scrollX, top: window.scrollY, behavior: 'instant' as const };
      window.cancelAnimationFrame(historyFrame);
      historyFrame = window.requestAnimationFrame(() => {
        window.scrollTo(position);
        historyFrame = window.requestAnimationFrame(() => {
          window.scrollTo(position);
          restoreNativeHistoryMode();
          if (resumeHistoryMotion) document.documentElement.setAttribute('data-navigation-ready', '');
          resumeHistoryMotion = false;
          historyPosition = null;
          historyFrame = 0;
          rememberDocumentPosition();
        });
      });
    };
    const onHistory = (event: PopStateEvent) => {
      const entry = event.state?.oryxDataSafeEntry;
      // New native fragment entries have no key; keep user anchor motion.
      if (typeof entry !== 'string') {
        window.cancelAnimationFrame(historyFrame);
        historyFrame = 0;
        restoringHistory = false;
        historyPosition = null;
        restoreNativeHistoryMode();
        if (resumeHistoryMotion) document.documentElement.setAttribute('data-navigation-ready', '');
        resumeHistoryMotion = false;
        return;
      }
      try {
        // popstate precedes native restoration, so this is the outgoing view.
        if (activeEntry && activeEntry !== entry) {
          window.sessionStorage.setItem(entryPositionKey + activeEntry,
            JSON.stringify({ url: activeUrl, x: window.scrollX, y: window.scrollY }));
        }
        const position = JSON.parse(window.sessionStorage.getItem(entryPositionKey + entry) || 'null');
        historyPosition = position?.url === window.location.href && Number.isFinite(position.x) && Number.isFinite(position.y)
          ? { left: position.x, top: position.y, behavior: 'instant' } : null;
      } catch { historyPosition = null; }
      restoringHistory = true;
      resumeHistoryMotion ||= document.documentElement.hasAttribute('data-navigation-ready');
      document.documentElement.removeAttribute('data-navigation-ready');
      if (historyPosition) {
        nativeHistoryRestoration ??= window.history.scrollRestoration;
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo(historyPosition ?? { left: window.scrollX, top: window.scrollY, behavior: 'instant' });
      window.cancelAnimationFrame(historyFrame);
      historyFrame = window.requestAnimationFrame(() => {
        if (!restoringHistory) return;
        restoringHistory = false;
        stabilizeHistoryPosition();
      });
    };
    const onHash = () => {
      if (restoringHistory) {
        restoringHistory = false;
        stabilizeHistoryPosition();
      }
      resolveAnchor();
      markHistoryEntry();
      rememberDocumentPosition();
    };
    resolveAnchor(true);
    markHistoryEntry();
    rememberDocumentPosition();
    window.addEventListener('popstate', onHistory);
    window.addEventListener("hashchange", onHash);
    window.addEventListener('pagehide', rememberDocumentPosition);
    window.addEventListener('scroll', rememberDocumentPosition, { passive: true });
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener('popstate', onHistory);
      window.cancelAnimationFrame(historyFrame);
      restoreNativeHistoryMode();
      window.removeEventListener('pagehide', rememberDocumentPosition);
      window.removeEventListener('scroll', rememberDocumentPosition);
      if (pendingRestoration.current !== null) {
        window.history.scrollRestoration = pendingRestoration.current;
        pendingRestoration.current = null;
      }
    };
  }, []);

  // Native document restoration must finish without CSS scroll animation.
  // Smooth movement remains available for navigation after the page has loaded.
  useEffect(() => {
    let frame = 0;
    const enableNavigationMotion = () => {
      frame = window.requestAnimationFrame(() => {
        frame = window.requestAnimationFrame(() => {
          if (pendingRestoration.current !== null) {
            window.history.scrollRestoration = pendingRestoration.current;
            pendingRestoration.current = null;
          }
          document.documentElement.setAttribute('data-navigation-ready', '');
        });
      });
    };
    if (document.readyState === 'complete') enableNavigationMotion();
    else window.addEventListener('load', enableNavigationMotion, { once: true });
    return () => {
      window.removeEventListener('load', enableNavigationMotion);
      window.cancelAnimationFrame(frame);
      document.documentElement.removeAttribute('data-navigation-ready');
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (document.querySelector(".site-header")?.getBoundingClientRect().height ?? 94) + 60;
      let active = "home";
      for (const id of sections) {
        if ((document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= line) active = id;
      }
      setCurrentSection(active);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>{t('본문 바로가기')}</a>
      <Navbar currentPath={currentSection} />
      <main id="main-content" ref={mainRef} tabIndex={-1}><OnePage /></main>
      <Footer />
    </>
  );
}
