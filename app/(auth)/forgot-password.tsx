/**
 * app/(auth)/forgot-password.tsx
 *
 * Forgot-password flow using Clerk's built-in email code reset.
 *
 * Step 1 – Enter email → Clerk sends a 6-digit code
 * Step 2 – Enter code + new password → Clerk resets and logs the user in
 */

import { useSignIn } from "@clerk/clerk-expo";
import { router } from "expo-router";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";

type Step = "email" | "reset";

export default function ForgotPassword() {
  const { signIn, isLoaded } = useSignIn();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // ── Step 1: Request reset code ─────────────────────────────────────────────
  const onRequestCode = async () => {
    if (!isLoaded || !signIn) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: trimmed,
      });
      setSuccess("A 6-digit code has been sent to your email.");
      setStep("reset");
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Could not send reset code. Check your email and try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Submit code + new password ─────────────────────────────────────
  const onResetPassword = async () => {
    if (!isLoaded || !signIn) return;

    if (!code.trim()) {
      setError("Please enter the 6-digit code from your email.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password: newPassword,
      });

      if (result.status === "complete") {
        // Password reset — redirect to sign-in
        router.replace("/(auth)/sign-in");
      } else {
        setError("Could not complete the reset. Please try again.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Reset failed. The code may be invalid or expired.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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
          {/* ── Back button ── */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
            <Text style={[styles.backText, { color: colors.text.primary }]}>Back to Sign In</Text>
          </TouchableOpacity>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent[500] + "18" }]}>
              <Ionicons name="lock-closed-outline" size={36} color={colors.accent[500]} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              {step === "email" ? "Forgot Password?" : "Reset Password"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              {step === "email"
                ? "Enter your email address and we'll send you a reset code."
                : `Enter the 6-digit code sent to ${email} and choose a new password.`}
            </Text>
          </View>

          {/* ── Progress dots ── */}
          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: colors.accent[500] }]} />
            <View
              style={[
                styles.dot,
                { backgroundColor: step === "reset" ? colors.accent[500] : colors.surface.border },
              ]}
            />
          </View>

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <View style={styles.form}>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                      borderColor:
                        focused === "email" ? colors.accent[500] : colors.surface.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.text.muted}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="user@example.com"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      setError(null);
                    }}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="done"
                    onSubmitEditing={onRequestCode}
                  />
                </View>
              </View>

              {error && (
                <View
                  style={[
                    styles.msgBox,
                    { backgroundColor: colors.status.error + "18", borderColor: colors.status.error },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.status.error} />
                  <Text style={[styles.msgText, { color: colors.status.error }]}>{error}</Text>
                </View>
              )}

              <CustomButton
                title={isLoading ? "Sending code…" : "Send Reset Code"}
                onPress={onRequestCode}
                className="mt-2"
              />
            </View>
          )}

          {/* ── Step 2: Code + New Password ── */}
          {step === "reset" && (
            <View style={styles.form}>
              {/* Success message */}
              {success && (
                <View
                  style={[
                    styles.msgBox,
                    { backgroundColor: "#22c55e18", borderColor: "#22c55e", marginBottom: 16 },
                  ]}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                  <Text style={[styles.msgText, { color: "#22c55e" }]}>{success}</Text>
                </View>
              )}

              {/* Code field */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>Reset Code</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                      borderColor: focused === "code" ? colors.accent[500] : colors.surface.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="keypad-outline"
                    size={20}
                    color={colors.text.muted}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text.primary, letterSpacing: 6, fontSize: 20 }]}
                    placeholder="000000"
                    placeholderTextColor={colors.text.muted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={(v) => {
                      setCode(v);
                      setError(null);
                    }}
                    onFocus={() => setFocused("code")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* New password */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>New Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                      borderColor:
                        focused === "newpw" ? colors.accent[500] : colors.surface.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={colors.text.muted}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={(v) => {
                      setNewPassword(v);
                      setError(null);
                    }}
                    onFocus={() => setFocused("newpw")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="next"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={22}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm password */}
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: colors.text.secondary }]}>
                  Confirm Password
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                      borderColor:
                        focused === "confirmpw" ? colors.accent[500] : colors.surface.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: colors.text.primary }]}
                    placeholder="Repeat new password"
                    placeholderTextColor={colors.text.muted}
                    secureTextEntry={!showConfirm}
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      setError(null);
                    }}
                    onFocus={() => setFocused("confirmpw")}
                    onBlur={() => setFocused(null)}
                    returnKeyType="done"
                    onSubmitEditing={onResetPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirm(!showConfirm)}
                    style={styles.eyeBtn}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-outline" : "eye-off-outline"}
                      size={22}
                      color={colors.text.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password strength hints */}
              <View style={styles.hintsRow}>
                {[
                  { label: "8+ characters", met: newPassword.length >= 8 },
                  { label: "Passwords match", met: newPassword.length > 0 && newPassword === confirmPassword },
                ].map((h) => (
                  <View key={h.label} style={styles.hintItem}>
                    <Ionicons
                      name={h.met ? "checkmark-circle" : "ellipse-outline"}
                      size={14}
                      color={h.met ? "#22c55e" : colors.text.muted}
                    />
                    <Text
                      style={[
                        styles.hintText,
                        { color: h.met ? "#22c55e" : colors.text.muted },
                      ]}
                    >
                      {h.label}
                    </Text>
                  </View>
                ))}
              </View>

              {error && (
                <View
                  style={[
                    styles.msgBox,
                    { backgroundColor: colors.status.error + "18", borderColor: colors.status.error },
                  ]}
                >
                  <Ionicons name="alert-circle-outline" size={16} color={colors.status.error} />
                  <Text style={[styles.msgText, { color: colors.status.error }]}>{error}</Text>
                </View>
              )}

              <CustomButton
                title={isLoading ? "Resetting…" : "Reset Password"}
                onPress={onResetPassword}
                className="mt-2"
              />

              {/* Resend code */}
              <TouchableOpacity
                style={styles.resendWrap}
                onPress={() => {
                  setStep("email");
                  setCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                  setSuccess(null);
                }}
              >
                <Text style={[styles.resendText, { color: colors.text.muted }]}>
                  Didn't get the code?{" "}
                  <Text style={{ color: colors.accent[500], fontFamily: "Jakarta-Bold" }}>
                    Resend
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 16,
      paddingBottom: 8,
    },
    backText: { fontSize: 15, fontFamily: "Jakarta-Medium" },
    header: { alignItems: "center", marginTop: 24, marginBottom: 28 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: { fontSize: 26, fontFamily: "Jakarta-Bold", marginBottom: 10, textAlign: "center" },
    subtitle: {
      fontSize: 15,
      fontFamily: "Jakarta-Medium",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 8,
    },
    progressRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 28 },
    dot: { width: 32, height: 4, borderRadius: 2 },
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
    input: { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    eyeBtn: { padding: 8, marginRight: -8 },
    msgBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 8,
    },
    msgText: { flex: 1, fontSize: 13, fontFamily: "Jakarta-Medium", lineHeight: 18 },
    hintsRow: { flexDirection: "row", gap: 16, marginBottom: 12, flexWrap: "wrap" },
    hintItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    hintText: { fontSize: 12, fontFamily: "Jakarta-Medium" },
    resendWrap: { alignItems: "center", marginTop: 20 },
    resendText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
  });
}
