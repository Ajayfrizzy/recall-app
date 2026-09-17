import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
export default function UpcomingScreen() { return <ThemedView style={styles.container}><ThemedText type="subtitle">Upcoming</ThemedText><ThemedText themeColor="textSecondary">Things Recall will bring back when they matter.</ThemedText></ThemedView>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, gap: 12, paddingBottom: 110 }, });
