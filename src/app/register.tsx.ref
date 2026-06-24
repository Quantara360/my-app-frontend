import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { registerWithApi, type UserRole } from "@/services/authService";
import { useTheme } from "@/hooks/use-theme";
import { MaxContentWidth } from '@/constants/theme';

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("supervisor");
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const isUserNameValid = validateUserName(userName);
  const isEmailValid = validateEmail(email);
  const isPasswordValid = validatePassword(password);
  const isPasswordMatchValid = validatePasswordMatch(password, confirmPassword);

  const canSubmit =
    userName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    isUserNameValid &&
    isEmailValid &&
    isPasswordValid &&
    isPasswordMatchValid;

  return (
    <View style={[styles.page, { backgroundColor: theme.background }]}> 
      <View style={[StyleSheet.absoluteFill, styles.backgroundLayerBackground, { backgroundColor: theme.background }]}> 
        <View style={[styles.circle, styles.circleOne]} />
        <View style={[styles.circle, styles.circleTwo]} />
        <View style={[styles.circle, styles.circleThree]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
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
            <Text style={[styles.label, { color: theme.textSecondary }]}>User Name</Text>
            <TextInput
              value={userName}
              onChangeText={setUserName}
              placeholder="Enter your user name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, !isUserNameValid && styles.inputError, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
              autoCapitalize="none"
              keyboardType="default"
              returnKeyType="next"
            />
            {!isUserNameValid && userName.length > 0 && (
              <Text style={styles.errorText}>
                Username must be at least 3 characters and contain letters
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
                  email,
                  password,
                  role,
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
    bottom: -140,
    left: 30,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  maxWidth: MaxContentWidth,
  alignSelf: 'center',
  },
  formContainer: {
    flexGrow: 1,
    width: "100%",
    justifyContent: "center",
    gap: 18,
    paddingVertical: 24,
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
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
  },
  field: {
    gap: 8,
  },
  roleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  roleButton: {
    flexBasis: "30%",
    minWidth: 98,
    flexGrow: 1,
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
});
