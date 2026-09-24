import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { aiAccessClient, type AiAccessCredentials } from '@/services/ai/access';

export type AiAuthorizationState = 'loading' | 'not_activated' | 'active' | 'expired';

type AiAccessContextValue = {
  initialized: boolean;
  activated: boolean;
  expiresAt: number | null;
  credentials: AiAccessCredentials | null;
  authorizationState: AiAuthorizationState;
  activate: (code: string) => Promise<AiAccessCredentials>;
  retryJudgePro: () => Promise<AiAccessCredentials>;
  deactivate: () => Promise<void>;
  invalidateCredentials: (reason: 'expired' | 'revoked') => Promise<void>;
  getAccessToken: () => string | null;
};

const AiAccessContext = createContext<AiAccessContextValue | null>(null);

export function AiAccessProvider({ children }: PropsWithChildren) {
  const credentialsRef = useRef<AiAccessCredentials | null>(null);
  const [credentials, setCredentials] = useState<AiAccessCredentials | null>(null);
  const [authorizationState, setAuthorizationState] = useState<AiAuthorizationState>('loading');

  useEffect(() => {
    let active = true;
    void aiAccessClient
      .load()
      .then((loaded) => {
        if (!active) return;
        credentialsRef.current = loaded.credentials;
        setCredentials(loaded.credentials);
        setAuthorizationState(
          loaded.credentials ? 'active' : loaded.expired ? 'expired' : 'not_activated',
        );
      })
      .catch(() => {
        if (active) setAuthorizationState('not_activated');
      });
    return () => {
      active = false;
    };
  }, []);

  const activate = useCallback(async (code: string) => {
    const next = await aiAccessClient.redeem(code);
    credentialsRef.current = next;
    setCredentials(next);
    setAuthorizationState('active');
    return next;
  }, []);

  const retryJudgePro = useCallback(async () => {
    const current = credentialsRef.current;
    if (!current || current.invitationType !== 'judge') {
      throw new Error('Judge access is not active on this installation.');
    }
    const next = await aiAccessClient.provisionJudgeEntitlement(current);
    credentialsRef.current = next;
    setCredentials(next);
    return next;
  }, []);

  const deactivate = useCallback(async () => {
    await aiAccessClient.clear();
    credentialsRef.current = null;
    setCredentials(null);
    setAuthorizationState('not_activated');
  }, []);

  const invalidateCredentials = useCallback(async (reason: 'expired' | 'revoked') => {
    await aiAccessClient.clear().catch(() => undefined);
    credentialsRef.current = null;
    setCredentials(null);
    setAuthorizationState(reason === 'expired' ? 'expired' : 'not_activated');
  }, []);

  useEffect(() => {
    if (!credentials) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const checkExpiration = () => {
      const remaining = credentials.expiresAt - Date.now();
      if (remaining <= 0) {
        void invalidateCredentials('expired');
        return;
      }
      timeout = setTimeout(checkExpiration, Math.min(remaining, 2_000_000_000));
    };
    checkExpiration();
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [credentials, invalidateCredentials]);

  const getAccessToken = useCallback(() => {
    const current = credentialsRef.current;
    if (!current || current.expiresAt <= Date.now()) return null;
    return current.accessToken;
  }, []);

  const value = useMemo<AiAccessContextValue>(
    () => ({
      initialized: authorizationState !== 'loading',
      activated: authorizationState === 'active',
      expiresAt: credentials?.expiresAt ?? null,
      credentials,
      authorizationState,
      activate,
      retryJudgePro,
      deactivate,
      invalidateCredentials,
      getAccessToken,
    }),
    [
      authorizationState,
      credentials,
      activate,
      retryJudgePro,
      deactivate,
      invalidateCredentials,
      getAccessToken,
    ],
  );

  return <AiAccessContext.Provider value={value}>{children}</AiAccessContext.Provider>;
}

export function useAiAccess(): AiAccessContextValue {
  const value = useContext(AiAccessContext);
  if (!value) throw new Error('useAiAccess must be used within AiAccessProvider');
  return value;
}
