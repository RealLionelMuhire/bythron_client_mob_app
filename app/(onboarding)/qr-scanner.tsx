/**
 * app/(onboarding)/qr-scanner.tsx
 *
 * Full-screen QR code scanner powered by expo-camera.
 *
 * Reads any QR code, validates it contains a 15-digit IMEI,
 * then navigates back to device-pair with the IMEI pre-filled.
 *
 * QR format expected from hardware team:
 *   Plain 15-digit string — e.g. "354851090123456"
 *   No JSON, no prefix, no URL.
 */

import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QrScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Guard: request permission if not yet granted
  if (!permission) {
    // Loading permission state
    return <View style={styles.dark} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <Text style={styles.permText}>📷</Text>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          Grant camera permission to scan your GPS device's QR code.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Enter IMEI manually instead</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return; // prevent multiple triggers

    const rawValue = data?.trim() ?? "";

    // Validate: must be exactly 15 digits
    if (!/^\d{15}$/.test(rawValue)) {
      setError(`Invalid QR code. Expected a 15-digit IMEI, got: "${rawValue.slice(0, 20)}"`);
      return;
    }

    setScanned(true);
    Vibration.vibrate(120); // haptic confirmation

    // Route back with IMEI as query param
    router.replace({
      pathname: "/(onboarding)/device-pair" as any,
      params: { scannedImei: rawValue },
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />

      {/* ── Dark overlay with cutout ── */}
      <View style={styles.overlay}>
        {/* Top curtain */}
        <View style={[styles.curtain, { flex: 1 }]} />

        {/* Middle row: side curtains + finder box */}
        <View style={styles.middleRow}>
          <View style={[styles.curtain, { flex: 1 }]} />

          {/* Finder frame */}
          <View style={styles.finder}>
            {/* Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <View style={[styles.curtain, { flex: 1 }]} />
        </View>

        {/* Bottom curtain */}
        <View style={[styles.curtain, { flex: 1.5 }]}>
          <Text style={styles.instruction}>
            Point at the QR code on your GPS device
          </Text>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={() => setError(null)}
                style={styles.retryBtn}
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Close button ── */}
      <SafeAreaView style={styles.closeWrap}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕  Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const FINDER_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_W    = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  dark:      { flex: 1, backgroundColor: "#000" },
  center:    { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },

  // ── Permission screen
  permText:    { fontSize: 52, marginBottom: 8 },
  permTitle:   { color: "#fff", fontSize: 22, fontFamily: "Jakarta-Bold", textAlign: "center" },
  permSub:     { color: "#aaa", fontSize: 14, fontFamily: "Jakarta-Medium", textAlign: "center", lineHeight: 20 },
  permBtn:     { backgroundColor: "#0286FF", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  permBtnText: { color: "#fff", fontFamily: "Jakarta-Bold", fontSize: 16 },
  cancelLink:  { marginTop: 12 },
  cancelLinkText: { color: "#0286FF", fontFamily: "Jakarta-SemiBold", fontSize: 14 },

  // ── Overlay
  overlay:   { ...StyleSheet.absoluteFillObject },
  curtain:   { backgroundColor: "rgba(0,0,0,0.62)" },
  middleRow: { flexDirection: "row", height: FINDER_SIZE },

  // ── Finder frame
  finder: {
    width:  FINDER_SIZE,
    height: FINDER_SIZE,
    // transparent centre — no background
  },
  corner: {
    position:   "absolute",
    width:       CORNER_SIZE,
    height:      CORNER_SIZE,
    borderColor: "#0286FF",
  },
  cornerTL: { top: 0, left: 0,    borderTopWidth: CORNER_W, borderLeftWidth:  CORNER_W },
  cornerTR: { top: 0, right: 0,   borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth:  CORNER_W },
  cornerBR: { bottom: 0, right: 0,borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },

  // ── Instruction + error
  instruction: {
    color: "#fff",
    fontFamily: "Jakarta-SemiBold",
    fontSize: 15,
    textAlign: "center",
    marginTop: 28,
    paddingHorizontal: 32,
  },
  errorBox: {
    backgroundColor: "#EF444430",
    borderColor:     "#EF4444",
    borderWidth: 1,
    borderRadius: 12,
    margin: 24,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  errorText:  { color: "#FCA5A5", fontFamily: "Jakarta-Medium", fontSize: 13, textAlign: "center" },
  retryBtn:   { backgroundColor: "#0286FF", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText:  { color: "#fff", fontFamily: "Jakarta-Bold", fontSize: 14 },

  // ── Close button
  closeWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  closeBtn:  { marginTop: 8, marginLeft: 16, alignSelf: "flex-start", padding: 10 },
  closeText: { color: "#fff", fontFamily: "Jakarta-SemiBold", fontSize: 15 },
});
