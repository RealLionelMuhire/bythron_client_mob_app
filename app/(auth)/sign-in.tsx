/**
 * app/(auth)/sign-in.tsx
 *
 * Email/Phone and Password sign-in screen.
 */

import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { router, Redirect } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { icons, images } from "@/constants";
import { fetchAPI, setAuthTokenGetter } from "@/lib/fetch";
import { isOnboardingComplete, getOnboardingStep, stepToRoute, setOnboardingComplete, setOnboardingStep, setCurrentPlan, setPlanExpiresAt } from "@/lib/onboarding";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn, getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  const onSignIn = async () => {
    if (!isLoaded) return;

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError("Please enter your email.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: trimmedIdentifier,
        password,
      });

      console.log("CLERK SIGN-IN RESULT:", JSON.stringify(result, null, 2));

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        // The component will re-render, isSignedIn will become true, and the <Redirect href="/" />
        // at the top of the file will trigger. The global index.tsx handles the backend sync and routing!
      } else if (result.status === "needs_first_factor") {
        // This happens if the user signed up but never verified their email
        const emailFactor = result.supportedFirstFactors?.find((f: any) => f.strategy === "email_code");
        if (emailFactor) {
          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: emailFactor.emailAddressId,
          });
          router.push({ pathname: "/(auth)/otp-verify", params: { type: "email", flow: "signIn" } } as any);
        } else {
          setError(`Additional verification required. Code: ${result.status}`);
        }
      } else if (result.status === "needs_second_factor") {
        console.log("CLERK DEMANDED 2FA. Supported factors:", JSON.stringify(result.supportedSecondFactors, null, 2));
        
        const emailFactor = result.supportedSecondFactors?.find((f: any) => f.strategy === "email_code");
        if (emailFactor) {
          // Prepare the second factor (this tells Clerk to actually send the email with the code)
          await signIn.prepareSecondFactor({
            strategy: "email_code",
          });
          // Redirect to the OTP screen, telling it we are in the "mfa" flow
          router.push({ pathname: "/(auth)/otp-verify", params: { type: "email", flow: "mfa" } } as any);
        } else {
          const factors = result.supportedSecondFactors?.map((f: any) => f.strategy).join(", ") || "Unknown";
          setError(`Clerk is forcing Two-Factor Auth (${factors}). Please check Clerk Dashboard -> Multi-factor settings.`);
        }
      } else {
        setError(`Additional verification required. Code: ${result.status}`);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Sign-in failed. Check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ── Brand Header ── */}
          <View style={styles.brandRow}>
            <View style={styles.brandTextWrap}>
              <Text style={[styles.brandTitle, { color: colors.accent[500] }]}>Track</Text>
              <Text style={[styles.brandTitle, { color: colors.text.primary }]}>{" "}IQ</Text>
            </View>
            <Image source={images.bythronLogo} style={styles.logo} resizeMode="contain" />
          </View>

          {/* ── Welcome Block ── */}
          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>Welcome back</Text>
            <Text style={[styles.welcomeSub, { color: colors.text.muted }]}>Sign in to your account</Text>
          </View>

          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Email Address</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor: focused === "identifier" ? colors.accent[500] : colors.surface.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={identifier}
                  onChangeText={(v) => { setIdentifier(v); setError(null); }}
                  onFocus={() => setFocused("identifier")}
                  onBlur={() => setFocused(null)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Password</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor: focused === "password" ? colors.accent[500] : colors.surface.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => { setPassword(v); setError(null); }}
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                  returnKeyType="done"
                  onSubmitEditing={onSignIn}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color={colors.text.muted} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxWrap}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, rememberMe && { backgroundColor: colors.accent[500], borderColor: colors.accent[500] }]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.rememberText, { color: colors.text.secondary }]}>Stay logged in</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/(auth)/forgot-password" as any)}>
                  <Text style={[styles.forgotText, { color: colors.accent[500] }]}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            <CustomButton title={isLoading ? "Signing in…" : "Sign In"} onPress={onSignIn} className="mt-2" />

            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.text.muted }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                <Text style={[styles.linkAccent, { color: colors.accent[500] }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 24, marginBottom: 8 },
    brandTextWrap: { flexDirection: "row", alignItems: "baseline" },
    brandTitle: { fontSize: 34, fontFamily: "Jakarta-ExtraBold", letterSpacing: -0.5 },
    logo: { width: 54, height: 54 },
    welcomeBlock: { marginTop: 28, marginBottom: 32 },
    welcomeTitle: { fontSize: 26, fontFamily: "Jakarta-Bold", marginBottom: 6 },
    welcomeSub: { fontSize: 15, fontFamily: "Jakarta-Medium", lineHeight: 22 },
    form: {},
    fieldWrap: { marginBottom: 18 },
    label: { fontSize: 13, fontFamily: "Jakarta-SemiBold", marginBottom: 8, letterSpacing: 0.3, textTransform: "uppercase" },
    inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 54 },
    input: { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    eyeBtn: { padding: 8, marginRight: -8 },
    errorBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
    errorText: { fontSize: 13, fontFamily: "Jakarta-Medium" },
    optionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
    checkboxWrap: { flexDirection: "row", alignItems: "center" },
    checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.surface.border, alignItems: "center", justifyContent: "center", marginRight: 8 },
    checkmark: { color: "#fff", fontSize: 12, fontWeight: "bold" },
    rememberText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
    forgotText: { fontSize: 14, fontFamily: "Jakarta-SemiBold" },
    linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 28 },
    linkText: { fontSize: 15, fontFamily: "Jakarta-Medium" },
    linkAccent: { fontSize: 15, fontFamily: "Jakarta-Bold" },
  });
}

export default SignIn;
