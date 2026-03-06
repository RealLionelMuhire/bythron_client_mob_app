import { router } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";

import CustomButton from "@/components/CustomButton";
import { getThemeColors } from "@/constants/theme";
import { onboarding } from "@/constants";
import { useColorScheme } from "nativewind";

const Home = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = getThemeColors(isDark ? "dark" : "light");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const swiperRef = useRef<Swiper>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const isLastSlide = activeIndex === onboarding.length - 1;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.surface.light }]}>
      <TouchableOpacity
        onPress={() => router.replace("/(auth)/sign-up")}
        style={styles.skipButton}
      >
        <Text style={[styles.skipText, { color: colors.text.primary }]}>Skip</Text>
      </TouchableOpacity>

      <Swiper
        ref={swiperRef}
        loop={false}
        dot={<View style={[styles.dot, { backgroundColor: colors.surface.border }]} />}
        activeDot={<View style={[styles.dot, styles.activeDot, { backgroundColor: colors.accent[400] }]} />}
        onIndexChanged={(index) => setActiveIndex(index)}
      >
        {onboarding.map((item) => (
          <View key={item.id} style={styles.slide}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text.primary }]}>
                {item.title}
              </Text>
            </View>
            <Text style={[styles.description, { color: colors.text.secondary }]}>
              {item.description}
            </Text>
          </View>
        ))}
      </Swiper>

      <CustomButton
        title={isLastSlide ? "Get Started" : "Next"}
        onPress={() =>
          isLastSlide
            ? router.replace("/(auth)/sign-up")
            : swiperRef.current?.scrollBy(1)
        }
        className="w-11/12 mt-10 mb-5"
      />
    </SafeAreaView>
  );
};

function createStyles(colors: ReturnType<typeof getThemeColors>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      alignItems: "center",
      justifyContent: "space-between",
    },
    skipButton: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 20,
    },
    skipText: {
      fontSize: 16,
      fontFamily: "Jakarta-Bold",
    },
    dot: {
      width: 32,
      height: 4,
      marginHorizontal: 4,
      borderRadius: 2,
    },
    activeDot: {},
    slide: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
    },
    image: {
      width: "100%",
      height: 300,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      marginTop: 40,
    },
    title: {
      fontSize: 28,
      fontFamily: "Jakarta-Bold",
      marginHorizontal: 40,
      textAlign: "center",
    },
    description: {
      fontSize: 16,
      fontFamily: "Jakarta-SemiBold",
      textAlign: "center",
      marginHorizontal: 40,
      marginTop: 12,
    },
  });
}

export default Home;
