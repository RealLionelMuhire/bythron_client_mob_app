import React, { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { PayWithFlutterwave } from "flutterwave-react-native";
import type { RedirectParams } from "flutterwave-react-native/dist/PayWithFlutterwave";
import { useUser } from "@clerk/clerk-expo";
import { getThemeColors } from "@/constants/theme";
import { useColorScheme } from "nativewind";

export interface FlutterwavePaymentProps {
  isVisible: boolean;
  planId: string;
  amount: number;
  onSuccess: (txRef: string) => void;
  onFail: (msg: string) => void;
  onCancel: () => void;
}

export default function FlutterwavePayment({
  isVisible,
  planId,
  amount,
  onSuccess,
  onFail,
  onCancel,
}: FlutterwavePaymentProps) {
  const { user } = useUser();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");

  if (!isVisible) return null;

  const flwPublicKey = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ?? "";
  if (!flwPublicKey) {
    console.warn("EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY is not set.");
    // In dev, we might immediately succeed or fail if the key is missing.
    // For now, we render nothing or fail.
  }

  const txRef = `gps-${user?.id ?? "u"}-${Date.now()}`;
  const userPhone = user?.primaryPhoneNumber?.phoneNumber ?? "";
  const userName = user?.fullName ?? user?.firstName ?? "Customer";
  const userEmail = `${(userPhone.replace(/\+/g, "") || "user")}@gps.trackiq.app`;

  const handleRedirect = (data: RedirectParams) => {
    if (data.status === "successful" && data.transaction_id) {
      onSuccess(data.tx_ref);
    } else if (data.status === "cancelled") {
      onCancel();
    } else {
      onFail("Payment failed. Try again.");
    }
  };

  return (
    <PayWithFlutterwave
      onRedirect={handleRedirect}
      onAbort={onCancel}
      options={{
        tx_ref: txRef,
        authorization: flwPublicKey,
        customer: {
          email: userEmail,
          phonenumber: userPhone,
          name: userName,
        },
        amount,
        currency: "RWF",
        payment_options: "mobilemoney,card",
        meta: [{ metaname: "planId", metavalue: planId }],
      }}
      customButton={({ disabled, onPress }) => {
        // Auto-open the payment sheet as soon as the SDK is ready
        if (!disabled) {
          setTimeout(onPress, 0);
        }
        return (
          <View style={[styles.fwLoadingBox, { borderColor: colors.surface.border }]}>
            <ActivityIndicator color={colors.accent[500]} />
            <Text style={[styles.fwLoadingText, { color: colors.text.muted }]}>
              {disabled ? "Initializing payment…" : "Opening payment sheet…"}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
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
});
