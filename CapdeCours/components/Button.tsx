import React from 'react';
import { Pressable, PressableProps, Text } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends PressableProps {
  title?: string;
  onPress?: () => void;
  className?: string;
  children?: React.ReactNode;
  variant?: ButtonVariant;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, className, children, variant = 'primary', ...props }) => {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-blue-500 active:bg-blue-300 ',
    secondary: 'bg-gray-500 active:bg-gray-300 ',
    danger: 'bg-red-500 active:bg-red-300 ',
  };
  return (
    <Pressable onPress={onPress} className={'px-6 py-4 m-1 rounded-md ' + variants[variant] + className} {...props}>
      {children ? children : <Text className="text-white">{title}</Text>}
    </Pressable>
  );
};
