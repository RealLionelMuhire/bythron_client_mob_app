import { useOAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { icons } from "@/constants";
import { googleOAuth } from "@/lib/auth";

const OAuth = () => {
  const { colorScheme } = useColorScheme();
  const colors = getThemeColors(colorScheme === "dark" ? "dark" : "light");
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const handleGoogleSignIn = async () => {
    const result = await googleOAuth(startOAuthFlow);

    if (result.code === "session_exists") {
      Alert.alert("Success", "Session exists. Redirecting to home screen.");
      router.replace("/(root)/(tabs)/home");
      return;
    }

    if (result.success) {
      Alert.alert("Success", result.message);
      router.replace("/(root)/(tabs)/home");
    } else {
      Alert.alert("Error", result.message);
    }
  };

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />
        <Text style={[styles.dividerText, { color: colors.text.muted }]}>Or</Text>
        <View style={[styles.divider, { backgroundColor: colors.surface.border }]} />
      </View>

      <CustomButton
        title="Log In with Google"
        className="mt-5 w-full shadow-none"
        IconLeft={() => (
          <Image
            source={icons.google}
            resizeMode="contain"
            className="w-5 h-5 mx-2"
          />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 18,
    fontFamily: "Jakarta-Medium",
  },
});

export default OAuth;
