import { useSignIn } from "@clerk/clerk-expo";
import { Link, router, Redirect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import { useAuth } from "@clerk/clerk-expo";

import CustomButton from "@/components/CustomButton";
import InputField from "@/components/InputField";
import OAuth from "@/components/OAuth";
import { icons, images } from "@/constants";

const SignIn = () => {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();

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
        // Two-factor authentication is required
        // Prepare the email code to be sent
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
        // See https://clerk.com/docs/custom-flows/error-handling for more info on error handling
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

  // Redirect if already signed in (after all hooks)
  if (isSignedIn) {
    return <Redirect href="/(root)/(tabs)/home" />;
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-slate-900">
      <View className="flex-1 bg-white dark:bg-slate-900">
        <View className="relative w-full h-[250px]">
          <Image source={images.signUpCar} className="z-0 w-full h-[250px]" resizeMode="cover" />
          <Text className="text-2xl text-black dark:text-white font-JakartaSemiBold absolute bottom-5 left-5">
            Welcome 👋
          </Text>
        </View>

        <View className="p-5">
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

              <CustomButton
                title="Sign In"
                onPress={onSignInPress}
                className="mt-6"
              />

              <OAuth />

              <Link
                href="/sign-up"
                className="text-lg text-center text-slate-600 dark:text-slate-400 mt-10"
              >
                Don't have an account?{" "}
                <Text className="text-accent-500">Sign Up</Text>
              </Link>
            </>
          ) : (
            <>
              <Text className="text-2xl font-JakartaBold mb-2 text-slate-900 dark:text-slate-100">
                Verify Your Email
              </Text>
              <Text className="text-base text-slate-600 dark:text-slate-400 mb-5">
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

              <CustomButton
                title="Verify Email"
                onPress={onVerifyPress}
                className="mt-6"
              />

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

export default SignIn;
