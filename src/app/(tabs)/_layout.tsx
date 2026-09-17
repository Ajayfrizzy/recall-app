import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

const icons = {
  inbox: { ios: 'tray', android: 'inbox', web: 'inbox' },
  upcoming: { ios: 'clock', android: 'schedule', web: 'schedule' },
  library: { ios: 'books.vertical', android: 'library_books', web: 'library_books' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
} as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#111827' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={icons.inbox} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={icons.upcoming} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={icons.library} tintColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={icons.profile} tintColor={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
