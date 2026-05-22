/**
 * ErrorBoundary.tsx
 *
 * Catches any unhandled JS errors in the React tree and shows a friendly
 * recovery screen instead of a blank white crash.
 *
 * Usage (in app/_layout.tsx):
 *   import { AppErrorBoundary } from "@/components/ErrorBoundary";
 *   <AppErrorBoundary><Slot /></AppErrorBoundary>
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console in dev; swap for a crash reporter (Sentry etc.) in prod
    console.error("[ErrorBoundary] Caught error:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="warning-outline" size={56} color="#EF4444" />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message} numberOfLines={4}>
          {this.state.message}
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReload}>
          <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1E293B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F1F5F9",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
