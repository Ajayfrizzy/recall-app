import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from './action-button';
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
  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(20, insets.top + 12),
            paddingBottom: Math.max(20, insets.bottom + 12),
          },
        ]}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="smallBold">{title}</ThemedText>
          <ThemedText themeColor="textSecondary">{message}</ThemedText>
          <View style={styles.actions}>
            <ActionButton
              label={cancelLabel}
              variant="ghost"
              onPress={onCancel}
              style={styles.cancelButton}
            />
            <ActionButton
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.confirmButton}
            />
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' },
  cancelButton: { minWidth: 92 },
  confirmButton: { minWidth: 120 },
});
