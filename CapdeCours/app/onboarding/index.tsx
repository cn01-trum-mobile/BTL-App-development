import { storeData } from '@/utils/asyncStorage';
import { router } from 'expo-router';
import { Image, View } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';

export default function OnboardingScreen() {
  const backToHome = () => {
    storeData('onboarded', '1');
    router.replace('/');
  };
  return (
    <View className="flex-1 justify-center items-center">
      <Onboarding
        onDone={backToHome}
        onSkip={backToHome}
        pages={[
          {
            backgroundColor: '#000',
            image: <Image source={require('../../assets/images/react-logo.png')} />,
            title: 'Onboarding',
            subtitle: 'Welcome',
          },
          {
            backgroundColor: '#000',
            image: <Image source={require('../../assets/images/react-logo.png')} />,
            title: 'Onboarding',
            subtitle: 'This is the onboarding screen',
          },
          {
            backgroundColor: '#000',
            image: <Image source={require('../../assets/images/react-logo.png')} />,
            title: 'Onboarding',
            subtitle: 'Done with React Native Onboarding Swiper',
          },
        ]}
      />
    </View>
  );
}
