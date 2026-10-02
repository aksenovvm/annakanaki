"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { shop } from "@/data/mock";
import { CloseIcon, MenuIcon, ScissorsIcon } from "./Icons";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { href: "/#services", label: "Услуги" },
  { href: "/#barbers", label: "Барберы" },
  { href: "/#reviews", label: "Отзывы" },
  { href: "/#contacts", label: "Контакты" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Пока открыто мобильное меню, страница под ним не прокручивается.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link href="/" className="logo" onClick={close}>
          <span className="logo__mark">
            <ScissorsIcon size={18} />
          </span>
          {shop.name}
        </Link>

        <nav className="nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="nav__link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header__actions">
          <ThemeToggle />
          <Link href="/book" className="btn btn--primary btn--sm header__cta">
            Записаться
          </Link>
          <button
            type="button"
            className="icon-btn header__burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Мобильная навигация">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="mobile-menu__link" onClick={close}>
              {item.label}
            </Link>
          ))}
          <Link href="/book" className="btn btn--primary btn--block" onClick={close}>
            Записаться
          </Link>
        </nav>
      )}
    </header>
  );
}
