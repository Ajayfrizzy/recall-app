import { Redirect } from 'expo-router';
import { usePersistence } from '@/features/persistence/context';

export default function Index() {
  const { state } = usePersistence();
  return <Redirect href={state.onboardingCompleted ? '/(tabs)' : '/onboarding'} />;
}
