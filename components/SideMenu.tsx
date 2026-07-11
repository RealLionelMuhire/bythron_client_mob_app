import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "nativewind";
import { getCurrentPlan, getPlanExpiresAt, clearOnboardingState } from "@/lib/onboarding";
import { getPlan, PlanId } from "@/constants/plans";
import { router } from "expo-router";
import { icons } from "@/constants";

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.78;

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
  const [modalVisible, setModalVisible] = useState(false);

  // Slide animation
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      // Load plan info
      (async () => {
        const p = await getCurrentPlan();
        const e = await getPlanExpiresAt();
        setCurrentPlan(p || "trial");
        setExpiresAt(e);
      })();
      // Slide in + fade backdrop
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out + fade backdrop
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setModalVisible(false));
    }
  }, [isVisible]);

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const upgradeLabel = () => {
    if (daysLeft <= 0) return "Renew Plan";
    if (currentPlan === "trial") return "Upgrade to Basic";
    if (currentPlan === "basic") return "Upgrade to Fleet";
    return "Renew Plan"; // fleet
  };

  const handleSignOut = async () => {
    onDismiss();
    await clearOnboardingState();
    await signOut();
    router.replace("/(auth)/sign-in" as any);
  };

  const planBadgeColor =
    daysLeft <= 0 ? colors.status.error : daysLeft <= 3 ? "#F59E0B" : colors.accent[500];

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Dimmed backdrop — tap to close */}
        <TouchableWithoutFeedback onPress={onDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sliding drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { backgroundColor: isDark ? colors.surface.card : "#FFFFFF", transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* ── User header ─────────────────────────────────────────────── */}
          <View style={[styles.userHeader, { backgroundColor: colors.accent[500] }]}>
            <View style={styles.userAvatar}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accent[400] }]}>
                  <Ionicons name="person" size={28} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.fullName || user?.firstName || "User"}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Menu items ─────────────────────────────────────────────── */}
          <View style={styles.content}>
            <MenuItem
              icon="person-outline"
              title="Profile"
              onPress={() => { onDismiss(); router.push("/(root)/(tabs)/settings" as any); }}
              colors={colors}
            />
            <MenuItem
              icon="car-outline"
              title="My Vehicles"
              onPress={() => { onDismiss(); router.push("/(root)/(tabs)/vehicles" as any); }}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            {/* Plan card */}
            <View style={[styles.planCard, { backgroundColor: isDark ? colors.surface.light : colors.accent[50], borderColor: colors.accent[200] }]}>
              <View style={styles.planRow}>
                <Ionicons name="cube-outline" size={18} color={planBadgeColor} style={{ marginRight: 6 }} />
                <Text style={[styles.planLabel, { color: colors.text.secondary }]}>Current Plan</Text>
                <View style={[styles.planBadge, { backgroundColor: planBadgeColor + "20", borderColor: planBadgeColor }]}>
                  <Text style={[styles.planBadgeText, { color: planBadgeColor }]}>
                    {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                  </Text>
                </View>
              </View>
              <Text style={[styles.planName, { color: colors.text.primary }]}>
                {getPlan(currentPlan as PlanId).name}
              </Text>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: planBadgeColor }]}
                onPress={() => { onDismiss(); onShowUpgrade(); }}
              >
                <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.upgradeBtnText}>{upgradeLabel()}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            <MenuItem
              icon="card-outline"
              title="Billing & Payments"
              onPress={() => { onDismiss(); onShowBilling(); }}
              colors={colors}
            />
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              onPress={() => { onDismiss(); router.push("/(root)/(tabs)/alarm-log" as any); }}
              colors={colors}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              onPress={() => { onDismiss(); }}
              colors={colors}
            />

            <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />

            <MenuItem
              icon="log-out-outline"
              title="Sign Out"
              onPress={handleSignOut}
              colors={colors}
              textColor={colors.status.error}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MenuItem({ icon, title, onPress, colors, textColor }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={textColor || colors.text.secondary} style={styles.menuIcon} />
      <Text style={[styles.menuText, { color: textColor || colors.text.primary }]}>{title}</Text>
      {!textColor && (
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} style={{ marginLeft: "auto" }} />
      )}
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
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: "100%",
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowOffset: { width: 4, height: 0 },
    shadowRadius: 12,
  },
  // ── User header
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    gap: 12,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  userName: {
    fontSize: 16,
    fontFamily: "Jakarta-Bold",
    color: "#fff",
  },
  userEmail: {
    fontSize: 12,
    fontFamily: "Jakarta-Medium",
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  // ── Content
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuText: {
    fontSize: 15,
    fontFamily: "Jakarta-SemiBold",
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  // ── Plan card
  planCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 4,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  planLabel: {
    fontSize: 12,
    fontFamily: "Jakarta-Medium",
    flex: 1,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 11,
    fontFamily: "Jakarta-Bold",
  },
  planName: {
    fontSize: 18,
    fontFamily: "Jakarta-Bold",
    marginBottom: 12,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  upgradeBtnText: {
    color: "#fff",
    fontFamily: "Jakarta-Bold",
    fontSize: 14,
  },
});
