import { View, Text, ScrollView, Image } from 'react-native';
import { CalendarPlus } from 'lucide-react-native';
import { addDays, format, isToday, startOfWeek } from 'date-fns';

export default function Home() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const scheduleItems = [
    { time: '08.00', title: 'Machine learning', duration: 2 },
    { time: '10.00', title: '', duration: 0 },
    { time: '12.00', title: 'Deep learning', duration: 4 },
    { time: '14.00', title: '', duration: 0 },
    { time: '16.00', title: '', duration: 0 },
  ];

  return (
    <ScrollView className="flex-1 px-5 pt-12">
      {/* Welcome + Calendar */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-xl font-sen font-bold text-[#3E2C22]">Welcome back!</Text>
          <CalendarPlus size={28} color="#3E2C22" opacity={0.75} />
        </View>

        {/* Weekdays */}
        <View className="bg-[#FFE8BB] rounded-xl p-2 mb-6">
          <View className="flex-row justify-around items-center">
            {days.map((day, index) => (
              <View key={index} className={`items-center p-3 rounded-lg ${isToday(day) ? 'bg-primary' : ''}`}>
                <Text className={`text-xs font-poppins font-bold mb-2 ${isToday(day) ? 'text-white' : 'text-[#3A3C6A]'}`}>{format(day, 'EEEEEE')}</Text>
                <Text className={`text-xs font-poppins font-bold ${isToday(day) ? 'text-white' : 'text-[#8A8BB1]'}`}>{format(day, 'd')}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Schedule */}
      <View className="mb-6">
        <Text className="text-xl font-sen font-bold text-[#3E2C22] mb-4">Today schedule</Text>

        <View className="relative">
          {/* Left time column */}
          <View className="absolute left-0 top-0 bottom-0 w-12 justify-between py-1">
            {scheduleItems.map((item, index) => (
              <Text key={index} className="text-sm font-sen text-[#32343E] leading-none">
                {item.time}
              </Text>
            ))}
          </View>

          {/* Schedule rows */}
          <View className="ml-14 relative">
            {/* Horizontal dividers */}
            <View className="absolute top-0 left-0 right-0 h-px bg-[#CFCAE4]" />
            <View className="absolute top-12 left-0 right-0 h-px bg-[#CFCAE4]" />
            <View className="absolute bottom-0 left-0 right-0 h-px bg-[#CFCAE4]" />

            {/* Schedule items */}
            <View className="h-12 relative mb-4">
              <View className="absolute top-0 left-0 right-0 h-12 bg-primary rounded-2xl justify-center px-4">
                <Text className="text-white font-sen font-semibold text-sm">Machine learning</Text>
              </View>
            </View>

            <View className="h-28 relative mb-4">
              <View className="absolute top-0 left-0 right-0 h-28 bg-primary rounded-2xl justify-center px-4">
                <Text className="text-white font-sen font-semibold text-sm">Deep learning</Text>
              </View>
            </View>

            <View className="h-12" />
          </View>
        </View>
      </View>

      {/* Bottom section */}
      <View className="bg-[#3E2C22] rounded-[14px] p-4 -mx-4 shadow-lg">
        <View className="bg-[#FFE8BB] rounded-[14px] p-4 my-4 relative">
          <Text className="text-center text-[#8D7162] font-sen font-semibold text-base mb-4">Classify unorganized images now!</Text>
          <View className="flex-row justify-center gap-4">
            <Image
              source={{
                uri: 'https://api.builder.io/api/v1/image/assets/TEMP/95b04280b55e01348191c16f60da62da3283e88f?width=314',
              }}
              className="w-40 h-32 rounded-lg"
              resizeMode="cover"
            />
            <Image
              source={{
                uri: 'https://api.builder.io/api/v1/image/assets/TEMP/4eb24e44fc1d974992559a05b185a1168bbb9eed?width=314',
              }}
              className="w-40 h-32 rounded-lg"
              resizeMode="cover"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
