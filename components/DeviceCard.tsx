import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { formatDistanceToNow } from "date-fns";

import { icons } from "@/constants";
import { DeviceCardProps } from "@/types/type";

const DeviceCardComponent = ({ item, selected, setSelected, onHistoryPress }: DeviceCardProps) => {
    const isOnline = item.status === 'online';
    const lastSeenText = item.last_seen
        ? formatDistanceToNow(new Date(item.last_seen), { addSuffix: true })
        : 'Never';

    return (
        <TouchableOpacity
            onPress={setSelected}
            className={`${selected === item.id ? "bg-general-600" : "bg-white"
                } flex flex-col py-5 px-3 rounded-xl mb-3`}
        >
            <View className="flex flex-row items-center justify-between">
                <View className="flex-1">
                    <View className="flex flex-row items-center justify-start mb-2">
                        <Text className="text-lg font-JakartaBold">{item.name}</Text>

                        <View className={`ml-2 px-2 py-1 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}>
                            <Text className="text-xs text-white font-JakartaMedium">
                                {isOnline ? 'Online' : 'Offline'}
                            </Text>
                        </View>
                    </View>

                    <View className="flex flex-row items-center justify-start">
                        <Image source={icons.point} className="w-4 h-4" />
                        <Text className="text-sm font-JakartaRegular ml-1 text-general-800">
                            Last seen: {lastSeenText}
                        </Text>
                    </View>

                    {item.vehicle_info && (
                        <Text className="text-sm font-JakartaRegular text-general-700 mt-1">
                            {item.vehicle_info}
                        </Text>
                    )}
                </View>

                {onHistoryPress && (
                    <TouchableOpacity
                        onPress={onHistoryPress}
                        className="ml-2 bg-primary-500 px-3 py-2 rounded-lg"
                    >
                        <Text className="text-white text-sm font-JakartaMedium">History</Text>
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
};

export default React.memo(DeviceCardComponent);
