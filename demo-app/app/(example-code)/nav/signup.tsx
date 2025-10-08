import { Text, View } from 'react-native';

export default function SignupScreen() {
  return (
    <View className="flex-1 justify-center items-center">
      <Text className="m-6 uppercase font-bold text-3xl text-center">This is the signup page</Text>
      {/* <Button title="View Onboarding" onPress={() => router.push('/onboarding')} /> */}
    </View>
  );
}
