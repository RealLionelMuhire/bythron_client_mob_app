import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "nativewind";
import { PLANS, PlanId, getPlan } from "@/constants/plans";
import CustomButton from "@/components/CustomButton";
import { fetchAPI } from "@/lib/fetch";
import { setCurrentPlan, setPlanExpiresAt } from "@/lib/onboarding";
import FlutterwavePayment from "@/components/FlutterwavePayment";
import { Ionicons } from "@expo/vector-icons";

interface UpgradeSheetProps {
  isVisible: boolean;
  currentPlan: string | null;
  onDismiss: () => void;
  onSuccess: () => void;
}

export default function UpgradeSheet({
  isVisible,
  currentPlan,
  onDismiss,
  onSuccess,
}: UpgradeSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const currentPrice = currentPlan ? getPlan(currentPlan as PlanId).price : 0;
  const availablePlans = PLANS.filter((p) => p.price > currentPrice);

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    availablePlans.length > 0 ? availablePlans[availablePlans.length - 1].id : "fleet"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"success" | "fail" | "cancel" | null>(null);
  const [showFlutterwave, setShowFlutterwave] = useState(false);
  const pendingPlanRef = useRef<PlanId>("fleet");

  if (!isVisible) return null;

  const handleUpgradeClick = () => {
    setIsLoading(true);
    setError(null);
    setOutcome(null);
    pendingPlanRef.current = selectedPlan;
    setShowFlutterwave(true);
  };

  const handlePaymentSuccess = async (txRef: string) => {
    setShowFlutterwave(false);
    try {
      // 1. Verify
      const verifyRes = await fetchAPI("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txRef, planId: pendingPlanRef.current }),
      });

      if (!verifyRes?.verified) {
        setError(verifyRes?.error || "Payment verification failed.");
        setOutcome("fail");
        setIsLoading(false);
        return;
      }

      // 2. Upgrade
      const upgRes = await fetchAPI("/api/subscriptions/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txRef, planId: pendingPlanRef.current }),
      });

      await setCurrentPlan(pendingPlanRef.current);
      if (upgRes?.expiresAt) {
        await setPlanExpiresAt(upgRes.expiresAt);
      }

      setOutcome("success");
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to upgrade. Contact support.");
      setOutcome("fail");
      setIsLoading(false);
    }
  };

  const handlePaymentFail = (msg: string) => {
    setShowFlutterwave(false);
    setError(msg);
    setOutcome("fail");
    setIsLoading(false);
  };

  const handlePaymentCancel = () => {
    setShowFlutterwave(false);
    setOutcome("cancel");
    setIsLoading(false);
  };

  const resetState = () => {
    setOutcome(null);
    setError(null);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* FLUTTERWAVE SHEET (HIDDEN) */}
          <FlutterwavePayment
            isVisible={showFlutterwave}
            planId={pendingPlanRef.current}
            amount={getPlan(pendingPlanRef.current).price}
            onSuccess={handlePaymentSuccess}
            onFail={handlePaymentFail}
            onCancel={handlePaymentCancel}
          />

          {outcome === "success" ? (
            <View style={styles.stateContainer}>
              <Ionicons name="checkmark-circle" size={64} color={colors.status.success} />
              <Text style={[styles.title, { color: colors.text.primary, marginTop: 16 }]}>
                Plan upgraded!
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.muted, textAlign: "center" }]}>
                You are now on the {getPlan(selectedPlan).name} plan.
              </Text>
              <CustomButton
                title="Back to dashboard"
                onPress={() => {
                  onSuccess();
                  onDismiss();
                }}
                className="mt-6 w-full"
              />
            </View>
          ) : outcome === "fail" ? (
            <View style={styles.stateContainer}>
              <Ionicons name="close-circle" size={64} color={colors.status.error} />
              <Text style={[styles.title, { color: colors.text.primary, marginTop: 16 }]}>
                Payment failed
              </Text>
              <Text style={[styles.subtitle, { textAlign: "center", color: colors.status.error }]}>
                {error}
              </Text>
              <CustomButton title="Try again" onPress={resetState} className="mt-6 w-full" />
              <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.text.muted }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : outcome === "cancel" ? (
            <View style={styles.stateContainer}>
              <Ionicons name="information-circle" size={64} color={colors.status.warning} />
              <Text style={[styles.title, { color: colors.text.primary, marginTop: 16 }]}>
                Payment cancelled
              </Text>
              <Text style={[styles.subtitle, { color: colors.text.muted, textAlign: "center" }]}>
                No charge was made.
              </Text>
              <CustomButton title="Try again" onPress={resetState} className="mt-6 w-full" />
              <TouchableOpacity onPress={onDismiss} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.text.muted }]}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text.primary }]}>Upgrade your plan</Text>
              
              {currentPlan && (
                <Text style={[styles.upgradeSub, { color: colors.text.secondary }]}>
                  Upgrading from {getPlan(currentPlan as PlanId).name} → {getPlan(selectedPlan).name}
                </Text>
              )}

              <ScrollView style={styles.planList} showsVerticalScrollIndicator={false}>
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      onPress={() => setSelectedPlan(plan.id)}
                      activeOpacity={0.8}
                      style={[
                        styles.card,
                        {
                          backgroundColor: isDark ? colors.surface.card : "#fff",
                          borderColor: isSelected ? colors.accent[500] : colors.surface.border,
                          borderWidth: isSelected ? 2 : 1.5,
                        },
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={[styles.planName, { color: colors.text.primary }]}>
                            {plan.name}
                          </Text>
                          <Text style={[styles.planPrice, { color: colors.accent[500] }]}>
                            RWF {plan.price.toLocaleString()} / month
                          </Text>
                        </View>
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

                {availablePlans.length === 0 && (
                  <Text style={[styles.subtitle, { color: colors.text.muted, textAlign: "center", marginTop: 20 }]}>
                    You are already on the highest plan!
                  </Text>
                )}
              </ScrollView>

              {error && outcome !== "fail" && (
                <View style={[styles.errorBox, { borderColor: colors.status.error, backgroundColor: colors.status.error + "18" }]}>
                  <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                </View>
              )}

              {availablePlans.length > 0 && !showFlutterwave && (
                <CustomButton
                  title={isLoading ? "Loading..." : `Upgrade — RWF ${getPlan(selectedPlan).price.toLocaleString()}`}
                  onPress={handleUpgradeClick}
                  className="mt-4"
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: colors.surface.light,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingTop: 12,
      maxHeight: "90%",
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surface.border,
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 22,
      fontFamily: "Jakarta-Bold",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Jakarta-Medium",
    },
    upgradeSub: {
      fontSize: 14,
      fontFamily: "Jakarta-SemiBold",
      marginBottom: 16,
    },
    planList: {
      marginBottom: 8,
    },
    card: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    planName: { fontSize: 18, fontFamily: "Jakarta-Bold", marginBottom: 2 },
    planPrice: { fontSize: 15, fontFamily: "Jakarta-SemiBold" },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioInner: { width: 12, height: 12, borderRadius: 6 },
    featureList: { gap: 6 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    featureTick: { fontSize: 14, fontFamily: "Jakarta-Bold" },
    featureText: { fontSize: 14, fontFamily: "Jakarta-Medium" },
    stateContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
    },
    cancelBtn: {
      marginTop: 16,
      padding: 10,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: "Jakarta-Medium",
    },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    errorText: {
      fontSize: 13,
      fontFamily: "Jakarta-Medium",
    },
  });
}
