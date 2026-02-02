import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SimpleBottomSheetProps {
  children: React.ReactNode;
  snapPoints?: string[];
  index?: number;
}

const SimpleBottomSheet = React.forwardRef<any, SimpleBottomSheetProps>(
  ({ children, snapPoints = ['40%', '85%'], index = 0 }, ref) => {
    const [visible, setVisible] = useState(true);
    const [currentSnapIndex, setCurrentSnapIndex] = useState(index);
    
    const translateY = new Animated.Value(
      SCREEN_HEIGHT * (1 - parseInt(snapPoints[currentSnapIndex]) / 100)
    );

    React.useImperativeHandle(ref, () => ({
      snapToIndex: (idx: number) => {
        setCurrentSnapIndex(idx);
        Animated.spring(translateY, {
          toValue: SCREEN_HEIGHT * (1 - parseInt(snapPoints[idx]) / 100),
          useNativeDriver: true,
        }).start();
      },
    }));

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(
            SCREEN_HEIGHT * (1 - parseInt(snapPoints[currentSnapIndex]) / 100) + gestureState.dy
          );
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 50 && currentSnapIndex > 0) {
          // Snap to lower position
          const newIndex = currentSnapIndex - 1;
          setCurrentSnapIndex(newIndex);
          Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT * (1 - parseInt(snapPoints[newIndex]) / 100),
            useNativeDriver: true,
          }).start();
        } else if (gestureState.dy < -50 && currentSnapIndex < snapPoints.length - 1) {
          // Snap to higher position
          const newIndex = currentSnapIndex + 1;
          setCurrentSnapIndex(newIndex);
          Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT * (1 - parseInt(snapPoints[newIndex]) / 100),
            useNativeDriver: true,
          }).start();
        } else {
          // Return to current position
          Animated.spring(translateY, {
            toValue: SCREEN_HEIGHT * (1 - parseInt(snapPoints[currentSnapIndex]) / 100),
            useNativeDriver: true,
          }).start();
        }
      },
    });

    return (
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SCREEN_HEIGHT,
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <View
          {...panResponder.panHandlers}
          style={{
            width: '100%',
            alignItems: 'center',
            paddingVertical: 10,
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#ccc',
              borderRadius: 2,
            }}
          />
        </View>
        {children}
      </Animated.View>
    );
  }
);

export default SimpleBottomSheet;
export const BottomSheetView = View;
