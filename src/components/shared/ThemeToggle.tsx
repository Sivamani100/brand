"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

export interface ThemeToggleProps {
  variant?: "compact" | "horizontal";
}

export default function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const { user, profile } = useUser();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const supabase = createClient();

  useEffect(() => {
    // 1. Check localStorage
    const localTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    if (localTheme === "dark" || localTheme === "light") {
      setTheme(localTheme);
      document.documentElement.setAttribute("data-theme", localTheme);
      document.documentElement.classList.toggle("dark", localTheme === "dark");
      
      // Sync to database if logged in and database value differs
      if (user && profile) {
        const prefTheme = ((profile as any).preferences as any)?.theme;
        if (prefTheme !== localTheme) {
          const currentPrefs = ((profile as any).preferences as any) || {};
          supabase
            .from("profiles")
            .update({ preferences: { ...currentPrefs, theme: localTheme } } as any)
            .eq("id", user.id)
            .then(({ error }) => {
              if (error) console.error("Failed to sync theme preference to DB", error);
            });
        }
      }
    } else if ((profile as any)?.preferences) {
      // 2. Check profile preferences
      const prefTheme = ((profile as any).preferences as any)?.theme as "dark" | "light" | null;
      if (prefTheme === "dark" || prefTheme === "light") {
        setTheme(prefTheme);
        document.documentElement.setAttribute("data-theme", prefTheme);
        document.documentElement.classList.toggle("dark", prefTheme === "dark");
        localStorage.setItem("theme", prefTheme);
      }
    } else {
      // 3. Default to dark
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  }, [profile, user]);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);

    // Sync to Supabase if logged in
    if (user) {
      const currentPrefs = ((profile as any)?.preferences as any) || {};
      const nextPrefs = { ...currentPrefs, theme: nextTheme };
      await supabase
        .from("profiles")
        .update({ preferences: nextPrefs } as any)
        .eq("id", user.id);
    }
  };

  const setThemeExplicitly = async (targetTheme: "light" | "dark") => {
    if (theme === targetTheme) return;
    setTheme(targetTheme);
    document.documentElement.setAttribute("data-theme", targetTheme);
    document.documentElement.classList.toggle("dark", targetTheme === "dark");
    localStorage.setItem("theme", targetTheme);

    // Sync to Supabase if logged in
    if (user) {
      const currentPrefs = ((profile as any)?.preferences as any) || {};
      const nextPrefs = { ...currentPrefs, theme: targetTheme };
      await supabase
        .from("profiles")
        .update({ preferences: nextPrefs } as any)
        .eq("id", user.id);
    }
  };

  if (variant === "horizontal") {
    return (
      <div className="w-full flex items-center bg-surface-2 p-1 rounded-xl border border-border/10 select-none">
        <button
          type="button"
          onClick={() => setThemeExplicitly("light")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all scale-active cursor-pointer ${
            theme === "light"
              ? "bg-surface text-text-primary shadow-sm border border-border/10"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Sun className="size-4" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setThemeExplicitly("dark")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all scale-active cursor-pointer ${
            theme === "dark"
              ? "bg-surface-3 text-text-primary shadow-sm border border-border/10"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Moon className="size-4" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex items-center justify-center size-10 rounded-full bg-surface-2 border border-border text-text-primary hover:bg-surface-3 transition-colors scale-active overflow-hidden focus:outline-none"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -20 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 20 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute"
          >
            <Moon className="size-5 text-text-primary" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: -20 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 20 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute"
          >
            <Sun className="size-5 text-text-primary" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
