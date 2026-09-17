import { Platform } from 'react-native';
// The legacy entry uses ExpoMediaLibrary, which is included in Expo Go SDK 57.
import * as MediaLibrary from 'expo-media-library/legacy';

import type { RecallScreenshot } from './types';

const PAGE_SIZE = 50;

export type ScreenshotPermission = 'granted' | 'limited' | 'denied' | 'unavailable';

export function permissionFromResponse(
  response: MediaLibrary.PermissionResponse,
): ScreenshotPermission {
  if (Platform.OS === 'web') return 'unavailable';
  if (response.granted && response.accessPrivileges === 'all') return 'granted';
  if (response.granted && response.accessPrivileges === 'limited') return 'limited';
  return 'denied';
}

export async function getScreenshotPermission(): Promise<ScreenshotPermission> {
  if (Platform.OS === 'web') return 'unavailable';
  return permissionFromResponse(await MediaLibrary.getPermissionsAsync());
}

export async function requestScreenshotPermission(): Promise<ScreenshotPermission> {
  if (Platform.OS === 'web') return 'unavailable';
  return permissionFromResponse(await MediaLibrary.requestPermissionsAsync(false, ['photo']));
}

export async function loadDeviceScreenshots(): Promise<RecallScreenshot[]> {
  if (Platform.OS === 'web') return [];

  // The named album is the only reliable cross-platform way to avoid reading the whole gallery.
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
  const screenshotsAlbum = albums.find((album) => album.title.toLowerCase() === 'screenshots');
  if (!screenshotsAlbum) return [];

  const result = await MediaLibrary.getAssetsAsync({
    album: screenshotsAlbum,
    mediaType: ['photo'],
    first: PAGE_SIZE,
    sortBy: [['creationTime', false]],
  });

  return result.assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    creationTime: asset.creationTime,
    status: 'pending',
  }));
}
