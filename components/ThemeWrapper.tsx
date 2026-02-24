import { View } from "react-native";
import { useColorScheme } from "nativewind";

/**
 * Wraps app content and applies the "dark" class when dark mode is on.
 * This ensures NativeWind's dark: variants apply consistently across all pages,
 * matching the tab bar and History/Tracking theme.
 */
export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useColorScheme();
  return (
    <View
      className={colorScheme === "dark" ? "dark flex-1 bg-slate-900" : "flex-1 bg-surface-light"}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}
