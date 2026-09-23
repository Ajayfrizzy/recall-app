import type { PropsWithChildren } from 'react';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

export function FadeInView({ children }: PropsWithChildren) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)}>
      {children}
    </Animated.View>
  );
}
