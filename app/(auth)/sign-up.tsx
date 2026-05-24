/**
 * app/(auth)/sign-up.tsx
 *
 * Phone-number sign-up screen.
 * Collects full name + phone number, calls Clerk phone-code flow,
 * then navigates to the OTP verification screen.
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { icons, images } from "@/constants";
import { setSignupPhone, setSignupName } from "@/lib/onboarding";

const SignUp = () => {
  const { isLoaded, signUp } = useSignUp();
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [form, setForm] = useState({ name: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  const onContinue = async () => {
    if (!isLoaded) return;

    const name  = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      setError("Please enter your full name.");
      return;
    }
    if (!phone || phone.length < 8) {
      setError("Please enter a valid phone number.");
      return;
    }

    // Build E.164: prefix +250 if user hasn't typed the country code
    const e164 = phone.startsWith("+") ? phone : `+250${phone.replace(/^0/, "")}`;

    setIsLoading(true);
    setError(null);

    try {
      // Save for use in OTP screen and profile-save step
      await setSignupName(name);
      await setSignupPhone(e164);

      await signUp!.create({
        firstName: name.split(" ")[0],
        lastName:  name.split(" ").slice(1).join(" ") || undefined,
        phoneNumber: e164,
      });

      await signUp!.preparePhoneNumberVerification({
        strategy: "phone_code",
      });

      router.push("/(auth)/otp-verify" as any);
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Sign-up failed. Please try again.";
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

          {/* ── Welcome copy ── */}
          <View style={styles.welcomeBlock}>
            <Text style={[styles.welcomeTitle, { color: colors.text.primary }]}>
              Create your account
            </Text>
            <Text style={[styles.welcomeSub, { color: colors.text.muted }]}>
              Start monitoring your assets with Track IQ
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={styles.form}>

            {/* Full Name */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Full Name</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor:
                      focusedField === "name" ? colors.accent[500] : colors.surface.border,
                  },
                ]}
              >
                <Image source={icons.person} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.text.muted}
                  textContentType="name"
                  autoCapitalize="words"
                  value={form.name}
                  onChangeText={(v) => setForm({ ...form, name: v })}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>Phone Number</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor:
                      focusedField === "phone" ? colors.accent[500] : colors.surface.border,
                  },
                ]}
              >
                {/* Country code badge */}
                <View style={[styles.countryBadge, { backgroundColor: colors.accent[500] + "22" }]}>
                  <Text style={[styles.countryCode, { color: colors.accent[500] }]}>🇷🇼 +250</Text>
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder="7XX XXX XXX"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  value={form.phone}
                  onChangeText={(v) => setForm({ ...form, phone: v })}
                  onFocus={() => setFocusedField("phone")}
                  onBlur={() => setFocusedField(null)}
                  returnKeyType="done"
                  onSubmitEditing={onContinue}
                  maxLength={12}
                />
              </View>
              <Text style={[styles.hint, { color: colors.text.muted }]}>
                We'll send a 6-digit code to verify this number
              </Text>
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
              title={isLoading ? "Sending code…" : "Continue"}
              onPress={onContinue}
              className="mt-2"
            />

            <View style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.text.muted }]}>
                Already have an account?{" "}
              </Text>
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
    welcomeBlock: { marginTop: 28, marginBottom: 32 },
    welcomeTitle: { fontSize: 26, fontFamily: "Jakarta-Bold", marginBottom: 6 },
    welcomeSub: { fontSize: 15, fontFamily: "Jakarta-Medium", lineHeight: 22 },
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
    inputIcon: { width: 20, height: 20, marginRight: 10, opacity: 0.6 },
    input: { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    hint: { fontSize: 12, fontFamily: "Jakarta-Medium", marginTop: 6 },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 12,
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
  });
}

export default SignUp;
