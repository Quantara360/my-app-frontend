import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/use-theme";
import { MaxContentWidth } from '@/constants/theme';

const accent = "#4f5bb1";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const getLandingRoute = (role?: string) => {
    return role === "admin" ? "/admin" : "/dashboard";
  };

  useEffect(() => {
    if (user) {
      router.replace(getLandingRoute(user.role) as any);
    }
  }, [user, router]);

  const canSubmit = email.trim().length > 0 && password.trim().length > 0;

  async function handleLogin() {
    if (!canSubmit) return;
    setAuthError(null);

    try {
      const result = await signIn({ email, password, remember: rememberMe });
      router.replace(getLandingRoute(result.user.role) as any);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in");
    }
  }

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
            <Text style={[styles.title, { color: theme.text }]}>Login</Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, styles.passwordInput, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
                secureTextEntry={!showPassword}
                returnKeyType="done"
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
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && <View style={styles.checkboxInner} />}
            </View>
            <Text style={[styles.rememberText, { color: theme.textSecondary }]}>Remember me</Text>
          </Pressable>

          {authError ? (
            <Text style={styles.errorText}>{authError}</Text>
          ) : null}

          <Pressable
            style={[
              styles.loginButton,
              !canSubmit && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={!canSubmit}
          >
            <Text style={styles.loginText}>Login</Text>
          </Pressable>

          <View style={styles.registerRow}>
            <Text style={[styles.hintText, { color: theme.textSecondary }]}>Don't have an Account? </Text>
            <Link href="/register" asChild>
              <Pressable>
                <Text style={[styles.registerLink, { color: accent }]}>Register</Text>
              </Pressable>
            </Link>
          </View>
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
    opacity: 0.4,
  },
  circleOne: {
    width: 260,
    height: 260,
    backgroundColor: "#d4b79f",
    top: -80,
    left: -60,
  },
  circleTwo: {
    width: 180,
    height: 180,
    backgroundColor: "#f1d3b3",
    top: 120,
    right: -70,
  },
  circleThree: {
    width: 300,
    height: 300,
    backgroundColor: "#8b6f5d",
    bottom: -120,
    left: 40,
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
    maxWidth: 520,
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
    marginBottom: 6,
  },
  field: {
    gap: 8,
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#d5b7a0",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: accent,
    backgroundColor: accent,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  rememberText: {
    color: "#6d5f55",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 14,
  },
  hintText: {
    color: "#6d5f55",
    fontSize: 13,
  },
  registerLink: {
    color: accent,
    fontSize: 13,
    fontWeight: "700",
  },
});
