/**
 * app/(auth)/otp-verify.tsx
 *
 * 6-digit phone OTP verification screen.
 *
 * - Displays a 30-second countdown before allowing resend
 * - Inline error display (no Alert dialogs)
 * - On success → saves onboarding_step=4 → navigates to profile-save
 */

import { useSignUp, useSignIn } from "@clerk/clerk-expo";
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
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();

  const params = useLocalSearchParams();
  const verifyType = (params.type as string) || "email";
  const flow = (params.flow as string) || "signUp"; // "signUp", "signIn", or "mfa"

  const isLoaded = (flow === "signIn" || flow === "mfa") ? isSignInLoaded : isSignUpLoaded;

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
      if (flow === "mfa") {
        // MFA second factor (TOTP or Email Code)
        const strategy = verifyType === "email" ? "email_code" : "totp";
        const result = await signIn!.attemptSecondFactor({ strategy, code: otpCode });
        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          router.replace("/");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } else if (flow === "signIn") {
        const result = await signIn!.attemptFirstFactor({ strategy: "email_code", code: otpCode });
        if (result.status === "complete") {
          await setSignInActive!({ session: result.createdSessionId });
          // The global index.tsx will mount, handle the backend sync, and route correctly.
          router.replace("/");
        } else {
          setError("Verification incomplete. Please try again.");
        }
      } else {
        const result = await signUp!.attemptEmailAddressVerification({ code: otpCode });
        if (result.status === "complete") {
          await setSignUpActive!({ session: result.createdSessionId });
          await setOnboardingStep(4);
          router.replace("/(onboarding)/profile-save" as any);
        } else {
          setError("Verification incomplete. Please try again.");
        }
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
    if (!isLoaded || (flow === "mfa" && verifyType === "totp")) return; // TOTP codes can't be resent
    try {
      if (flow === "mfa" && verifyType === "email") {
        const secondFactors = signIn!.supportedSecondFactors ?? [];
        const emailFactor = secondFactors.find((f: any) => f.strategy === "email_code");
        if (emailFactor) {
          await signIn!.prepareSecondFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        }
      } else if (flow === "signIn") {
        const emailFactor = signIn!.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        if (emailFactor) {
          await signIn!.prepareFirstFactor({ strategy: "email_code", emailAddressId: emailFactor.emailAddressId });
        }
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
      }
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
              {flow === "mfa" && verifyType === "totp" ? "Authenticator Code" : "Verify your email"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              {flow === "mfa" && verifyType === "totp"
                ? "Enter the 6-digit code from your\nauthenticator app"
                : <>Enter the 6-digit code sent to{"\n"}
                    <Text style={{ color: colors.accent[500], fontFamily: "Jakarta-SemiBold" }}>
                      your email
                    </Text>
                  </>}
            </Text>
          </View>

          {/* OTP Input Container */}
          <View style={styles.otpContainer}>
            {/* Visual digit display */}
            <View style={styles.otpRow} pointerEvents="none">
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

            {/* Invisible real text input overlaying the visual display */}
            <TextInput
              style={styles.realInput}
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
          </View>

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

          {/* Resend — only shown for email flows, not for TOTP */}
          {!(flow === "mfa" && verifyType === "totp") && (
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
          )}
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
    otpContainer: {
      position: "relative",
      width: "100%",
      height: 58,
    },
    realInput: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0,
      color: "transparent",
      fontSize: 1, // Minimize visible artifacts
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
