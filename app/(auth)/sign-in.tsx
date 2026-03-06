import { useSignIn, useAuth } from "@clerk/clerk-expo";
import { router, Redirect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { getThemeColors } from "@/constants/theme";
import { icons, images } from "@/constants";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  const onSignInPress = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const signInAttempt = await signIn.create({
        identifier: form.email,
        password: form.password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(root)/(tabs)/home");
      } else if (signInAttempt.status === "needs_second_factor") {
        const emailCodeFactor = signInAttempt.supportedSecondFactors?.find(
          (factor: any) => factor.strategy === "email_code"
        );
        if (emailCodeFactor) {
          await signInAttempt.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: emailCodeFactor.emailAddressId,
          });
          setPendingVerification(true);
          Alert.alert(
            "Verification Required",
            `A verification code has been sent to ${emailCodeFactor.safeIdentifier}`
          );
        }
      } else {
        console.log(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Log in failed. Please try again.");
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors[0].longMessage);
    }
  }, [isLoaded, form]);

  const onVerifyPress = useCallback(async () => {
    if (!isLoaded) return;
    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });

      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/(root)/(tabs)/home");
      } else {
        console.log(JSON.stringify(signInAttempt, null, 2));
        Alert.alert("Error", "Verification failed. Please try again.");
      }
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors?.[0]?.longMessage || "Verification failed");
    }
  }, [isLoaded, code]);

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.surface.light }]}>
      <View style={[styles.container, { backgroundColor: colors.surface.light }]}>
        <View style={styles.hero}>
          <Image source={images.signUpCar} style={styles.heroImage} resizeMode="cover" />
          <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
            Welcome 👋
          </Text>
        </View>

        <View style={styles.form}>
          {!pendingVerification ? (
            <>
              <InputField
                label="Email"
                placeholder="Enter email"
                icon={icons.email}
                textContentType="emailAddress"
                value={form.email}
                onChangeText={(value) => setForm({ ...form, email: value })}
              />

              <InputField
                label="Password"
                placeholder="Enter password"
                icon={icons.lock}
                secureTextEntry={true}
                textContentType="password"
                value={form.password}
                onChangeText={(value) => setForm({ ...form, password: value })}
              />

              <CustomButton title="Sign In" onPress={onSignInPress} className="mt-6" />

              <OAuth />

              <View style={styles.linkWrap}>
                <Text style={[styles.linkText, { color: colors.text.secondary }]}>
                  Don't have an account?{" "}
                </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
                  <Text style={[styles.linkAccent, { color: colors.accent[400] }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.verifyTitle, { color: colors.text.primary }]}>
                Verify Your Email
              </Text>
              <Text style={[styles.verifySubtitle, { color: colors.text.secondary }]}>
                Enter the verification code sent to your email
              </Text>

              <InputField
                label="Verification Code"
                placeholder="Enter code"
                icon={icons.lock}
                value={code}
                keyboardType="number-pad"
                onChangeText={setCode}
              />

              <CustomButton title="Verify Email" onPress={onVerifyPress} className="mt-6" />

              <CustomButton
                title="Back to Sign In"
                onPress={() => {
                  setPendingVerification(false);
                  setCode("");
                }}
                className="mt-2"
                bgVariant="outline"
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

function createStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    hero: {
      position: "relative",
      width: "100%",
      height: 250,
    },
    heroImage: {
      position: "absolute",
      zIndex: 0,
      width: "100%",
      height: 250,
    },
    heroTitle: {
      position: "absolute",
      bottom: 20,
      left: 20,
      fontSize: 24,
      fontFamily: "Jakarta-SemiBold",
    },
    form: {
      padding: 20,
    },
    linkWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 40,
    },
    linkText: {
      fontSize: 18,
      fontFamily: "Jakarta-Medium",
    },
    linkAccent: {
      fontSize: 18,
      fontFamily: "Jakarta-SemiBold",
    },
    verifyTitle: {
      fontSize: 24,
      fontFamily: "Jakarta-Bold",
      marginBottom: 8,
    },
    verifySubtitle: {
      fontSize: 16,
      fontFamily: "Jakarta-Medium",
      marginBottom: 20,
    },
  });
}

export default SignIn;
