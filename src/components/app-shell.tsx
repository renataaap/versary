"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { clearLoggedInUser, getLoggedInUser, getUserRole, subscribeToAuthChanges } from "@/lib/client-auth";
import Brand from "@/components/ui/Brand";
import Modal from "@/components/ui/Modal";
import ShellIcon, { type ShellIconName } from "@/components/ui/ShellIcon";

const navigation: { href: string; label: string; icon: ShellIconName; section: "operation" | "administration" }[] = [
  { href: "/dashboard", label: "Painel principal", icon: "dashboard", section: "operation" },
  { href: "/maquinas", label: "Máquinas", icon: "machine", section: "operation" },
  { href: "/classificacaofalhas", label: "Classificação de falhas", icon: "classification", section: "operation" },
  { href: "/pareto", label: "Análises", icon: "analysis", section: "operation" },
  { href: "/predicoes", label: "Realizar nova predição", icon: "prediction", section: "operation" },
  { href: "/tabelas", label: "Tabelas", icon: "table", section: "administration" },
  { href: "/inserirdados", label: "Importação de dados", icon: "upload", section: "administration" },
];
function isActiveRoute(pathname: string, href: string) {
  return href === "/pareto" ? ["/pareto", "/jackknife", "/outrosgraficos"].includes(pathname) : pathname === href || pathname.startsWith(`${href}/`);
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const loggedUser = useSyncExternalStore(subscribeToAuthChanges, getLoggedInUser, () => null);
  const userRole = useSyncExternalStore(subscribeToAuthChanges, getUserRole, () => "visitor");
  const isAdmin = userRole === "admin";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const mainContent = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const notifications = useRef<HTMLDivElement>(null);
  const visibleNavigation = navigation.filter((item) => isAdmin || item.href !== "/inserirdados");
  const current = navigation.find((item) => isActiveRoute(pathname, item.href));
  const displayName = loggedUser || "Visitante";
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      if (sidebar.current) sidebar.current.inert = !media.matches && !mobileOpen;
      if (media.matches) setMobileOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const contentElement = content.current;
    const menuElement = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (contentElement) contentElement.inert = true;
    sidebar.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const targets = sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!targets?.length) return;
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      if (contentElement) contentElement.inert = false;
      document.removeEventListener("keydown", handleKey);
      menuElement?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    notifications.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setNotificationsOpen(false); notificationButton.current?.focus(); }
    };
    const handlePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !notifications.current?.contains(event.target) && !notificationButton.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => { document.removeEventListener("keydown", handleKey); document.removeEventListener("pointerdown", handlePointer); };
  }, [notificationsOpen]);

  useEffect(() => {
    const element = mainContent.current;
    if (!element) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const curtain = element.closest('[inert][aria-hidden="true"]');
    let animation: Animation | undefined;
    let played = false;
    const play = () => {
      if (played || element.closest('[inert][aria-hidden="true"]')) return;
      played = true;
      observer?.disconnect();
      if (!media.matches) animation = element.animate([
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ], { duration: 250, easing: "ease-out" });
    };
    const observer = curtain ? new MutationObserver(play) : null;
    if (curtain) observer?.observe(curtain, { attributes: true, attributeFilter: ["inert", "aria-hidden"] });
    play();
    const stopForReducedMotion = () => { if (media.matches) animation?.cancel(); };
    media.addEventListener("change", stopForReducedMotion);
    return () => {
      observer?.disconnect();
      animation?.cancel();
      media.removeEventListener("change", stopForReducedMotion);
    };
  }, [pathname]);

  const closeNavigation = () => { setMobileOpen(false); setNotificationsOpen(false); };
  return (
    <div className="versary-shell">
      <a href="#conteudo-principal" className="shell-skip-link">Ir para o conteúdo principal</a>
      <AnimatePresence>{mobileOpen && <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0.08 : 0.18 }} type="button" className="shell-backdrop" aria-label="Fechar navegação" tabIndex={-1} onClick={() => setMobileOpen(false)} />}</AnimatePresence>
      <aside ref={sidebar} id="versary-sidebar" className={`shell-sidebar${mobileOpen ? " shell-sidebar-open" : ""}`} role={mobileOpen ? "dialog" : "complementary"} aria-modal={mobileOpen || undefined} aria-label="Navegação principal da manutenção">
        <Link href="/dashboard" className="shell-logo" onClick={closeNavigation} aria-label="Coca-Cola FEMSA — ir para o dashboard"><Brand /><span><strong>FEMSA</strong><small>Manutenção · Marília</small></span></Link>
        <button type="button" className="shell-sidebar-close shell-icon-button" aria-label="Fechar navegação" onClick={() => setMobileOpen(false)}><ShellIcon name="close" /></button>
        <div className="shell-unit"><span className="shell-unit-icon"><ShellIcon name="machine" /></span><div><strong>Unidade Marília</strong><small>São Paulo, Brasil</small></div><ShellIcon name="shield" /></div>
        {(["operation", "administration"] as const).map((section) => <div className="shell-nav-section" key={section}><p className="shell-section-label">{section === "operation" ? "OPERAÇÃO" : "ADMINISTRAÇÃO"}</p><nav aria-label={section === "operation" ? "Módulos de operação" : "Módulos de administração"}>{visibleNavigation.filter((item) => item.section === section).map((item) => <Link key={item.href} href={item.href} onClick={closeNavigation} className={`shell-nav-link${isActiveRoute(pathname, item.href) ? " shell-nav-link-active" : ""}`} aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}><ShellIcon name={item.icon} /><span>{item.label}</span></Link>)}</nav></div>)}
        <div className="shell-sidebar-bottom"><button type="button" className="shell-help" onClick={() => { setMobileOpen(false); setHelpOpen(true); }}><ShellIcon name="help" /><span>Central de ajuda</span><ShellIcon name="external" /></button></div>
        <div className="shell-user"><span className="shell-avatar">{initials}</span><div><strong>{displayName}</strong><small>{isAdmin ? "Admin" : "Acesso público"}</small></div>{loggedUser && <button type="button" className="shell-icon-button" aria-label="Sair" title="Sair" onClick={() => { clearLoggedInUser(); router.push("/login"); }}><ShellIcon name="logout" /></button>}</div>
      </aside>
      <div ref={content} className="shell-content">
        <header className="shell-header"><div className="shell-breadcrumb"><button ref={menuButton} type="button" className="shell-menu shell-icon-button" aria-label="Abrir navegação" aria-expanded={mobileOpen} aria-controls="versary-sidebar" onClick={() => setMobileOpen(true)}><ShellIcon name="menu" /></button><span className="shell-breadcrumb-parent">Manutenção</span><span className="shell-breadcrumb-separator"><ShellIcon name="chevron" /></span><strong>{current?.label || "Manutenção Industrial"}</strong></div><div className="shell-header-actions"><div className="shell-profile"><span>Perfil</span><span className="shell-profile-badge">{isAdmin ? "Admin" : "Visitante"}</span></div><button ref={notificationButton} type="button" className="shell-icon-button" aria-label="Notificações" aria-expanded={notificationsOpen} aria-controls="versary-notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><ShellIcon name="bell" /></button><span className="shell-header-avatar shell-avatar" aria-label={displayName}>{initials}</span></div></header>
        <AnimatePresence>{notificationsOpen && <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 6 }} transition={{ duration: reduceMotion ? 0.08 : 0.18 }} ref={notifications} id="versary-notifications" className="shell-notifications" role="region" aria-label="Notificações da manutenção" tabIndex={-1}><div className="shell-modal-heading"><h2>Suas notificações</h2><button type="button" className="shell-icon-button" aria-label="Fechar notificações" onClick={() => { setNotificationsOpen(false); notificationButton.current?.focus(); }}><ShellIcon name="close" /></button></div><p>Nenhuma notificação disponível.</p></motion.div>}</AnimatePresence>
        <main ref={mainContent} id="conteudo-principal" tabIndex={-1} className="shell-main shell-page-enter">{children}<footer className="shell-footer"><span>Coca-Cola FEMSA · Manutenção Industrial · Unidade Marília</span><span>Versary</span></footer></main>
      </div>
      <Modal open={helpOpen} title="Central de ajuda" onClose={() => setHelpOpen(false)}><p>Use o menu lateral para acessar o painel, máquinas, classificação e análises da manutenção.</p><p>O perfil visitante permite consultar os dados. A importação e as alterações de classificação seguem as permissões do seu perfil.</p><button type="button" className="shell-primary-button" onClick={() => setHelpOpen(false)}>Entendido</button></Modal>
    </div>
  );
}
