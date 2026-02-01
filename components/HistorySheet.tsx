import React, { useState } from "react";
import { Text, View, TouchableOpacity, ScrollView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";

import { fetchHistoricalRoute } from "@/lib/liveTracking";
import { useDeviceStore } from "@/store";
import { icons } from "@/constants";

interface HistorySheetProps {
    deviceId: number;
    onClose: () => void;
}

const HistorySheet = ({ deviceId, onClose }: HistorySheetProps) => {
    const { setHistoricalRoute } = useDeviceStore();

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchRoute = async () => {
        setLoading(true);
        setError(null);
        try {
            // Set start time to beginning of selected day
            const startTime = new Date(date);
            startTime.setHours(0, 0, 0, 0);

            // Set end time to end of selected day
            const endTime = new Date(date);
            endTime.setHours(23, 59, 59, 999);

            const routeData = await fetchHistoricalRoute(
                deviceId,
                startTime.toISOString(),
                endTime.toISOString()
            );

            setHistoricalRoute({
                device_id: deviceId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                route: routeData,
            });

            onClose();
        } catch (err) {
            setError("Failed to load route history");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="p-5 bg-white h-full">
            <View className="flex flex-row justify-between items-center mb-5">
                <Text className="text-xl font-JakartaBold">Route History</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text className="text-primary-500 font-JakartaBold">Close</Text>
                </TouchableOpacity>
            </View>

            <Text className="text-base font-JakartaMedium mb-2">Select Date</Text>

            <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-general-100 p-3 rounded-lg flex flex-row items-center justify-between mb-5"
            >
                <Text className="text-base font-JakartaRegular">
                    {format(date, "MMMM dd, yyyy")}
                </Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            setDate(selectedDate);
                        }
                    }}
                />
            )}

            {error && (
                <Text className="text-red-500 mb-3 font-JakartaMedium">{error}</Text>
            )}

            <TouchableOpacity
                onPress={handleFetchRoute}
                disabled={loading}
                className={`w-full py-4 rounded-full flex flex-row justify-center items-center ${loading ? "bg-neutral-300" : "bg-primary-500"
                    }`}
            >
                <Text className="text-white text-lg font-JakartaBold">
                    {loading ? "Loading..." : "Load Route"}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default HistorySheet;
