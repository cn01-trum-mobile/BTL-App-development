import { addDays, addWeeks, endOfWeek, startOfWeek, subWeeks } from 'date-fns';
import * as Calendar from 'expo-calendar';
import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';

export default function Login() {
  const [calendar, setCalendar] = useState<Calendar.Calendar[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [events, setEvents] = useState<Calendar.Event[]>([]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        setCalendar(calendars);
        if (calendars.length > 0) {
          const calendarIds = calendars.map((c) => c.id);
          const fetchedEvents = await Calendar.getEventsAsync(calendarIds, weekStart, weekEnd);
          setEvents(fetchedEvents);
        }
      }
    })();
  }, []);

  return (
    <ScrollView className="p-3 mb-7">
      {calendar.map((cal, idx) => (
        <View key={idx} className="mb-5">
          <Text>
            {cal.id} - {cal.source.name}
          </Text>
          <Text>{cal.title}</Text>
          <Text>{cal.accessLevel}</Text>
          <Text>{cal.isPrimary ? 'is primary calendar' : 'not primary'}</Text>
          <Text>Event of the week:</Text>
          {events.map((event, idx) => (
            <View key={idx} className="ml-5">
              <Text>
                {event.title} - {event.location} - {event.recurrenceRule?.frequency}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
