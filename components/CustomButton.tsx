import { TouchableOpacity, Text } from "react-native";

import { ButtonProps } from "@/types/type";

const getBgVariantStyle = (variant: ButtonProps["bgVariant"]) => {
  switch (variant) {
    case "secondary":
      return "bg-secondary-500";
    case "danger":
      return "bg-status-error";
    case "success":
      return "bg-status-success";
    case "outline":
      return "bg-transparent border border-slate-300 dark:border-slate-600";
    default:
      return "bg-accent-500";
  }
};

const getTextVariantStyle = (variant: ButtonProps["textVariant"], bgVariant?: ButtonProps["bgVariant"]) => {
  if (bgVariant === "outline") return "text-slate-700 dark:text-slate-300";
  switch (variant) {
    case "primary":
      return "text-slate-900";
    case "secondary":
      return "text-white";
    case "danger":
      return "text-white";
    case "success":
      return "text-white";
    default:
      return "text-white";
  }
};

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRight,
  className,
  ...props
}: ButtonProps) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`w-full rounded-full p-3 flex flex-row justify-center items-center shadow-sm ${getBgVariantStyle(bgVariant)} ${className}`}
      {...props}
    >
      {IconLeft && <IconLeft />}
      <Text className={`text-lg font-bold ${getTextVariantStyle(textVariant, bgVariant)}`}>
        {title}
      </Text>
      {IconRight && <IconRight />}
    </TouchableOpacity>
  );
};

export default CustomButton;
