import { useTheme } from '@/hooks/use-theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A real, working confirmation dialog - Alert.alert() is a no-op on react-native-web. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.warnCircle}>
            <Text style={styles.warnMark}>!</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{message}</Text>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.backgroundSelected }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
              <Text style={[styles.buttonText, styles.confirmButtonText]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  warnCircle: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  warnMark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  confirmButtonText: {
    color: '#fff',
  },
});
