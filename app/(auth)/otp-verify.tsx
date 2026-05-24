/**
 * app/(auth)/otp-verify.tsx
 *
 * 6-digit phone OTP verification screen.
 *
 * - Displays a 30-second countdown before allowing resend
 * - Inline error display (no Alert dialogs)
 * - On success → saves onboarding_step=4 → navigates to profile-save
 */

import { useSignUp } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { setOnboardingStep } from "@/lib/onboarding";

const RESEND_TIMEOUT = 30; // seconds

export default function OtpVerify() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const params = useLocalSearchParams();
  const verifyType = (params.type as string) || "email";

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [otpCode, setOtpCode]       = useState("");
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [canResend, setCanResend]   = useState(false);
  const [timer, setTimer]           = useState(RESEND_TIMEOUT);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    startCountdown();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startCountdown() {
    setCanResend(false);
    setTimer(RESEND_TIMEOUT);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  const onVerify = async () => {
    if (!isLoaded || otpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signUp!.attemptEmailAddressVerification({ code: otpCode });

      if (result.status === "complete") {
        // Activate the session
        await setActive!({ session: result.createdSessionId });
        // Mark onboarding at step 4 — profile save is next
        await setOnboardingStep(4);
        router.replace("/(onboarding)/profile-save" as any);
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Wrong code. Check and retry.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onResend = async () => {
    if (!isLoaded) return;
    try {
      await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      setError(null);
      setOtpCode("");
      startCountdown();
    } catch (err: any) {
      setError("Could not resend code. Please try again.");
    }
  };

  // ── Six individual digit boxes ──────────────────────────────────────────
  const digits = otpCode.split("").concat(Array(6).fill("")).slice(0, 6);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={[styles.backText, { color: colors.accent[500] }]}>← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent[500] + "18" }]}>
              <Text style={styles.iconEmoji}>✉️</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Verify your email
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={{ color: colors.accent[500], fontFamily: "Jakarta-SemiBold" }}>
                your email
              </Text>
            </Text>
          </View>

          {/* OTP digit display (visual only — single hidden input) */}
          <View style={styles.otpRow}>
            {digits.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor: d
                      ? colors.accent[500]
                      : colors.surface.border,
                  },
                ]}
              >
                <Text style={[styles.otpDigit, { color: colors.text.primary }]}>
                  {d || ""}
                </Text>
              </View>
            ))}
          </View>

          {/* Hidden text input that drives the digit boxes */}
          <TextInput
            style={styles.hiddenInput}
            value={otpCode}
            onChangeText={(v) => {
              const digits = v.replace(/[^0-9]/g, "").slice(0, 6);
              setOtpCode(digits);
              setError(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            caretHidden
          />

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
              <Text style={[styles.errorText, { color: colors.status.error }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <CustomButton
            title={isLoading ? "Verifying…" : "Verify"}
            onPress={onVerify}
            className="mt-4"
          />

          {/* Resend */}
          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={onResend}>
                <Text style={[styles.resendLink, { color: colors.accent[500] }]}>
                  Resend code
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.timerText, { color: colors.text.muted }]}>
                Resend in{" "}
                <Text style={{ fontFamily: "Jakarta-SemiBold", color: colors.text.primary }}>
                  {timer}s
                </Text>
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    backBtn: { paddingTop: 16, paddingBottom: 4 },
    backText: { fontSize: 15, fontFamily: "Jakarta-SemiBold" },
    headerBlock: { alignItems: "center", marginTop: 32, marginBottom: 36 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    iconEmoji: { fontSize: 36 },
    title: { fontSize: 26, fontFamily: "Jakarta-Bold", marginBottom: 10, textAlign: "center" },
    subtitle: {
      fontSize: 15,
      fontFamily: "Jakarta-Medium",
      lineHeight: 22,
      textAlign: "center",
    },
    otpRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    otpBox: {
      width: 48,
      height: 58,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    otpDigit: { fontSize: 24, fontFamily: "Jakarta-Bold" },
    // Hidden real input behind the visual boxes
    hiddenInput: {
      position: "absolute",
      opacity: 0,
      height: 0,
      width: 0,
    },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 12,
      marginBottom: 4,
    },
    errorText: { fontSize: 13, fontFamily: "Jakarta-Medium" },
    resendRow: {
      alignItems: "center",
      marginTop: 20,
    },
    resendLink: { fontSize: 15, fontFamily: "Jakarta-Bold" },
    timerText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
  });
}
