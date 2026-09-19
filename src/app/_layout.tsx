import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ScreenshotProvider } from '@/features/screenshots/context';
import { LibraryProvider } from '@/features/library/context';
import { UpcomingProvider } from '@/features/upcoming/context';
import { ActionProvider } from '@/features/actions/context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ScreenshotProvider>
        <LibraryProvider>
          <UpcomingProvider>
            <ActionProvider>
              <StatusBar style="auto" />
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="screenshot/[id]" options={{ title: 'Screenshot' }} />
                <Stack.Screen name="bundle/[id]" options={{ title: 'Bundle' }} />
              </Stack>
            </ActionProvider>
          </UpcomingProvider>
        </LibraryProvider>
      </ScreenshotProvider>
    </ThemeProvider>
  );
}
