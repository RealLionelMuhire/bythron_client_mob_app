import { useMemo, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Settings = () => {
  const alarmItems = useMemo(
    () => [
      "SOS alarm",
      "Vibrator alarm",
      "Offline alarm",
      "Low Power",
      "Off alarm",
      "Enter the area alarm",
      "Leave the area alarm",
      "Expired alarm",
      "Overspeed alarm",
      "Displacement alarm",
    ],
    []
  );

  const alertItems = useMemo(
    () => ["Enable", "Sound", "Vibration"],
    []
  );

  const [alarmSettings, setAlarmSettings] = useState(() =>
    Object.fromEntries(alarmItems.map((item) => [item, true]))
  );

  const [alertSettings, setAlertSettings] = useState(() =>
    Object.fromEntries(alertItems.map((item) => [item, false]))
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F7FAFF" }}>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
      >
        <Text className="text-2xl font-JakartaBold my-5">Settings</Text>

        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4 mb-6">
          <Text className="text-lg font-JakartaBold mb-4">Alarm setting</Text>
          <Text className="text-base font-JakartaMedium text-gray-500 mb-3">
            Alarm Types
          </Text>

          {alarmItems.map((item) => (
            <View
              key={item}
              className="flex-row items-center justify-between py-3 border-b border-neutral-100"
            >
              <Text className="text-base font-JakartaMedium text-slate-700">
                {item}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-xs font-JakartaBold text-gray-400 mr-2">
                  {alarmSettings[item] ? "ON" : "OFF"}
                </Text>
                <Switch
                  value={alarmSettings[item]}
                  onValueChange={(value) =>
                    setAlarmSettings((prev) => ({ ...prev, [item]: value }))
                  }
                  trackColor={{ false: "#CBD5E1", true: "#5BB8E8" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ))}
        </View>

        <View className="bg-white rounded-2xl shadow-sm shadow-neutral-300 px-5 py-4">
          <Text className="text-lg font-JakartaBold mb-4">Alert Settings</Text>

          {alertItems.map((item) => (
            <View
              key={item}
              className="flex-row items-center justify-between py-3 border-b border-neutral-100"
            >
              <Text className="text-base font-JakartaMedium text-slate-700">
                {item}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-xs font-JakartaBold text-gray-400 mr-2">
                  {alertSettings[item] ? "ON" : "OFF"}
                </Text>
                <Switch
                  value={alertSettings[item]}
                  onValueChange={(value) =>
                    setAlertSettings((prev) => ({ ...prev, [item]: value }))
                  }
                  trackColor={{ false: "#CBD5E1", true: "#5BB8E8" }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
