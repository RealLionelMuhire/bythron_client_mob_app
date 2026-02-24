import * as SecureStore from "expo-secure-store";

const THEME_STORAGE_KEY = "colorScheme";

export type StoredColorScheme = "light" | "dark";

export async function loadColorScheme(): Promise<StoredColorScheme | null> {
  try {
    const value = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export async function saveColorScheme(value: StoredColorScheme): Promise<void> {
  try {
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, value);
  } catch (e) {
    console.warn("Failed to save color scheme", e);
  }
}
