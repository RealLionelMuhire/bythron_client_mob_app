/**
 * app/(auth)/sign-up.tsx
 *
 * Email and Password sign-up screen with First and Last Name.
 */

import { useSignUp, useAuth } from "@clerk/clerk-expo";
import { router, Redirect } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
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
import { setSignupName } from "@/lib/onboarding";
import { setOnboardingStep } from "@/lib/onboarding";

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  const onContinue = async () => {
    if (!isLoaded) return;

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();
    const password = form.password;

    if (!firstName) return setError("Please enter your first name.");
    if (!lastName) return setError("Please enter your last name.");
    if (!email) return setError("Please enter your email.");
    if (!password || password.length < 8) return setError("Password must be at least 8 characters.");

    setIsLoading(true);
    setError(null);

    try {
      const fullName = `${firstName} ${lastName}`.trim();
      await setSignupName(fullName);

      const result = await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await setOnboardingStep(4);
        router.replace("/(onboarding)/profile-save" as any);
      } else {
        if (result.unverifiedFields.includes("emailAddress")) {
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          router.push({ pathname: "/(auth)/otp-verify", params: { type: "email" } } as any);
        } else {
          // Fallback
          router.push("/(auth)/otp-verify" as any);
        }
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? "Sign-up failed. Please try again.";
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

          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>Create your account</Text>
            <Text style={[styles.welcomeSub, { color: colors.text.muted }]}>Start monitoring your assets with Track IQ</Text>
          </View>

          <View style={styles.form}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }}>
              {/* First Name */}
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>First Name</Text>
                <View style={[styles.inputRow, { backgroundColor: isDark ? colors.surface.card : "#F0F6FF", borderColor: focusedField === "firstName" ? colors.accent[500] : colors.surface.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="John"
                    placeholderTextColor={colors.text.muted}
                    textContentType="givenName"
                    autoCapitalize="words"
                    value={form.firstName}
                    onChangeText={(v) => setForm({ ...form, firstName: v })}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Last Name */}
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Last Name</Text>
                <View style={[styles.inputRow, { backgroundColor: isDark ? colors.surface.card : "#F0F6FF", borderColor: focusedField === "lastName" ? colors.accent[500] : colors.surface.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Doe"
                    placeholderTextColor={colors.text.muted}
                    textContentType="familyName"
                    autoCapitalize="words"
                    value={form.lastName}
                    onChangeText={(v) => setForm({ ...form, lastName: v })}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Email Address</Text>
              <View style={[styles.inputRow, { backgroundColor: isDark ? colors.surface.card : "#F0F6FF", borderColor: focusedField === "email" ? colors.accent[500] : colors.surface.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="user@example.com"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(v) => setForm({ ...form, email: v })}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Password</Text>
              <View style={[styles.inputRow, { backgroundColor: isDark ? colors.surface.card : "#F0F6FF", borderColor: focusedField === "password" ? colors.accent[500] : colors.surface.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.text.muted}
                  secureTextEntry
                  value={form.password}
                  onChangeText={(v) => setForm({ ...form, password: v })}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="done"
                  onSubmitEditing={onContinue}
                />
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
              </View>
            ) : null}

            <CustomButton title={isLoading ? "Creating account…" : "Sign Up"} onPress={onContinue} className="mt-2" />

            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.text.muted }]}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
                <Text style={[styles.linkAccent, { color: colors.accent[500] }]}>Sign In</Text>
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
    inputIcon: { width: 20, height: 20, marginRight: 10, opacity: 0.6 },
    input: { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    errorBox: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
    errorText: { fontSize: 13, fontFamily: "Jakarta-Medium" },
    linkRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 28 },
    linkText: { fontSize: 15, fontFamily: "Jakarta-Medium" },
    linkAccent: { fontSize: 15, fontFamily: "Jakarta-Bold" },
  });
}

export default SignUp;
