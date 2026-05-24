/**
 * app/(onboarding)/vehicle.tsx  — Step 7
 *
 * Registers the first vehicle: nickname, plate, make, model,
 * linked to the device IMEI paired in step 5.
 */

import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { fetchAPI } from "@/lib/fetch";
import { getPairedImei, setOnboardingStep } from "@/lib/onboarding";

type Field = "nickname" | "plate" | "make" | "model";

const FIELDS: { key: Field; label: string; hint: string; capitalize: "none" | "words" | "sentences" | "characters" }[] = [
  { key: "nickname", label: "Vehicle Nickname",  hint: "e.g. Office Car",  capitalize: "words" },
  { key: "plate",    label: "Number Plate",       hint: "e.g. RAC 123 A",  capitalize: "characters" },
  { key: "make",     label: "Make",               hint: "e.g. Toyota",     capitalize: "words" },
  { key: "model",    label: "Model",              hint: "e.g. Hilux",      capitalize: "words" },
];

export default function Vehicle() {
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [form, setForm] = useState<Record<Field, string>>({
    nickname: "",
    plate:    "",
    make:     "",
    model:    "",
  });
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [focused, setFocused]       = useState<string | null>(null);

  const onSave = async () => {
    for (const { key, label } of FIELDS) {
      if (!form[key].trim()) {
        setError(`Please fill in the ${label} field.`);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const imei  = await getPairedImei();

      await fetchAPI("/api/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname:   form.nickname.trim(),
          plate:      form.plate.trim().toUpperCase(),
          make:       form.make.trim(),
          model:      form.model.trim(),
          deviceImei: imei,
        }),
      });

      await setOnboardingStep(8);
      router.replace("/(onboarding)/plan" as any);
    } catch (err: any) {
      setError(err.message ?? "Could not save vehicle. Please retry.");
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.progressRow}>
            {[4, 5, 6, 7, 8].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  { backgroundColor: s <= 7 ? colors.accent[500] : colors.surface.border },
                ]}
              />
            ))}
          </View>

          {/* Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent[500] + "18" }]}>
              <Text style={styles.iconEmoji}>🚗</Text>
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>
              Register your vehicle
            </Text>
            <Text style={[styles.subtitle, { color: colors.text.muted }]}>
              Add details about the vehicle attached to your GPS device
            </Text>
          </View>

          {/* Form fields */}
          {FIELDS.map(({ key, label, hint, capitalize }, i) => (
            <View key={key} style={styles.fieldWrap}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>{label}</Text>
              <View
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: isDark ? colors.surface.card : "#F0F6FF",
                    borderColor: focused === key ? colors.accent[500] : colors.surface.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.text.primary }]}
                  placeholder={hint}
                  placeholderTextColor={colors.text.muted}
                  autoCapitalize={capitalize}
                  value={form[key]}
                  onChangeText={(v) => {
                    setForm({ ...form, [key]: v });
                    setError(null);
                  }}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused(null)}
                  returnKeyType={i < FIELDS.length - 1 ? "next" : "done"}
                  onSubmitEditing={i === FIELDS.length - 1 ? onSave : undefined}
                />
              </View>
            </View>
          ))}

          {/* Error */}
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.status.error + "18", borderColor: colors.status.error }]}>
              <Text style={[styles.errorText, { color: colors.status.error }]}>{error}</Text>
            </View>
          ) : null}

          <CustomButton
            title={isLoading ? "Saving…" : "Save vehicle"}
            onPress={onSave}
            className="mt-4"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof getThemeColors>, isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1 },
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
    title: { fontSize: 24, fontFamily: "Jakarta-Bold", textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 14, fontFamily: "Jakarta-Medium", textAlign: "center", lineHeight: 20 },
    fieldWrap: { marginBottom: 16 },
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
