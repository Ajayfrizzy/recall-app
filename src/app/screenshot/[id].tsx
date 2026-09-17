import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
export default function ScreenshotRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ThemedView style={styles.container}><ThemedText type="subtitle">Screenshot</ThemedText><ThemedText>Route ID: {id}</ThemedText></ThemedView>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 12 }, });
