import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function InboxScreen() { return <ThemedView style={styles.container}><View><ThemedText type="title">Recall</ThemedText><ThemedText style={styles.tagline}>Turn screenshots into actions.</ThemedText></View><ThemedText themeColor="textSecondary">No screenshots waiting.</ThemedText></ThemedView>; }
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, justifyContent: 'space-between', paddingBottom: 110 }, tagline: { fontSize: 18, marginTop: 8 }, });
