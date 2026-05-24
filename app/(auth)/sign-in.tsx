/**
 * app/(auth)/sign-in.tsx
 *
 * Phone-number sign-in screen.
 * Signs in with phone number via Clerk's phoneNumber strategy + phone_code OTP.
 *
 * After a successful sign-in:
 *   - Onboarding complete  → dashboard
 *   - Onboarding partial   → resume mid-flow
 */

import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { router, Redirect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { icons, images } from "@/constants";
import { Image } from "react-native";
import {
  isOnboardingComplete,
  getOnboardingStep,
  stepToRoute,
} from "@/lib/onboarding";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // ── State ──────────────────────────────────────────────────────────────
  const [phone, setPhone]         = useState("");
  const [otpCode, setOtpCode]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [step, setStep]           = useState<"phone" | "otp">("phone");
  const [focused, setFocused]     = useState<string | null>(null);

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  // ── Step 1: Send OTP ────────────────────────────────────────────────────
  const onSendOtp = async () => {
    if (!isLoaded) return;

    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 8) {
      setError("Please enter a valid phone number.");
      return;
    }

    const e164 = trimmed.startsWith("+") ? trimmed : `+250${trimmed.replace(/^0/, "")}`;

    setIsLoading(true);
    setError(null);

    try {
      await signIn!.create({
        identifier: e164,
        strategy: "phone_code",
      });
      await signIn!.prepareFirstFactor({
        strategy: "phone_code",
        phoneNumberId: (signIn!.supportedFirstFactors?.find(
          (f: any) => f.strategy === "phone_code"
        ) as any)?.phoneNumberId ?? "",
      });
      setStep("otp");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Sign-in failed. Check your number and retry.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────
  const onVerifyOtp = useCallback(async () => {
    if (!isLoaded || otpCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: "phone_code",
        code: otpCode,
      });

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });

        // Route based on onboarding state
        const done  = await isOnboardingComplete();
        const step  = await getOnboardingStep();
        if (done) {
          router.replace("/(root)/(tabs)/home");
        } else {
          router.replace(stepToRoute(step) as any);
        }
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
  }, [isLoaded, otpCode]);

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
          {/* ── Brand Header ── */}
          <View style={styles.brandRow}>
            <View style={styles.brandTextWrap}>
              <Text style={[styles.brandTitle, { color: colors.accent[500] }]}>Track</Text>
              <Text style={[styles.brandTitle, { color: colors.text.primary }]}>{" "}IQ</Text>
            </View>
            <Image source={images.bythronLogo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* ── Phone entry ──────────────────────────────────────────────── */}
          {step === "phone" && (
            <>
              <View style={styles.welcomeBlock}>
                <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>
                  Welcome back 👋
                </Text>
                <Text style={[styles.welcomeSub, { color: colors.text.muted }]}>
                  Sign in with your phone number to continue
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.fieldWrap}>
                  <Text style={[styles.label, { color: colors.text.secondary }]}>Phone Number</Text>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                        borderColor:
                          focused === "phone" ? colors.accent[500] : colors.surface.border,
                      },
                    ]}
                  >
                    <View style={[styles.countryBadge, { backgroundColor: colors.accent[500] + "22" }]}>
                      <Text style={[styles.countryCode, { color: colors.accent[500] }]}>🇷🇼 +250</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { color: colors.text.primary }]}
                      placeholder="7XX XXX XXX"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(v) => {
                        setPhone(v);
                        setError(null);
                      }}
                      onFocus={() => setFocused("phone")}
                      onBlur={() => setFocused(null)}
                      returnKeyType="done"
                      onSubmitEditing={onSendOtp}
                      maxLength={12}
                    />
                  </View>
                </View>

                {error ? (
                  <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
                    <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                  </View>
                ) : null}

                <CustomButton
                  title={isLoading ? "Sending code…" : "Send verification code"}
                  onPress={onSendOtp}
                  className="mt-2"
                />

                <View style={styles.linkRow}>
                  <Text style={[styles.linkText, { color: colors.text.muted }]}>
                    Don't have an account?{" "}
                  </Text>
                  <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                    <Text style={[styles.linkAccent, { color: colors.accent[500] }]}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ── OTP entry ────────────────────────────────────────────────── */}
          {step === "otp" && (
            <>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { setStep("phone"); setOtpCode(""); setError(null); }}
              >
                <Text style={[styles.backText, { color: colors.accent[500] }]}>← Change number</Text>
              </TouchableOpacity>

              <View style={[styles.welcomeBlock, { alignItems: "center" }]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accent[500] + "18" }]}>
                  <Text style={styles.iconEmoji}>📱</Text>
                </View>
                <Text style={[styles.welcomeTitle, { color: colors.text.primary, textAlign: "center" }]}>
                  Verify your number
                </Text>
                <Text style={[styles.welcomeSub, { color: colors.text.muted, textAlign: "center" }]}>
                  Enter the 6-digit code sent to{"\n"}
                  <Text style={{ color: colors.accent[500], fontFamily: "Jakarta-SemiBold" }}>
                    {phone.startsWith("+") ? phone : `+250${phone.replace(/^0/, "")}`}
                  </Text>
                </Text>
              </View>

              {/* OTP boxes */}
              <View style={styles.otpRow}>
                {digits.map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                        borderColor: d ? colors.accent[500] : colors.surface.border,
                      },
                    ]}
                  >
                    <Text style={[styles.otpDigit, { color: colors.text.primary }]}>{d}</Text>
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.hiddenInput}
                value={otpCode}
                onChangeText={(v) => {
                  setOtpCode(v.replace(/[^0-9]/g, "").slice(0, 6));
                  setError(null);
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                caretHidden
              />

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error, marginTop: 12 }]}>
                  <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              ) : null}

              <CustomButton
                title={isLoading ? "Verifying…" : "Verify & Sign in"}
                onPress={onVerifyOtp}
                className="mt-4"
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 24,
      marginBottom: 8,
    },
    brandTextWrap: { flexDirection: "row", alignItems: "baseline" },
    brandTitle: { fontSize: 34, fontFamily: "Jakarta-ExtraBold", letterSpacing: -0.5 },
    logo: { width: 54, height: 54 },
    backBtn: { paddingTop: 16, paddingBottom: 4 },
    backText: { fontSize: 15, fontFamily: "Jakarta-SemiBold" },
    welcomeBlock: { marginTop: 28, marginBottom: 32 },
    welcomeTitle: { fontSize: 26, fontFamily: "Jakarta-Bold", marginBottom: 6 },
    welcomeSub: { fontSize: 15, fontFamily: "Jakarta-Medium", lineHeight: 22 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconEmoji: { fontSize: 36 },
    form: {},
    fieldWrap: { marginBottom: 18 },
    label: {
      fontSize: 13,
      fontFamily: "Jakarta-SemiBold",
      marginBottom: 8,
      letterSpacing: 0.3,
      textTransform: "uppercase",
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1.5,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 54,
    },
    countryBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      marginRight: 10,
    },
    countryCode: { fontSize: 14, fontFamily: "Jakarta-SemiBold" },
    input: { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 4,
    },
    errorText: { fontSize: 13, fontFamily: "Jakarta-Medium" },
    linkRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 28,
    },
    linkText: { fontSize: 15, fontFamily: "Jakarta-Medium" },
    linkAccent: { fontSize: 15, fontFamily: "Jakarta-Bold" },
    otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
    otpBox: {
      width: 48,
      height: 58,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    otpDigit: { fontSize: 24, fontFamily: "Jakarta-Bold" },
    hiddenInput: { position: "absolute", opacity: 0, height: 0, width: 0 },
  });
}

export default SignIn;
