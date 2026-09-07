import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/contexts/AuthContext';
import { changePasswordWithApi } from '@/services/authService';
import { SuccessModal } from '@/components/success-modal';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const initialFields = { current: '', next: '', confirm: '' };

/**
 * Self-service "Change Password" - available to every signed-in role
 * (supervisor, officeStaff, admin), not just admins. Verifies the user's
 * current password server-side before allowing the change (the older
 * updateProfile endpoint didn't do this at all - anyone with a live
 * session token could silently take over the account permanently).
 */
export function ChangePasswordModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const { token } = useAuth();
  const [fields, setFields] = useState(initialFields);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setFields(initialFields);
    setError(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    if (!token || saving) return;
    setError(null);

    if (!fields.current) {
      setError('Enter your current password.');
      return;
    }
    if (fields.next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (fields.next !== fields.confirm) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      await changePasswordWithApi({
        token,
        current_password: fields.current,
        new_password: fields.next,
        new_password_confirmation: fields.confirm,
      });
      setFields(initialFields);
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible && !success} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]}>Change Password</Text>
              <Pressable onPress={handleClose} style={styles.closeBtn}>
                <Text style={{ fontSize: 18, color: theme.textSecondary }}>✕</Text>
              </Pressable>
            </View>

            <Text style={[styles.label, { color: theme.textSecondary }]}>Current Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
              value={fields.current}
              onChangeText={(v) => setFields((p) => ({ ...p, current: v }))}
              placeholder="Enter current password"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
              value={fields.next}
              onChangeText={(v) => setFields((p) => ({ ...p, next: v }))}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSelected, color: theme.text }]}
              secureTextEntry
              autoCapitalize="none"
              value={fields.confirm}
              onChangeText={(v) => setFields((p) => ({ ...p, confirm: v }))}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.textSecondary}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save New Password</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

      <SuccessModal
        visible={success}
        title="Password Changed"
        subtitle="Your password has been updated successfully."
        onClose={() => {
          setSuccess(false);
          handleClose();
        }}
      />
    </>
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
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 12,
    fontWeight: '600',
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#4b4fbf',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
