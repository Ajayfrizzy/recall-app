import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fonts } from '@/constants/theme';
import { ScreenshotProvider } from '@/features/screenshots/context';
import { LibraryProvider } from '@/features/library/context';
import { UpcomingProvider } from '@/features/upcoming/context';
import { ActionProvider } from '@/features/actions/context';
import { PersistenceProvider } from '@/features/persistence/provider';
import { BundleProvider } from '@/features/bundles/context';
import { ResurfacingProvider } from '@/features/resurfacing/context';
import { CleanupProvider } from '@/features/cleanup/context';
import { SubscriptionProvider } from '@/features/subscription/context';
import { AiAccessProvider } from '@/features/ai-access/context';

const recallDarkTheme: Theme = {
  ...DarkTheme,
  fonts: {
    regular: { ...DarkTheme.fonts.regular, fontFamily: Fonts.sans },
    medium: { ...DarkTheme.fonts.medium, fontFamily: Fonts.sans },
    bold: { ...DarkTheme.fonts.bold, fontFamily: Fonts.sans },
    heavy: { ...DarkTheme.fonts.heavy, fontFamily: Fonts.sans },
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={recallDarkTheme}>
      <PersistenceProvider>
        <AiAccessProvider>
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
                          <StatusBar style="light" />
                          <Stack screenOptions={{ headerTitleStyle: { fontFamily: Fonts.sans } }}>
                            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                            <Stack.Screen
                              name="ai-access"
                              options={{ title: 'AI Access', animation: 'fade_from_bottom' }}
                            />
                            <Stack.Screen
                              name="screenshot/[id]"
                              options={{ title: 'Screenshot', animation: 'fade_from_bottom' }}
                            />
                            <Stack.Screen
                              name="bundle/[id]"
                              options={{ title: 'Bundle', animation: 'slide_from_right' }}
                            />
                            <Stack.Screen
                              name="bundle/[id]/removed"
                              options={{ title: 'Removed Items' }}
                            />
                            <Stack.Screen
                              name="cleanup"
                              options={{ title: 'Screenshot Cleanup' }}
                            />
                          </Stack>
                        </CleanupProvider>
                      </ActionProvider>
                    </ResurfacingProvider>
                  </SubscriptionProvider>
                </UpcomingProvider>
              </LibraryProvider>
            </BundleProvider>
          </ScreenshotProvider>
        </AiAccessProvider>
      </PersistenceProvider>
    </ThemeProvider>
  );
}
