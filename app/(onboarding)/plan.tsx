/**
 * app/(onboarding)/plan.tsx  — Step 8
 *
 * Plan selection with Flutterwave payment integration.
 *
 * Flow:
 *   Free trial  →  POST /api/subscriptions directly, no payment
 *   Paid plan   →  Open Flutterwave sheet (PayWithFlutterwave)
 *                  → on success: POST /api/payments/verify (server verifies with secret key)
 *                  → on verified: POST /api/subscriptions → dashboard
 *
 * IMPORTANT: Set EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY in .env
 */

import { useUser, useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { PayWithFlutterwave } from "flutterwave-react-native";
import type { RedirectParams } from "flutterwave-react-native/dist/PayWithFlutterwave";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { setOnboardingComplete, setOnboardingStep, setCurrentPlan, setPlanExpiresAt, getCurrentPlan, isOnboardingComplete } from "@/lib/onboarding";
import { PLANS, PlanId, getPlan } from "@/constants/plans";
import FlutterwavePayment from "@/components/FlutterwavePayment";

function formatPrice(plan: any): string {
  if (plan.price === 0) return "Free";
  return `RWF ${plan.price.toLocaleString()} / month`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PlanScreen() {
  const { user }      = useUser();
  const { getToken }  = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [selectedPlan, setSelectedPlan]         = useState<PlanId>("trial");
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [showFlutterwave, setShowFlutterwave]   = useState(false);
  const pendingPlanRef                          = useRef<PlanId>("trial");

  // ── Guard: skip plan screen if user already has a plan ──────────────────
  useEffect(() => {
    (async () => {
      const alreadyDone = await isOnboardingComplete();
      const existingPlan = await getCurrentPlan();
      if (alreadyDone || existingPlan) {
        router.replace("/(root)/(tabs)/home");
      }
    })();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const activateSubscription = async (planId: PlanId) => {
    try {
      const token = await getToken();
      const res = await fetchAPI("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      await setOnboardingStep(9);
      await setOnboardingComplete(true);
      await setCurrentPlan(planId);
      if (res?.expiresAt) {
        await setPlanExpiresAt(res.expiresAt);
      }
      router.replace("/(root)/(tabs)/home");
    } catch (err: any) {
      setError(err.message ?? "Could not activate subscription. Please contact support.");
      setIsLoading(false);
    }
  };

  const verifyPaymentAndActivate = async (txRef: string, planId: PlanId) => {
    try {
      const token = await getToken();

      // Server verifies with Flutterwave secret key — never trust client-side success alone
      const verifyRes = await fetchAPI("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ txRef, planId }),
      });

      if (verifyRes?.verified === true && verifyRes?.status === "successful") {
        await activateSubscription(planId);
      } else {
        setError("Payment could not be verified. Contact support if charged.");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message ?? "Verification failed. Contact support.");
      setIsLoading(false);
    }
  };

  // ── Continue handler ──────────────────────────────────────────────────────

  const onContinue = async () => {
    setError(null);
    setIsLoading(true);

    if (selectedPlan === "trial") {
      await activateSubscription("trial");
      return;
    }

    // Paid plan → open Flutterwave
    pendingPlanRef.current = selectedPlan;
    setShowFlutterwave(true);
    // Loading spinner stays until Flutterwave result comes back via onRedirect
  };

  // ── Derived Flutterwave config ────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressRow}>
          {[4, 5, 6, 7, 8].map((s) => (
            <View key={s} style={[styles.progressDot, { backgroundColor: colors.accent[500] }]} />
          ))}
        </View>

        {/* Header */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Choose your plan</Text>
          <Text style={[styles.subtitle, { color: colors.text.muted }]}>
            Start free. Upgrade anytime.
          </Text>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              onPress={() => { setSelectedPlan(plan.id); setError(null); }}
              activeOpacity={0.8}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.surface.card : "#fff",
                  borderColor:    isSelected ? colors.accent[500] : colors.surface.border,
                  borderWidth:    isSelected ? 2 : 1.5,
                  shadowColor:    isSelected ? colors.accent[500] : "#000",
                  shadowOpacity:  isSelected ? 0.18 : 0.04,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.planName,  { color: colors.text.primary }]}>{plan.name}</Text>
                  <Text style={[styles.planPrice, { color: colors.accent[500] }]}>{formatPrice(plan)}</Text>
                  {plan.duration && plan.price === 0 && (
                    <Text style={[styles.planPeriodNote, { color: colors.text.muted }]}>
                      {plan.duration}-day trial
                    </Text>
                  )}
                </View>
                <View style={styles.cardRight}>
                  {plan.badge && (
                    <View style={[styles.badge, { backgroundColor: colors.accent[500] }]}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? colors.accent[500] : colors.surface.border },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: colors.accent[500] }]} />
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={[styles.featureTick, { color: colors.accent[500] }]}>✓</Text>
                    <Text style={[styles.featureText, { color: colors.text.secondary }]}>{f}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Error */}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
            <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
          </View>
        ) : null}

        <FlutterwavePayment
          isVisible={showFlutterwave}
          planId={pendingPlanRef.current}
          amount={getPlan(pendingPlanRef.current).price}
          onSuccess={async (txRef) => {
            setShowFlutterwave(false);
            await verifyPaymentAndActivate(txRef, pendingPlanRef.current);
          }}
          onFail={(msg) => {
            setShowFlutterwave(false);
            setError(msg);
            setIsLoading(false);
          }}
          onCancel={() => {
            setShowFlutterwave(false);
            setError("Payment cancelled.");
            setIsLoading(false);
          }}
        />

        {!showFlutterwave && (
          <CustomButton
            title={isLoading ? "Activating…" : selectedPlan === "trial" ? "Start free trial" : "Pay & Continue"}
            onPress={onContinue}
            className="mt-4"
          />
        )}

        {selectedPlan !== "trial" && (
          <View style={[styles.paymentBadge, { backgroundColor: colors.surface.card, borderColor: colors.surface.border }]}>
            <Text style={styles.paymentIcon}>🔒</Text>
            <Text style={[styles.paymentNote, { color: colors.text.muted }]}>
              Secure payment via Flutterwave · MTN MoMo &amp; Card accepted
            </Text>
          </View>
        )}

        <Text style={[styles.tos, { color: colors.text.muted }]}>
          By continuing you agree to Track IQ's Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe:   { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
    progressRow: {
      flexDirection: "row",
      gap: 8,
      paddingTop: 20,
      marginBottom: 4,
      justifyContent: "center",
    },
    progressDot:  { width: 32, height: 4, borderRadius: 2 },
    headerBlock:  { marginTop: 20, marginBottom: 20, alignItems: "center" },
    title:    { fontSize: 26, fontFamily: "Jakarta-Bold",   marginBottom: 6, textAlign: "center" },
    subtitle: { fontSize: 15, fontFamily: "Jakarta-Medium", textAlign: "center" },
    card: {
      borderRadius: 18,
      padding: 18,
      marginBottom: 14,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 10,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 14,
    },
    cardRight:      { alignItems: "flex-end", gap: 8 },
    planName:       { fontSize: 18, fontFamily: "Jakarta-Bold",     marginBottom: 2 },
    planPrice:      { fontSize: 16, fontFamily: "Jakarta-SemiBold" },
    planPeriodNote: { fontSize: 12, fontFamily: "Jakarta-Medium",   marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    badgeText: { color: "#fff", fontSize: 11, fontFamily: "Jakarta-Bold" },
    radioOuter: {
      width: 22, height: 22, borderRadius: 11, borderWidth: 2,
      alignItems: "center", justifyContent: "center",
    },
    radioInner: { width: 12, height: 12, borderRadius: 6 },
    featureList: { gap: 6 },
    featureRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
    featureTick: { fontSize: 14, fontFamily: "Jakarta-Bold" },
    featureText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
    errorBox: {
      borderWidth: 1, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 10,
      marginBottom: 8, marginTop: 4,
    },
    errorText:  { fontSize: 13, fontFamily: "Jakarta-Medium" },
    fwLoadingBox: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 16,
      borderWidth: 1,
      borderRadius: 14,
      height: 54,
    },
    fwLoadingText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
    paymentBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 12,
    },
    paymentIcon: { fontSize: 16 },
    paymentNote: { fontSize: 12, fontFamily: "Jakarta-Medium", flex: 1 },
    tos: {
      fontSize: 12, fontFamily: "Jakarta-Medium",
      textAlign: "center", marginTop: 16, lineHeight: 18,
    },
  });
}
