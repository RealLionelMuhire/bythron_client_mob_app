import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

const TICK_INTERVAL = 20;
const DEFAULT_MAX_SPEED = 120;

type SpeedometerProps = {
  speed?: number;
  maxSpeed?: number;
  size?: "large" | "small";
};

function SpeedometerComponent({
  speed = 0,
  maxSpeed = DEFAULT_MAX_SPEED,
  size = "large",
}: SpeedometerProps) {
  const isLarge = size === "large";
  const sizeNum = isLarge ? 140 : 90;
  const strokeWidth = isLarge ? 12 : 10;
  const center = sizeNum / 2;
  const radius = (center - strokeWidth / 2) - (isLarge ? 0 : 1);
  const startAngle = -180;
  const endAngle = 0;
  const totalAngle = endAngle - startAngle;

  const speedPercentage = Math.min(speed / maxSpeed, 1);
  const needleAngle = startAngle + totalAngle * speedPercentage;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius - (isLarge ? 10 : 6);
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);

  const createArcPath = (startDeg: number, endDeg: number, r: number) => {
    const start = (startDeg * Math.PI) / 180;
    const end = (endDeg * Math.PI) / 180;
    const x1 = center + r * Math.cos(start);
    const y1 = center + r * Math.sin(start);
    const x2 = center + r * Math.cos(end);
    const y2 = center + r * Math.sin(end);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const tickValues = useMemo(() => {
    const values: number[] = [];
    for (let v = 0; v <= maxSpeed; v += TICK_INTERVAL) values.push(v);
    return values;
  }, [maxSpeed]);

  const labelRadius = radius - (isLarge ? 20 : 14);
  const tickLength = isLarge ? 8 : 5;
  const fontSize = isLarge ? 10 : 8;
  const lineStroke = isLarge ? 3 : 2;

  const visibleHeight = center + 14;

  return (
    <View style={{ alignItems: "center", height: visibleHeight, overflow: "hidden", marginBottom: -6 }}>
      <Svg width={sizeNum} height={sizeNum}>
        <Path
          d={createArcPath(startAngle, endAngle, radius)}
          stroke="#1E3A52"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {tickValues.map((value) => {
          const angle = startAngle + totalAngle * (value / maxSpeed);
          const rad = (angle * Math.PI) / 180;
          const outerX = center + radius * Math.cos(rad);
          const outerY = center + radius * Math.sin(rad);
          const innerX = center + (radius - tickLength) * Math.cos(rad);
          const innerY = center + (radius - tickLength) * Math.sin(rad);
          const labelX = center + labelRadius * Math.cos(rad);
          const labelY = center + labelRadius * Math.sin(rad);
          const isEnd = value === 0 || value === maxSpeed;
          const isZero = value === 0;
          const passed = speed >= value;
          const tickColor = passed ? "#5BB8E8" : "#1E3A52";
          const labelColor = passed ? "#5BB8E8" : "#A8D8F0";
          return (
            <React.Fragment key={value}>
              {isZero && (
                <Circle cx={outerX} cy={outerY} r={4} fill={tickColor} />
              )}
              {!isZero && value !== maxSpeed && (
                <Line
                  x1={innerX}
                  y1={innerY}
                  x2={outerX}
                  y2={outerY}
                  stroke={tickColor}
                  strokeWidth={isLarge ? 2 : 1.5}
                  strokeLinecap="round"
                />
              )}
              {!isEnd && (
                <SvgText
                  x={labelX}
                  y={labelY}
                  fontSize={fontSize}
                  fontWeight={passed ? "700" : "400"}
                  fill={labelColor}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {value}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        <Path
          d={createArcPath(startAngle, needleAngle, radius)}
          stroke="#5BB8E8"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <Circle cx={center} cy={center} r={isLarge ? 4 : 3} fill="#333" />
        <Line
          x1={center}
          y1={center}
          x2={needleX}
          y2={needleY}
          stroke="white"
          strokeWidth={lineStroke}
          strokeLinecap="round"
        />
        {isLarge && (
          <>
            <Circle cx={center} cy={center} r={6} fill="white" />
            <Circle cx={center} cy={center} r={3} fill="#5BB8E8" />
          </>
        )}
      </Svg>
    </View>
  );
}

export const Speedometer = React.memo(SpeedometerComponent);
