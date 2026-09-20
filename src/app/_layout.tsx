import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { ScreenshotProvider } from '@/features/screenshots/context';
import { LibraryProvider } from '@/features/library/context';
import { UpcomingProvider } from '@/features/upcoming/context';
import { ActionProvider } from '@/features/actions/context';
import { PersistenceProvider } from '@/features/persistence/provider';
import { BundleProvider } from '@/features/bundles/context';
import { ResurfacingProvider } from '@/features/resurfacing/context';
import { CleanupProvider } from '@/features/cleanup/context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PersistenceProvider>
        <ScreenshotProvider>
          <BundleProvider>
            <LibraryProvider>
              <UpcomingProvider>
                {/* Resurfacing consumes the three durable source providers above. */}
                <ResurfacingProvider>
                  <ActionProvider>
                    {/* Cleanup derives candidates from Screenshots, Actions, and Bundles. */}
                    <CleanupProvider>
                      <StatusBar style="auto" />
                      <Stack>
                        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                        <Stack.Screen name="screenshot/[id]" options={{ title: 'Screenshot' }} />
                        <Stack.Screen name="bundle/[id]" options={{ title: 'Bundle' }} />
                        <Stack.Screen
                          name="bundle/[id]/removed"
                          options={{ title: 'Removed Items' }}
                        />
                        <Stack.Screen name="cleanup" options={{ title: 'Screenshot Cleanup' }} />
                      </Stack>
                    </CleanupProvider>
                  </ActionProvider>
                </ResurfacingProvider>
              </UpcomingProvider>
            </LibraryProvider>
          </BundleProvider>
        </ScreenshotProvider>
      </PersistenceProvider>
    </ThemeProvider>
  );
}
