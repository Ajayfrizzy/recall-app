import { Platform } from 'react-native';
// The legacy entry uses ExpoMediaLibrary, which is included in Expo Go SDK 57.
import * as MediaLibrary from 'expo-media-library/legacy';

import type { RecallScreenshot } from './types';
import { createIdleScreenshotAnalysis } from '@/services/understanding/types';
import { resolveScreenshotPermission, type ScreenshotPermission } from './permission-state';
import { normalizeScreenshotCreationTime } from './creation-time';

const PAGE_SIZE = 50;

export type { ScreenshotPermission } from './permission-state';
export type ScreenshotPermissionState = {
  permission: ScreenshotPermission;
  canAskAgain: boolean;
};

export function permissionFromResponse(
  response: MediaLibrary.PermissionResponse,
): ScreenshotPermission {
  return resolveScreenshotPermission(response, Platform.OS);
}

export async function getScreenshotPermissionState(): Promise<ScreenshotPermissionState> {
  if (Platform.OS === 'web') return { permission: 'unavailable', canAskAgain: false };
  const response = await MediaLibrary.getPermissionsAsync(false, ['photo']);
  return { permission: permissionFromResponse(response), canAskAgain: response.canAskAgain };
}

export async function getScreenshotPermission(): Promise<ScreenshotPermission> {
  return (await getScreenshotPermissionState()).permission;
}

export async function requestScreenshotPermissionState(): Promise<ScreenshotPermissionState> {
  if (Platform.OS === 'web') return { permission: 'unavailable', canAskAgain: false };
  await MediaLibrary.requestPermissionsAsync(false, ['photo']);
  // Re-read after the system UI closes; its response can lag the final Android selection.
  const response = await MediaLibrary.getPermissionsAsync(false, ['photo']);
  return { permission: permissionFromResponse(response), canAskAgain: response.canAskAgain };
}

export async function requestScreenshotPermission(): Promise<ScreenshotPermission> {
  return (await requestScreenshotPermissionState()).permission;
}

export async function updateLimitedScreenshotSelection(): Promise<ScreenshotPermissionState> {
  if (Platform.OS === 'web') return { permission: 'unavailable', canAskAgain: false };
  await MediaLibrary.presentPermissionsPickerAsync(['photo']);
  return getScreenshotPermissionState();
}

export async function loadDeviceScreenshots(
  permission: ScreenshotPermission,
): Promise<RecallScreenshot[]> {
  if (Platform.OS === 'web') return [];

  const options: MediaLibrary.AssetsOptions = {
    mediaType: ['photo'],
    first: PAGE_SIZE,
    sortBy: [['creationTime', false]],
  };
  if (permission === 'granted') {
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const screenshotsAlbum = albums.find((album) => album.title.toLowerCase() === 'screenshots');
    if (!screenshotsAlbum) return [];
    options.album = screenshotsAlbum;
  }

  // Limited access only exposes the assets selected in the system picker.
  const result = await MediaLibrary.getAssetsAsync(options);

  return result.assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    filename: asset.filename,
    width: asset.width,
    height: asset.height,
    creationTime: normalizeScreenshotCreationTime(asset.creationTime),
    status: 'pending',
    analysis: createIdleScreenshotAnalysis(),
  }));
}

export async function deleteScreenshotAssets(assetIds: string[]): Promise<boolean> {
  if (Platform.OS === 'web' || assetIds.length === 0) return false;
  return MediaLibrary.deleteAssetsAsync(assetIds);
}
