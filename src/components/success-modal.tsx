import { useTheme } from '@/hooks/use-theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type SuccessModalProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  onClose: () => void;
};

export function SuccessModal({ visible, title, subtitle, buttonLabel = 'OK', onClose }: SuccessModalProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>

          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
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
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  close: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 8,
    borderRadius: 14,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
