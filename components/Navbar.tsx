import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useLanguage } from "../i18n";
import LanguagePicker from "./LanguagePicker";
import Logo from "./Logo";
const links = [
  { path: "about", label: "회사 소개" },
  { path: "datastation", label: "DataStation" },
  { path: "lockdown", label: "LockDown" },
  { path: "calibration", label: "Calibration" },
  { path: "free-tools", label: "무료 도구" },
  { path: "brochures", label: "브로셔" },
];
export default function Navbar({ currentPath }: { currentPath: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  const menuKeyboard = (event: KeyboardEvent<HTMLElement>) => {
    if (!open || event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
  };
  useLayoutEffect(() => {
    const element = header.current;
    if (!element) return;
    const viewport = window.visualViewport;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const bounds = element.getBoundingClientRect();
      const bottom = bounds.bottom;
      document.documentElement.style.setProperty("--header-height", `${bounds.height}px`);
      const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      element.style.setProperty("--mobile-menu-height", `${Math.max(0, viewportBottom - bottom)}px`);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener("resize", schedule);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    measure();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
    };
  }, []);
  useLayoutEffect(() => {
    if (!open) return;
    if (panel.current) panel.current.scrollTop = 0;
    panel.current?.querySelector<HTMLAnchorElement>("nav a")?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (panel.current?.contains(event.target) || trigger.current?.contains(event.target) ||
        header.current?.querySelector(".language-picker")?.contains(event.target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1281px)");
    const onResize = () => {
      if (media.matches) close();
    };
    media.addEventListener("change", onResize);
    return () => media.removeEventListener("change", onResize);
  }, []);
  useEffect(() => {
    const onAnchorChange = () => close(false);
    window.addEventListener("hashchange", onAnchorChange);
    return () => window.removeEventListener("hashchange", onAnchorChange);
  }, []);
  return (
    <header className="site-header" ref={header} onKeyDown={menuKeyboard} onBlur={event => {
      if (open && (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))) close(false);
    }}>
      <div className="header-inner container">
        <a className="brand" href="#home" aria-label={t("Oryx DataSafe 홈")} onClick={() => close(false)}>
          <Logo />
        </a>
        <nav className="desktop-nav" aria-label={t("주 메뉴")}>
          {links.map(({ path, label }) => (
            <a
              key={path}
              href={`#${path}`}
              aria-current={currentPath === path ? "location" : undefined}
            >
              {t(label)}
            </a>
          ))}
          <a className="button button-primary header-cta" href="#contact" onClick={() => close(false)}>
            {t("도입 문의")}
          </a>
        </nav>
        <div className="header-tools">
          <LanguagePicker />
          <button
          ref={trigger}
          type="button"
          className="menu-trigger"
          aria-label={t(open ? "메뉴 닫기" : "메뉴 열기")}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => open ? close() : setOpen(true)}
        >
            <span>{t("메뉴")}</span><span className="menu-lines" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={panel}
        id="mobile-menu"
        className={`mobile-menu${open ? " is-open" : ""}`}
        role="region"
        aria-label={t("전체 메뉴")}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mobile-menu-inner">
          <nav aria-label={t("모바일 주 메뉴")}>
            <a
              href="#home"
              aria-current={currentPath === "home" ? "location" : undefined}
              onClick={() => close(false)}
            >
              {t("홈")}
            </a>
            {links.map(({ path, label }) => (
              <a
                key={path}
                href={`#${path}`}
                aria-current={currentPath === path ? "location" : undefined}
                onClick={() => close(false)}
              >
                {t(label)}
              </a>
            ))}
          </nav>
          <a className="button button-primary" href="#contact" onClick={() => close(false)}>
            {t("도입 문의")}
          </a>
        </div>
      </div>
    </header>
  );
}
