import { router } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import React, { createContext, useContext, useState, ReactNode } from 'react';

type ActionType = {
  icon: ReactNode;
  onPress: () => void;
};

type BottomActionContextType = {
  action: ActionType;
  disabled: boolean;
  setAction: React.Dispatch<React.SetStateAction<ActionType>>;
  setDisabled: React.Dispatch<React.SetStateAction<boolean>>;
  resetAction: () => void;
};

const BottomActionContext = createContext<BottomActionContextType | undefined>(undefined);

export const BottomActionProvider = ({ children }: { children: ReactNode }) => {
  const [action, setAction] = useState<ActionType>({
    icon: <ScanLine size={24} color="rgba(66,22,13,0.75)" strokeWidth={2} />,
    onPress: () => router.replace('/camera'),
  });
  const [disabled, setDisabled] = useState(false);

  const resetAction = () => {
    setAction({
      icon: <ScanLine size={24} color="rgba(66,22,13,0.75)" strokeWidth={2} />,
      onPress: () => router.replace('/camera'),
    });
  };

  return <BottomActionContext.Provider value={{ action, disabled, setAction, setDisabled, resetAction }}>{children}</BottomActionContext.Provider>;
};

export const useBottomAction = (): BottomActionContextType => {
  const context = useContext(BottomActionContext);
  if (!context) throw new Error('useBottomAction must be used inside BottomActionProvider');
  return context;
};
