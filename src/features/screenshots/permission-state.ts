export type ScreenshotPermission =
  'not_requested' | 'granted' | 'limited' | 'denied' | 'unavailable';

export type PermissionResponseLike = {
  status: 'undetermined' | 'granted' | 'denied' | string;
  granted: boolean;
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};

export type PermissionViewState =
  'loading' | 'error' | 'first_time' | 'granted' | 'limited' | 'denied' | 'blocked' | 'unavailable';

export function resolveScreenshotPermission(
  response: PermissionResponseLike,
  platform: string,
): ScreenshotPermission {
  if (platform === 'web') return 'unavailable';
  if (response.accessPrivileges === 'limited') return 'limited';
  if (response.accessPrivileges === 'all') return 'granted';
  if (response.granted && response.status === 'granted') return 'granted';
  if (response.status === 'undetermined') return 'not_requested';
  return 'denied';
}

export function getPermissionViewState({
  permission,
  canAskAgain,
  loading,
  error,
}: {
  permission: ScreenshotPermission | null;
  canAskAgain: boolean;
  loading: boolean;
  error: string | null;
}): PermissionViewState {
  if (loading) return 'loading';
  if (error) return 'error';
  if (permission === null) return 'loading';
  if (permission === 'not_requested') return 'first_time';
  if (permission === 'denied') return canAskAgain ? 'denied' : 'blocked';
  return permission;
}
