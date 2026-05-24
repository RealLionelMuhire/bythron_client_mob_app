/**
 * app/(onboarding)/_layout.tsx
 *
 * Protected layout for the onboarding flow.
 * Requires an active Clerk session — unauthenticated users
 * are redirected to sign-up.
 */

import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Slot } from "expo-router";

export default function OnboardingLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-up" />;
  }

  return <Slot />;
}
