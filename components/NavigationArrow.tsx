import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface NavigationArrowProps {
  size?: number;
  color?: string;
}

export const NavigationArrow: React.FC<NavigationArrowProps> = ({ 
  size = 40, 
  color = '#E36060' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"
        fill={color}
      />
      <Path
        d="M12 2L4.5 20.29L5.21 21L12 14L18.79 21L19.5 20.29L12 2Z"
        fill={color}
        fillOpacity="0.9"
      />
    </Svg>
  );
};
