/**
 * app/(onboarding)/profile-save.tsx  — Step 4
 *
 * Automatically syncs the newly created Clerk user to the backend.
 * No user action required — shows a loading state, then advances
 * to device pairing on success (or shows a retry button on failure).
 */

import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { setAuthTokenGetter } from "@/lib/fetch";
import { setOnboardingStep } from "@/lib/onboarding";

type Status = "loading" | "success" | "error";

export default function ProfileSave() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      // Register token getter so fetchAPI can attach auth header
      setAuthTokenGetter(getToken);
      saveProfile();
    }
  }, [user]);

  const saveProfile = async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const token = await getToken();
      const firstName = user!.firstName || "Unknown";
      const lastName = user!.lastName || "Unknown";
      const email = user!.primaryEmailAddress?.emailAddress ?? "";

      await fetchAPI("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clerkUserId: user!.id,
          firstName,
          lastName,
          email,
          role: "owner",
        }),
      });

      await setOnboardingStep(5);
      setStatus("success");
      // Advance automatically
      router.replace("/(onboarding)/device-pair" as any);
    } catch (err: any) {
      console.error("[ProfileSave] error:", err);
      setErrorMsg(err.message ?? "Could not save profile. Please retry.");
      setStatus("error");
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <View style={styles.center}>
        {status === "loading" && (
          <>
            <ActivityIndicator size="large" color={colors.accent[500]} />
            <Text style={[styles.msg, { color: colors.text.primary }]}>
              Setting up your profile…
            </Text>
            <Text style={[styles.sub, { color: colors.text.muted }]}>
              This only takes a second
            </Text>
          </>
        )}

        {status === "error" && (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.msg, { color: colors.text.primary }]}>
              Profile sync failed
            </Text>
            <Text style={[styles.sub, { color: colors.text.muted }]}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.accent[500] }]}
              onPress={saveProfile}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
    safe: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    errorIcon: { fontSize: 48, marginBottom: 8 },
    msg: { fontSize: 20, fontFamily: "Jakarta-Bold", textAlign: "center" },
    sub: { fontSize: 14, fontFamily: "Jakarta-Medium", textAlign: "center", lineHeight: 20 },
    retryBtn: {
      marginTop: 16,
      paddingHorizontal: 32,
      paddingVertical: 14,
      borderRadius: 14,
    },
    retryText: { color: "#fff", fontFamily: "Jakarta-Bold", fontSize: 16 },
  });
}
