import { Link, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View, Platform
} from "react-native";
import { registerWithApi, type UserRole, API_BASE_URL } from "@/services/authService";
import { useTheme } from "@/hooks/use-theme";
import { MaxContentWidth, rf } from '@/constants/theme';

const accent = "#4f5bb1";
const errorColor = "#e74c3c";

// Validation helper functions
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUserName = (userName: string) => {
  const trimmed = userName.trim();
  // Must be at least 3 characters and contain at least one letter
  const hasLetters = /[a-zA-Z]/.test(trimmed);
  return trimmed.length >= 3 && hasLetters;
};

const validatePassword = (password: string) => {
  return password.trim().length >= 6;
};

const validatePasswordMatch = (password: string, confirmPassword: string) => {
  return password === confirmPassword && password.trim().length > 0;
};

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [userName, setUserName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("supervisor");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Supervisor scoping
  const [worksites, setWorksites] = useState<{ id: number; name: string }[]>([]);
  const [selectedWorksiteId, setSelectedWorksiteId] = useState<number | null>(null);
  const [hospitals, setHospitals] = useState<{ id: number; name: string }[]>([]);
  const [selectedHospitalIds, setSelectedHospitalIds] = useState<number[]>([]);
  const [loadingWorksites, setLoadingWorksites] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  useEffect(() => {
    // Fetch worksites without auth (public endpoint for registration use)
    setLoadingWorksites(true);
    fetch(`${API_BASE_URL}/public-worksites`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => setWorksites(Array.isArray(data) ? data : data.data || []))
      .catch(() => {})
      .finally(() => setLoadingWorksites(false));
  }, []);

  useEffect(() => {
    if (!selectedWorksiteId) { setHospitals([]); setSelectedHospitalIds([]); return; }
    setLoadingHospitals(true);
    setSelectedHospitalIds([]);
    fetch(`${API_BASE_URL}/public-hospitals?worksite_id=${selectedWorksiteId}`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingHospitals(false));
  }, [selectedWorksiteId]);

  const toggleHospital = (id: number) => {
    setSelectedHospitalIds(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const validateUsername = (u: string) => {
    // Only letters, numbers, underscores, hyphens; 3–30 chars
    return /^[a-zA-Z0-9_-]{3,30}$/.test(u.trim());
  };

  const isUserNameValid = validateUserName(userName);
  const isUsernameValid = validateUsername(username);
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);
  const isPasswordMatchValid = validatePasswordMatch(password, confirmPassword);

  const canSubmit =
    userName.trim().length > 0 &&
    username.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    isUserNameValid &&
    isUsernameValid &&
    isEmailValid &&
    isPasswordValid &&
    isPasswordMatchValid &&
    // Supervisors must select a main site
    (role !== 'supervisor' || selectedWorksiteId !== null);

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}>
      <View style={[StyleSheet.absoluteFill, styles.backgroundLayerBackground, { backgroundColor: theme.background }]}>
        <View style={[styles.circle, styles.circleOne]} />
        <View style={[styles.circle, styles.circleTwo]} />
        <View style={[styles.circle, styles.circleThree]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={{ flex: 1, width: '100%', overscrollBehavior: 'none' } as any}
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <Text style={[styles.title, { color: theme.text }]}>Register</Text>

            <View style={styles.roleRow}>
              <Pressable
                style={[
                  styles.roleButton,
                  role === "supervisor" && styles.roleButtonActive,
                  { backgroundColor: role === "supervisor" ? theme.backgroundSelected : theme.background },
                ]}
                onPress={() => setRole("supervisor")}
              >
                <Text style={[styles.roleButtonText, { color: theme.text }]}>Supervisor</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.roleButton,
                  role === "officeStaff" && styles.roleButtonActive,
                  { backgroundColor: role === "officeStaff" ? theme.backgroundSelected : theme.background },
                ]}
                onPress={() => setRole("officeStaff")}
              >
                <Text style={[styles.roleButtonText, { color: theme.text }]}>Office Staff</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Full Name</Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, !isUserNameValid && styles.inputError, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
                autoCapitalize="words"
                keyboardType="default"
                returnKeyType="next"
              />
              {!isUserNameValid && userName.length > 0 && (
                <Text style={styles.errorText}>
                  Name must be at least 3 characters and contain letters
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="e.g. john_doe (no spaces)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, !isUsernameValid && username.length > 0 && styles.inputError, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
                autoCapitalize="none"
                keyboardType="default"
                returnKeyType="next"
              />
              {!isUsernameValid && username.length > 0 && (
                <Text style={styles.errorText}>
                  3–30 chars, letters/numbers/underscores/hyphens only
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, !isEmailValid && styles.inputError, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              {!isEmailValid && email.length > 0 && (
                <Text style={styles.errorText}>
                  Please enter a valid email address
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    !isPasswordValid && styles.inputError,
                    { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text },
                  ]}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                />
                <Pressable
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              </View>
              {!isPasswordValid && password.length > 0 && (
                <Text style={styles.errorText}>
                  Password must be at least 6 characters
                </Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    !isPasswordMatchValid && styles.inputError,
                    { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text },
                  ]}
                  secureTextEntry={!showConfirmPassword}
                  returnKeyType="done"
                />
                <Pressable
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeIconText}>
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </Text>
                </Pressable>
              </View>
              {!isPasswordMatchValid && confirmPassword.length > 0 && (
                <Text style={styles.errorText}>Passwords do not match</Text>
              )}
            </View>

            {/* ── Supervisor Site/Hospital Scope pickers ────────────────── */}
            {role === 'supervisor' && (
              <>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Main Site <Text style={{ color: '#e74c3c' }}>*</Text></Text>
                  {loadingWorksites ? (
                    <Text style={{ color: theme.textSecondary, fontSize: 13, paddingLeft: 4 }}>Loading sites…</Text>
                  ) : (
                    <View style={styles.optionList}>
                      {worksites.map(ws => (
                        <Pressable
                          key={ws.id}
                          style={[styles.optionItem, selectedWorksiteId === ws.id && styles.optionItemSelected, { borderColor: selectedWorksiteId === ws.id ? accent : theme.backgroundSelected }]}
                          onPress={() => setSelectedWorksiteId(ws.id === selectedWorksiteId ? null : ws.id)}
                        >
                          <View style={[styles.optionRadio, selectedWorksiteId === ws.id && { backgroundColor: accent, borderColor: accent }]}>
                            {selectedWorksiteId === ws.id && <View style={styles.optionRadioInner} />}
                          </View>
                          <Text style={[styles.optionText, { color: theme.text }]}>{ws.name}</Text>
                        </Pressable>
                      ))}
                      {worksites.length === 0 && (
                        <Text style={{ color: theme.textSecondary, fontSize: 13, paddingLeft: 4 }}>No sites available</Text>
                      )}
                    </View>
                  )}
                </View>

                {selectedWorksiteId !== null && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Hospitals <Text style={{ color: theme.textSecondary, fontWeight: '400' }}>(optional — leave blank for all)</Text></Text>
                    {loadingHospitals ? (
                      <Text style={{ color: theme.textSecondary, fontSize: 13, paddingLeft: 4 }}>Loading hospitals…</Text>
                    ) : (
                      <View style={styles.optionList}>
                        {hospitals.map(h => {
                          const checked = selectedHospitalIds.includes(h.id);
                          return (
                            <Pressable
                              key={h.id}
                              style={[styles.optionItem, checked && styles.optionItemSelected, { borderColor: checked ? accent : theme.backgroundSelected }]}
                              onPress={() => toggleHospital(h.id)}
                            >
                              <View style={[styles.optionCheckbox, checked && { backgroundColor: accent, borderColor: accent }]}>
                                {checked && <Text style={styles.optionCheckmark}>✓</Text>}
                              </View>
                              <Text style={[styles.optionText, { color: theme.text }]}>{h.name}</Text>
                            </Pressable>
                          );
                        })}
                        {hospitals.length === 0 && (
                          <Text style={{ color: theme.textSecondary, fontSize: 13, paddingLeft: 4 }}>No hospitals under this site</Text>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}

            {authError ? (
              <Text style={styles.errorText}>{authError}</Text>
            ) : null}

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              disabled={!canSubmit}
              onPress={async () => {
                if (!canSubmit) return;
                setAuthError(null);

                try {
                  await registerWithApi({
                    name: userName,
                    username,
                    email,
                    password,
                    role,
                    worksite_id: role === 'supervisor' ? selectedWorksiteId : null,
                    hospital_ids: role === 'supervisor' && selectedHospitalIds.length > 0 ? selectedHospitalIds : [],
                  });
                  setShowSuccess(true);
                } catch (error) {
                  setAuthError(error instanceof Error ? error.message : 'Failed to register');
                }
              }}
            >
              <Text style={styles.buttonText}>Register</Text>
            </Pressable>

            <Modal visible={showSuccess} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
                  <Pressable
                    style={styles.modalClose}
                    onPress={() => setShowSuccess(false)}
                  >
                    <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>✕</Text>
                  </Pressable>

                  <View style={styles.checkCircle}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>

                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Details Saved Successfully!
                  </Text>

                  <Text style={styles.modalSubtitle} />

                  <Pressable
                    style={styles.modalOkButton}
                    onPress={() => router.push("/login")}
                  >
                    <Text style={styles.modalOkText}>OK</Text>
                  </Pressable>
                </View>
              </View>
            </Modal>

            <Link href="/login" asChild>
              <Pressable style={styles.secondaryButton}>
                <Text style={[styles.secondaryText, { color: accent }]}>Back to Login</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundLayerBackground: {},
  circle: {
    position: "absolute",
    borderRadius: 200,
    opacity: 0.35,
  },
  circleOne: {
    width: 260,
    height: 260,
    backgroundColor: "#d4b79f",
    top: -90,
    left: -50,
  },
  circleTwo: {
    width: 180,
    height: 180,
    backgroundColor: "#f1d3b3",
    top: 100,
    right: -80,
  },
  circleThree: {
    width: 320,
    height: 320,
    backgroundColor: "#8b6f5d",
    // SafeAreaView (react-native core) only applies real inset padding on iOS,
    // which shrinks the centered card's box and exposes more of this fixed
    // decorative circle underneath it than on Android. Tuck it further down
    // on iOS so the exposed amount matches the Android/design intent.
    bottom: Platform.select({ ios: -190, default: -140 }),
    left: 30,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 20,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  formContainer: {
    flexGrow: 1,
    width: "100%",
    justifyContent: 'center',
    gap: 18,
    paddingTop: 60,
    paddingBottom: 60,
  },
  card: {
    width: "100%",
    maxWidth: 540,
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    gap: 18,
  },
  title: {
    fontSize: rf(34, 24, 34),
    fontWeight: "700",
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  roleButtonActive: {
    borderColor: "transparent",
  },
  roleButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    height: 52,
    borderRadius: 18,
    backgroundColor: "#f7f2ee",
    borderColor: "#e1d5c8",
    borderWidth: 1,
    paddingHorizontal: 16,
    color: "#000",
  },
  inputError: {
    borderColor: errorColor,
    borderWidth: 2,
  },
  errorText: {
    color: errorColor,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  passwordInputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    padding: 8,
  },
  eyeIconText: {
    fontSize: 20,
  },
  button: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  buttonDisabled: {
    backgroundColor: "#a8a1c7",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryText: {
    color: accent,
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  modalClose: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#333",
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#2ecc71",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  checkMark: {
    color: "#fff",
    fontSize: 44,
    fontWeight: "700",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 18,
  },
  modalSubtitle: {
    height: 8,
  },
  modalOkButton: {
    marginTop: 6,
    backgroundColor: "#2ecc71",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOkText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // ── Site / Hospital pickers ─────────────────────────────────────────────
  optionList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  optionItemSelected: {
    backgroundColor: "rgba(79,91,177,0.08)",
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  },
  optionRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  optionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#aaa",
    alignItems: "center",
    justifyContent: "center",
  },
  optionCheckmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
});
