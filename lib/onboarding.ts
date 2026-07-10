/**
 * lib/onboarding.ts
 *
 * Persistent onboarding state helpers using expo-secure-store.
 *
 * Steps:
 *  0  = not started / just signed up
 *  4  = profile saved to backend
 *  5  = device paired
 *  6  = device signal confirmed
 *  7  = vehicle registered
 *  8  = plan selected  (onboarding complete)
 */

import * as SecureStore from "expo-secure-store";

const KEY_STEP = "onboarding_step";
const KEY_DONE = "onboarding_complete";
const KEY_IMEI = "paired_imei";
const KEY_PHONE = "signup_phone";
const KEY_NAME = "signup_name";
const KEY_CURRENT_PLAN = "current_plan";
const KEY_PLAN_EXPIRES_AT = "plan_expires_at";

// ── Step ──────────────────────────────────────────────────────────────────

export async function getOnboardingStep(): Promise<number> {
  try {
    const raw = await SecureStore.getItemAsync(KEY_STEP);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export async function setOnboardingStep(step: number): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_STEP, String(step));
  } catch { }
}

// ── Complete flag ─────────────────────────────────────────────────────────

export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(KEY_DONE);
    return raw === "true";
  } catch {
    return false;
  }
}

export async function setOnboardingComplete(done: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_DONE, done ? "true" : "false");
  } catch { }
}

// ── Paired IMEI ───────────────────────────────────────────────────────────

export async function getPairedImei(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_IMEI);
  } catch {
    return null;
  }
}

export async function setPairedImei(imei: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_IMEI, imei);
  } catch { }
}

// ── Temp sign-up data (passed between sign-up → otp screens) ─────────────

export async function getSignupPhone(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_PHONE);
  } catch {
    return null;
  }
}

export async function setSignupPhone(phone: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_PHONE, phone);
  } catch { }
}

export async function getSignupName(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_NAME);
  } catch {
    return null;
  }
}

export async function setSignupName(name: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_NAME, name);
  } catch { }
}

// ── Full reset (on sign-out) ──────────────────────────────────────────────

export async function setCurrentPlan(planId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_CURRENT_PLAN, planId);
  } catch { }
}

export async function getPlanExpiresAt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_PLAN_EXPIRES_AT);
  } catch {
    return null;
  }
}

export async function setPlanExpiresAt(expiresAt: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_PLAN_EXPIRES_AT, expiresAt);
  } catch { }
}

// ── Full reset (on sign-out) ──────────────────────────────────────────────

export async function clearOnboardingState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY_STEP);
    await SecureStore.deleteItemAsync(KEY_DONE);
    await SecureStore.deleteItemAsync(KEY_IMEI);
    await SecureStore.deleteItemAsync(KEY_PHONE);
    await SecureStore.deleteItemAsync(KEY_NAME);
    await SecureStore.deleteItemAsync(KEY_CURRENT_PLAN);
    await SecureStore.deleteItemAsync(KEY_PLAN_EXPIRES_AT);
  } catch { }
}

// ── Route helper ──────────────────────────────────────────────────────────

export function stepToRoute(step: number): string {
  switch (step) {
    case 4: return "/(onboarding)/profile-save";
    case 5: return "/(onboarding)/device-pair";
    case 6: return "/(onboarding)/device-wait";
    case 7: return "/(onboarding)/vehicle";
    case 8:
    default: return "/(onboarding)/plan";
  }
}
