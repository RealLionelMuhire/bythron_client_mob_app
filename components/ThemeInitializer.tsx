import { NativeWindStyleSheet, useColorScheme } from "nativewind";
import { useEffect } from "react";

import { loadColorScheme } from "@/lib/theme";

/**
 * Loads saved theme preference on mount and applies it.
 * Must be rendered inside the app (after NativeWind is ready).
 * Uses both setColorScheme (hook) and NativeWindStyleSheet.setColorScheme
 * to ensure dark: variants apply consistently across all pages.
 */
export function ThemeInitializer() {
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    loadColorScheme().then((saved) => {
      if (saved) {
        setColorScheme(saved);
        NativeWindStyleSheet.setColorScheme(saved);
      }
    });
  }, [setColorScheme]);

  return null;
}
