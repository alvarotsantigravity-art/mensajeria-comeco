"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function currentTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  function toggle() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage may be blocked; the theme still applies for this visit.
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema claro/oscuro">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
