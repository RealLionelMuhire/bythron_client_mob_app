import React, { useEffect, useMemo } from "react";
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
import { getPlan, PlanId } from "@/constants/plans";
import { useFetch } from "@/lib/fetch";
import { Ionicons } from "@expo/vector-icons";

interface PaymentRecord {
  txRef: string;
  planId: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface BillingResponse {
  currentPlan: string;
  expiresAt: string | null;
  payments: PaymentRecord[];
}

interface BillingSheetProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export default function BillingSheet({ isVisible, onDismiss }: BillingSheetProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { data, loading, error, refetch } = useFetch<BillingResponse>("/api/billing");

  useEffect(() => {
    if (isVisible) {
      refetch();
    }
  }, [isVisible, refetch]);

  if (!isVisible) return null;

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
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text.primary }]}>Billing & Payments</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && !data ? (
              <ActivityIndicator size="large" color={colors.accent[500]} style={{ marginTop: 40 }} />
            ) : error ? (
              <View style={[styles.errorBox, { borderColor: colors.status.error, backgroundColor: colors.status.error + "18" }]}>
                <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
                <TouchableOpacity onPress={refetch}><Text style={{ color: colors.accent[500], marginTop: 5 }}>Retry</Text></TouchableOpacity>
              </View>
            ) : data ? (
              <>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>Current Plan</Text>
                <View style={[styles.card, { backgroundColor: isDark ? colors.surface.card : "#fff", borderColor: colors.surface.border, borderWidth: 1 }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.planName, { color: colors.text.primary }]}>
                        {getPlan(data.currentPlan as PlanId).name}
                      </Text>
                      <Text style={[styles.planPrice, { color: colors.accent[500] }]}>
                        RWF {getPlan(data.currentPlan as PlanId).price.toLocaleString()} / month
                      </Text>
                      {data.expiresAt && (
                        <Text style={[styles.expiresText, { color: colors.text.muted }]}>
                          Renews/Expires: {new Date(data.expiresAt).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text.secondary, marginTop: 24 }]}>Payment History</Text>
                {data.payments.length === 0 ? (
                  <Text style={[styles.emptyText, { color: colors.text.muted }]}>No payments yet.</Text>
                ) : (
                  data.payments.map((p) => (
                    <View key={p.txRef} style={[styles.paymentRow, { borderBottomColor: colors.surface.border }]}>
                      <View style={styles.paymentLeft}>
                        <Text style={[styles.paymentPlan, { color: colors.text.primary }]}>
                          {getPlan(p.planId as PlanId).name}
                        </Text>
                        <Text style={[styles.paymentDate, { color: colors.text.muted }]}>
                          {new Date(p.createdAt).toLocaleDateString()} · {p.txRef}
                        </Text>
                      </View>
                      <View style={styles.paymentRight}>
                        <Text style={[styles.paymentAmount, { color: colors.text.primary }]}>
                          RWF {p.amount.toLocaleString()}
                        </Text>
                        <Text style={[styles.paymentStatus, { color: p.status === "successful" ? colors.status.success : colors.status.error }]}>
                          {p.status}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : null}
          </ScrollView>
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
      height: "85%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 24,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surface.border,
    },
    title: {
      fontSize: 20,
      fontFamily: "Jakarta-Bold",
    },
    closeBtn: {
      padding: 4,
    },
    content: {
      padding: 24,
    },
    sectionTitle: {
      fontSize: 15,
      fontFamily: "Jakarta-SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    card: {
      borderRadius: 16,
      padding: 16,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    planName: { fontSize: 18, fontFamily: "Jakarta-Bold", marginBottom: 2 },
    planPrice: { fontSize: 15, fontFamily: "Jakarta-SemiBold" },
    expiresText: { fontSize: 13, fontFamily: "Jakarta-Medium", marginTop: 4 },
    emptyText: {
      fontSize: 15,
      fontFamily: "Jakarta-Medium",
      textAlign: "center",
      marginTop: 20,
    },
    paymentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    paymentLeft: {
      flex: 1,
    },
    paymentPlan: {
      fontSize: 16,
      fontFamily: "Jakarta-SemiBold",
      marginBottom: 4,
    },
    paymentDate: {
      fontSize: 12,
      fontFamily: "Jakarta-Medium",
    },
    paymentRight: {
      alignItems: "flex-end",
    },
    paymentAmount: {
      fontSize: 15,
      fontFamily: "Jakarta-SemiBold",
      marginBottom: 4,
    },
    paymentStatus: {
      fontSize: 13,
      fontFamily: "Jakarta-Bold",
      textTransform: "capitalize",
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
