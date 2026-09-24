export function shouldRequestSemanticAnalysis({
  acknowledged,
  accessToken,
  useAi = true,
}: {
  acknowledged: boolean;
  accessToken: string | null;
  useAi?: boolean;
}): boolean {
  return acknowledged && Boolean(accessToken) && useAi;
}

export function authorizedAnalysisHeaders(accessToken: string): Record<string, string> {
  if (!accessToken) throw new Error('An AI access token is required.');
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${accessToken}`,
  };
}
