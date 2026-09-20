import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <ThemedView style={styles.content}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">{message}</ThemedText>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
              <ThemedText type="smallBold">{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[styles.confirmButton, destructive && styles.destructiveButton]}
            >
              <ThemedText style={styles.confirmText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 20,
    borderRadius: 8,
    gap: 14,
  },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  confirmButton: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  destructiveButton: { backgroundColor: '#c53030' },
  confirmText: { color: '#fff', fontWeight: '700' },
});
