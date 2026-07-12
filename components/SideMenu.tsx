/**
 * components/SideMenu.tsx
 *
 * A smooth slide-in side drawer with full navigation links,
 * user profile, plan status, and sign-out.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getThemeColors } from "@/constants/theme";
import { clearOnboardingState } from "@/lib/onboarding";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

interface SideMenuProps {
  isVisible: boolean;
  onDismiss: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  isDark: boolean;
  colors: ReturnType<typeof getThemeColors>;
  badge?: number;
}

const NavItem = ({ icon, label, onPress, isDark, colors, badge }: NavItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.navItem,
      { backgroundColor: isDark ? "transparent" : "transparent" },
    ]}
    activeOpacity={0.65}
  >
    <View style={styles.navItemIcon}>{icon}</View>
    <Text style={[styles.navItemLabel, { color: isDark ? "#E2E8F0" : "#1E293B" }]}>
      {label}
    </Text>
    {badge != null && badge > 0 && (
      <View style={[styles.badge, { backgroundColor: colors.status.error }]}>
        <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={16} color={isDark ? "#64748B" : "#94A3B8"} />
  </TouchableOpacity>
);

const Divider = ({ isDark }: { isDark: boolean }) => (
  <View style={[styles.divider, { backgroundColor: isDark ? "#1E293B" : "#E2E8F0" }]} />
);

const SectionLabel = ({ label, isDark }: { label: string; isDark: boolean }) => (
  <Text style={[styles.sectionLabel, { color: isDark ? "#64748B" : "#94A3B8" }]}>
    {label.toUpperCase()}
  </Text>
);

const SideMenu: React.FC<SideMenuProps> = ({ isVisible, onDismiss }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();

  // Slide animation
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const navigate = (path: string) => {
    onDismiss();
    setTimeout(() => router.push(path as any), 100);
  };

  const handleSignOut = async () => {
    onDismiss();
    setTimeout(async () => {
      await clearOnboardingState();
      await signOut();
      router.replace("/(auth)/sign-in");
    }, 200);
  };

  const bg = isDark ? "#0F172A" : "#FFFFFF";
  const iconColor = colors.accent[400];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      {/* Drawer panel */}
      <Animated.View
        style={[
          styles.drawer,
          {
            width: DRAWER_WIDTH,
            backgroundColor: bg,
            transform: [{ translateX: slideAnim }],
            paddingTop: insets.top,
            paddingBottom: insets.bottom + 16,
            shadowColor: "#000",
            shadowOffset: { width: 4, height: 0 },
            shadowOpacity: isDark ? 0.5 : 0.15,
            shadowRadius: 16,
            elevation: 24,
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* ── User Profile Header ── */}
          <View style={[styles.profileHeader, { backgroundColor: isDark ? "#1E293B" : colors.accent[50] }]}>
            <View style={[styles.avatarWrap, { borderColor: colors.accent[300], backgroundColor: isDark ? "#334155" : colors.accent[100] }]}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
              ) : (
                <Ionicons name="person" size={30} color={iconColor} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.profileName, { color: isDark ? "#F1F5F9" : "#0F172A" }]} numberOfLines={1}>
                {user?.fullName || user?.firstName || "User"}
              </Text>
              <Text style={[styles.profileEmail, { color: isDark ? "#94A3B8" : "#64748B" }]} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress || ""}
              </Text>
            </View>
          </View>

          <View style={styles.navList}>
            {/* ── Main Navigation ── */}
            <SectionLabel label="Navigation" isDark={isDark} />

            <NavItem
              icon={<Ionicons name="home" size={20} color={iconColor} />}
              label="Dashboard"
              onPress={() => navigate("/(root)/(tabs)/home")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<MaterialCommunityIcons name="map-marker-radius" size={20} color={iconColor} />}
              label="Live Tracking"
              onPress={() => navigate("/(root)/(tabs)/tracking")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<Ionicons name="time" size={20} color={iconColor} />}
              label="History"
              onPress={() => navigate("/(root)/(tabs)/history")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<MaterialCommunityIcons name="console-line" size={20} color={iconColor} />}
              label="Commands"
              onPress={() => navigate("/(root)/(tabs)/command")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<Ionicons name="notifications" size={20} color={iconColor} />}
              label="Alerts Config"
              onPress={() => navigate("/(root)/(tabs)/alerts")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<Ionicons name="car" size={20} color={iconColor} />}
              label="Vehicles"
              onPress={() => navigate("/(root)/(tabs)/vehicles")}
              isDark={isDark}
              colors={colors}
            />

            <Divider isDark={isDark} />

            {/* ── Account ── */}
            <SectionLabel label="Account" isDark={isDark} />

            <NavItem
              icon={<Ionicons name="card" size={20} color={iconColor} />}
              label="Billing & Plan"
              onPress={() => navigate("/(onboarding)/billing")}
              isDark={isDark}
              colors={colors}
            />
            <NavItem
              icon={<Ionicons name="settings-outline" size={20} color={iconColor} />}
              label="Settings"
              onPress={() => navigate("/(root)/(tabs)/settings")}
              isDark={isDark}
              colors={colors}
            />

            <Divider isDark={isDark} />

            {/* ── Sign Out ── */}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={colors.status.error} />
              <Text style={[styles.signOutText, { color: colors.status.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* App version at bottom */}
        <Text style={[styles.version, { color: isDark ? "#334155" : "#CBD5E1" }]}>
          BYThron Track IQ v1.0.0
        </Text>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Jakarta-Bold",
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: "Jakarta-Medium",
  },
  navList: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Jakarta-SemiBold",
    letterSpacing: 1,
    paddingHorizontal: 8,
    marginBottom: 4,
    marginTop: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
    gap: 12,
  },
  navItemIcon: {
    width: 28,
    alignItems: "center",
  },
  navItemLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Jakarta-SemiBold",
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginRight: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Jakarta-Bold",
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 8,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Jakarta-SemiBold",
  },
  version: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Jakarta-Medium",
    marginTop: 8,
  },
});

export default SideMenu;
