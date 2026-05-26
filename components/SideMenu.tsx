import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, Animated, TouchableWithoutFeedback } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "nativewind";
import { getCurrentPlan, getPlanExpiresAt, clearOnboardingState } from "@/lib/onboarding";
import { getPlan, PlanId } from "@/constants/plans";
import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

interface SideMenuProps {
  isVisible: boolean;
  onDismiss: () => void;
  onShowUpgrade: () => void;
  onShowBilling: () => void;
}

export default function SideMenu({ isVisible, onDismiss, onShowUpgrade, onShowBilling }: SideMenuProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const { signOut } = useAuth();
  const { user } = useUser();

  const [currentPlan, setCurrentPlan] = useState<string>("trial");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      (async () => {
        const p = await getCurrentPlan();
        const e = await getPlanExpiresAt();
        setCurrentPlan(p || "trial");
        setExpiresAt(e);
      })();
    }
  }, [isVisible]);

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSignOut = async () => {
    await clearOnboardingState();
    await signOut();
    router.replace("/(auth)/sign-in" as any);
  };

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onDismiss}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        
        <View style={[styles.drawer, { backgroundColor: colors.surface.light }]}>
          <View style={[styles.header, { borderBottomColor: colors.surface.border }]}>
            <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Menu</Text>
            <TouchableOpacity onPress={onDismiss}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <MenuItem icon="person-outline" title="Profile" onPress={() => { onDismiss(); router.push("/(root)/(tabs)/settings" as any); }} colors={colors} />
            <MenuItem icon="car-outline" title="My Vehicles" onPress={() => { onDismiss(); router.push("/(root)/(tabs)/vehicles" as any); }} colors={colors} />
            
            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            {/* Plan Info */}
            <View style={[styles.planCard, { backgroundColor: isDark ? colors.surface.card : colors.accent[50], borderColor: colors.accent[200] }]}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                <Ionicons name="cube-outline" size={20} color={colors.accent[500]} style={{ marginRight: 8 }} />
                <Text style={[styles.planTitle, { color: colors.text.primary }]}>Current Plan</Text>
              </View>
              <Text style={[styles.planName, { color: colors.accent[500] }]}>{getPlan(currentPlan as PlanId).name}</Text>
              
              <Text style={[styles.planDays, { color: daysLeft <= 3 ? colors.status.error : colors.text.secondary }]}>
                {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
              </Text>
              
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.accent[500] }]}
                onPress={() => { onDismiss(); onShowUpgrade(); }}
              >
                <Text style={styles.upgradeBtnText}>
                  {currentPlan === "fleet" ? "Renew Plan" : "Upgrade Plan"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            <MenuItem icon="card-outline" title="Billing & Payments" onPress={() => { onDismiss(); onShowBilling(); }} colors={colors} />
            <MenuItem icon="notifications-outline" title="Notifications" onPress={() => { onDismiss(); router.push("/(root)/(tabs)/alerts" as any); }} colors={colors} />
            <MenuItem icon="help-circle-outline" title="Help & Support" onPress={() => { onDismiss(); }} colors={colors} />
            
            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            <MenuItem icon="log-out-outline" title="Sign Out" onPress={handleSignOut} colors={colors} textColor={colors.status.error} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({ icon, title, onPress, colors, textColor }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={textColor || colors.text.secondary} style={styles.menuIcon} />
      <Text style={[styles.menuText, { color: textColor || colors.text.primary }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    width: width * 0.75,
    height: "100%",
    elevation: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 2, height: 0 },
    shadowRadius: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Jakarta-Bold",
  },
  content: {
    padding: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "Jakarta-SemiBold",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  planTitle: {
    fontSize: 14,
    fontFamily: "Jakarta-SemiBold",
  },
  planName: {
    fontSize: 20,
    fontFamily: "Jakarta-Bold",
    marginBottom: 4,
  },
  planDays: {
    fontSize: 14,
    fontFamily: "Jakarta-Medium",
    marginBottom: 16,
  },
  upgradeBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  upgradeBtnText: {
    color: "#fff",
    fontFamily: "Jakarta-Bold",
    fontSize: 14,
  },
});
