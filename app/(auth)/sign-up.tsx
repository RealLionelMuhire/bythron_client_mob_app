import { useSignUp, useAuth } from "@clerk/clerk-expo";
import { router, Redirect } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ReactNativeModal } from "react-native-modal";
import { useColorScheme } from "nativewind";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { getThemeColors } from "@/constants/theme";
import { icons, images } from "@/constants";
import { fetchAPI } from "@/lib/fetch";

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [verification, setVerification] = useState({
    state: "default",
    error: "",
    code: "",
  });

  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    try {
      await signUp.create({
        emailAddress: form.email,
        password: form.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerification({ ...verification, state: "pending" });
    } catch (err: any) {
      console.log(JSON.stringify(err, null, 2));
      Alert.alert("Error", err.errors[0].longMessage);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verification.code,
      });
      if (completeSignUp.status === "complete") {
        await fetchAPI("/(api)/user", {
          method: "POST",
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            clerkId: completeSignUp.createdUserId,
          }),
        });
        await setActive({ session: completeSignUp.createdSessionId });
        setVerification({ ...verification, state: "success" });
      } else {
        setVerification({
          ...verification,
          error: "Verification failed. Please try again.",
          state: "failed",
        });
      }
    } catch (err: any) {
      setVerification({
        ...verification,
        error: err.errors[0]?.longMessage ?? "Verification failed",
        state: "failed",
      });
    }
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: colors.surface.light }]}>
      <View style={[styles.container, { backgroundColor: colors.surface.light }]}>
        <View style={styles.hero}>
          <Image source={images.signUpCar} style={styles.heroImage} resizeMode="cover" />
          <Text style={[styles.heroTitle, { color: colors.text.primary }]}>
            Create Your Account
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Name"
            placeholder="Enter name"
            icon={icons.person}
            value={form.name}
            onChangeText={(value) => setForm({ ...form, name: value })}
          />
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
          <CustomButton title="Sign Up" onPress={onSignUpPress} className="mt-6" />
          <OAuth />

          <View style={styles.linkWrap}>
            <Text style={[styles.linkText, { color: colors.text.secondary }]}>
              Already have an account?{" "}
            </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={[styles.linkAccent, { color: colors.accent[400] }]}>
                Log In
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ReactNativeModal
          isVisible={verification.state === "pending"}
          onModalHide={() => {
            if (verification.state === "success") setShowSuccessModal(true);
          }}
        >
          <View style={[styles.modal, { backgroundColor: colors.surface.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              Verification
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              We've sent a verification code to {form.email}.
            </Text>
            <InputField
              label="Code"
              icon={icons.lock}
              placeholder="12345"
              value={verification.code}
              keyboardType="numeric"
              onChangeText={(code) =>
                setVerification({ ...verification, code })
              }
            />
            {verification.error ? (
              <Text style={[styles.errorText, { color: colors.status.error }]}>
                {verification.error}
              </Text>
            ) : null}
            <CustomButton
              title="Verify Email"
              onPress={onPressVerify}
              className="mt-5"
              bgVariant="success"
            />
          </View>
        </ReactNativeModal>

        <ReactNativeModal isVisible={showSuccessModal}>
          <View style={[styles.modal, { backgroundColor: colors.surface.card }]}>
            <Image source={images.check} style={styles.successImage} />
            <Text style={[styles.successTitle, { color: colors.text.primary }]}>
              Verified
            </Text>
            <Text style={[styles.successSubtitle, { color: colors.text.secondary }]}>
              You have successfully verified your account.
            </Text>
            <CustomButton
              title="Browse Home"
              onPress={() => router.push("/(root)/(tabs)/home")}
              className="mt-5"
            />
          </View>
        </ReactNativeModal>
      </View>
    </ScrollView>
  );
};

function createStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    container: { flex: 1 },
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
    form: { padding: 20 },
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
    modal: {
      paddingHorizontal: 28,
      paddingVertical: 36,
      borderRadius: 16,
      minHeight: 300,
      borderWidth: 1,
      borderColor: colors.surface.border,
    },
    modalTitle: {
      fontSize: 24,
      fontFamily: "Jakarta-ExtraBold",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 16,
      fontFamily: "Jakarta-Medium",
      marginBottom: 20,
    },
    errorText: {
      fontSize: 14,
      marginTop: 4,
    },
    successImage: {
      width: 110,
      height: 110,
      alignSelf: "center",
      marginVertical: 20,
    },
    successTitle: {
      fontSize: 28,
      fontFamily: "Jakarta-Bold",
      textAlign: "center",
    },
    successSubtitle: {
      fontSize: 16,
      fontFamily: "Jakarta-Medium",
      textAlign: "center",
      marginTop: 8,
    },
  });
}

export default SignUp;
