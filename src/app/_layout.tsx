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
import { SubscriptionProvider } from '@/features/subscription/context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PersistenceProvider>
        <ScreenshotProvider>
          <BundleProvider>
            <LibraryProvider>
              <UpcomingProvider>
                <SubscriptionProvider>
                  {/* Resurfacing consumes durable sources and the subscription card limit. */}
                  <ResurfacingProvider>
                    <ActionProvider>
                      {/* Cleanup derives candidates and applies the subscription batch limit. */}
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
                </SubscriptionProvider>
              </UpcomingProvider>
            </LibraryProvider>
          </BundleProvider>
        </ScreenshotProvider>
      </PersistenceProvider>
    </ThemeProvider>
  );
}
