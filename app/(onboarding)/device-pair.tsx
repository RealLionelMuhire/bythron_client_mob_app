/**
 * app/(onboarding)/device-pair.tsx  — Step 5
 *
 * Pairs a GPS device by IMEI — manual entry or QR scan.
 *
 * QR flow:
 *   Tap "Scan QR code" → navigate to /(onboarding)/qr-scanner
 *   qr-scanner navigates back here with ?scannedImei=XXXXXXXXXXXXXXX
 *   useLocalSearchParams picks it up → auto-triggers pairing
 *
 * On success: saves IMEI + advances step → device-wait.
 */

import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { setPairedImei, setOnboardingStep } from "@/lib/onboarding";

export default function DevicePair() {
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // QR scanner returns here with scannedImei and scannedPin query params
  const { scannedImei, scannedPin } = useLocalSearchParams<{ scannedImei?: string, scannedPin?: string }>();

  const [imei, setImei]               = useState("");
  const [pairingPin, setPairingPin]   = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [focused, setFocused]         = useState(false);
  const [pinFocused, setPinFocused]   = useState(false);

  // When a scanned IMEI arrives, pre-fill both IMEI and PIN (if available)
  useEffect(() => {
    if (scannedImei && /^\d{15,16}$/.test(scannedImei)) {
      setImei(scannedImei);
      if (scannedPin) {
        setPairingPin(scannedPin);
      } else {
        setPairingPin("");
      }
      setError(null);
    }
  }, [scannedImei, scannedPin]);

  const pairDevice = async (imeiValue: string, pin: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      await fetchAPI("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imei: imeiValue,
          pairingPin: pin.trim().toUpperCase() || undefined,
        }),
      });

      await setPairedImei(imeiValue);
      await setOnboardingStep(6);
      router.replace("/(onboarding)/device-wait" as any);
    } catch (err: any) {
      const raw: string = err?.message ?? "";
      let msg = "Pairing failed. Check your IMEI and retry.";
      if (raw.includes("404")) msg = "Device not found. Check your IMEI and retry.";
      else if (raw.includes("403")) msg = "Incorrect Pairing PIN. Check the card inside the box.";
      else if (raw.includes("409")) msg = raw.includes("not yet connected")
        ? "Device has not connected to the server yet. Power it on with the SIM inserted first."
        : "Device already registered to another account.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const onPairDevice = () => {
    const trimmed = imei.trim();
    if (!/^\d{15,16}$/.test(trimmed)) {
      setError("Please enter a valid 15 or 16-digit IMEI number.");
      return;
    }
    pairDevice(trimmed, pairingPin);
  };

  const onScanQr = () => {
    setError(null);
    router.push("/(onboarding)/qr-scanner" as any);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.light }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ── Progress ── */}
          <View style={styles.progressRow}>
            {[4, 5, 6, 7, 8].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  { backgroundColor: s === 5 ? colors.accent[500] : colors.surface.border },
                ]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent[500] + "18" }]}>
              <Text style={styles.iconEmoji}>📡</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Connect your GPS device
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Scan the QR code on your device or enter the IMEI manually
            </Text>
          </View>

          {/* QR scan button */}
          <TouchableOpacity
            style={[
              styles.qrButton,
              { borderColor: colors.accent[500], backgroundColor: colors.accent[500] + "10" },
            ]}
            onPress={onScanQr}
            activeOpacity={0.75}
          >
            <Text style={styles.qrIcon}>📷</Text>
            <Text style={[styles.qrText, { color: colors.accent[500] }]}>Scan QR code</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.surface.border }]} />
            <Text style={[styles.dividerLabel, { color: colors.text.muted }]}>or enter manually</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.surface.border }]} />
          </View>

          {/* IMEI input */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Device IMEI</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                  borderColor: focused ? colors.accent[500] : colors.surface.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="e.g. 358765012345678"
                placeholderTextColor={colors.text.muted}
                keyboardType="number-pad"
                maxLength={16}
                value={imei}
                onChangeText={(v) => {
                  setImei(v.replace(/[^0-9]/g, ""));
                  setError(null);
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="next"
                editable={!isLoading}
              />
              {imei.length > 0 && (
                <Text
                  style={[
                    styles.counter,
                    { color: (imei.length === 15 || imei.length === 16) ? colors.accent[500] : colors.text.muted },
                  ]}
                >
                  {imei.length}/15-16
                </Text>
              )}
            </View>
            <Text style={[styles.hint, { color: colors.text.muted }]}>
              Find the IMEI printed on the device label or packaging
            </Text>
          </View>

          {/* Pairing PIN input */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: colors.text.secondary }]}>Pairing PIN</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                  borderColor: pinFocused ? colors.accent[500] : colors.surface.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="e.g. AB3X9K"
                placeholderTextColor={colors.text.muted}
                autoCapitalize="characters"
                maxLength={8}
                value={pairingPin}
                onChangeText={(v) => {
                  setPairingPin(v.toUpperCase());
                  setError(null);
                }}
                onFocus={() => setPinFocused(true)}
                onBlur={() => setPinFocused(false)}
                returnKeyType="done"
                onSubmitEditing={onPairDevice}
                editable={!isLoading}
              />
            </View>
            <Text style={[styles.hint, { color: colors.text.muted }]}>
              6-character PIN printed on the card inside the device box
            </Text>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: colors.status.error + "18", borderColor: colors.status.error },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <CustomButton
            title={isLoading ? "Pairing…" : "Pair device"}
            onPress={onPairDevice}
            className="mt-4"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe:   { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    progressRow: {
      flexDirection: "row",
      gap: 8,
      paddingTop: 20,
      marginBottom: 4,
      justifyContent: "center",
    },
    progressDot: { width: 32, height: 4, borderRadius: 2 },
    headerBlock: { alignItems: "center", marginTop: 24, marginBottom: 28 },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconEmoji: { fontSize: 36 },
    title:    { fontSize: 24, fontFamily: "Jakarta-Bold",   textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: "Jakarta-Medium", textAlign: "center", lineHeight: 20 },
    qrButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderRadius: 14,
      height: 54,
      gap: 10,
      marginBottom: 20,
    },
    qrIcon:     { fontSize: 22 },
    qrText:     { fontSize: 16, fontFamily: "Jakarta-SemiBold" },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
    dividerLine:  { flex: 1, height: 1 },
    dividerLabel: { fontSize: 12, fontFamily: "Jakarta-Medium" },
    fieldWrap:  { marginBottom: 16 },
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
    input:   { flex: 1, fontSize: 16, fontFamily: "Jakarta-Medium", paddingVertical: 0 },
    counter: { fontSize: 12, fontFamily: "Jakarta-SemiBold" },
    hint:    { fontSize: 12, fontFamily: "Jakarta-Medium", marginTop: 6 },
    errorBox: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 4,
    },
    errorText: { fontSize: 13, fontFamily: "Jakarta-Medium" },
  });
}
