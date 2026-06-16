import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/services/authService";

export default function AddImagePage() {
  const router = useRouter();
  const theme = useTheme();
  const { token } = useAuth();
  const params = useLocalSearchParams();
  const worksiteId = params.worksiteId;

  const [workers, setWorkers] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [images, setImages] = useState<Record<number, string | null>>({
    1: null,
    2: null,
    3: null,
  });

  const pickImage = async (index: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(prev => ({ ...prev, [index]: result.assets[0].uri }));
    }
  };

  const handleProceed = async () => {
    if (!worksiteId) {
      alert("Missing worksite ID");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (workers) {
        formData.append("workers_count", workers);
      }
      if (date) {
        formData.append("report_date", date);
      }

      const appendImage = async (index: number) => {
        if (images[index]) {
          const uri = images[index] as string;
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append(`image_${index}`, blob, `image_${index}.jpg`);
        }
      };

      await appendImage(1);
      await appendImage(2);
      await appendImage(3);

      const response = await fetch(`${API_BASE_URL}/worksites/${worksiteId}/reports`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to save report");
      }

      setShowSuccess(true);
    } catch (error) {
      console.error(error);
      alert("Failed to upload. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>Back</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            Add Image
          </ThemedText>
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.fieldRow}>
            <ThemedText type="small">No of workers</ThemedText>
            <TextInput
              value={workers}
              onChangeText={setWorkers}
              placeholder="no. of workers count"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
              keyboardType="number-pad"
            />
          </View>

          {[1, 2, 3].map((index) => (
            <View key={index} style={styles.fieldRow}>
              <ThemedText type="small">Image {index}</ThemedText>
              <Pressable 
                style={[styles.uploadButton, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} 
                onPress={() => pickImage(index)}
              >
                {images[index] ? (
                  <Image source={{ uri: images[index]! }} style={styles.previewImage} />
                ) : (
                  <Text style={[styles.uploadText, { color: theme.textSecondary }]}>Upload</Text>
                )}
              </Pressable>
            </View>
          ))}

          <View style={styles.fieldRow}>
            <ThemedText type="small">Date</ThemedText>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY.MM.DD"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, color: theme.text }]}
            />
          </View>

          <Pressable
            style={[styles.proceedButton, isSubmitting && styles.proceedButtonDisabled]}
            onPress={handleProceed}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.proceedText}>Proceed</Text>
            )}
          </Pressable>
        </View>

        <Modal visible={showSuccess} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                style={styles.modalClose}
                onPress={() => setShowSuccess(false)}
              >
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </Pressable>

              <View style={styles.successCircle}>
                <Text style={styles.checkMark}>✓</Text>
              </View>

              <ThemedText type="subtitle" style={styles.modalTitle}>
                Data Saved Successfully!
              </ThemedText>

              <Pressable
                style={styles.modalOkButton}
                onPress={() => {
                  setShowSuccess(false);
                  router.back();
                }}
              >
                <Text style={styles.modalOkText}>Ok</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    justifyContent: "flex-start",
  },
  header: { 
    width: "100%", 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: Spacing.four, 
    justifyContent: "center",
    position: "relative"
  },
  backButton: {
    position: "absolute",
    left: 0,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  backText: {
    fontWeight: "700",
  },
  title: { textAlign: "center" },
  card: {
    width: "100%",
    marginTop: Spacing.four,
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    gap: 12,
  },
  fieldRow: { gap: 8 },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  uploadButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  uploadText: { fontWeight: "600" },
  proceedButton: {
    marginTop: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5c46f0",
    alignItems: "center",
    justifyContent: "center",
  },
  proceedButtonDisabled: {
    opacity: 0.7,
  },
  proceedText: { color: "#fff", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
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
  modalCloseText: { fontSize: 18 },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#1bcf4a",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  checkMark: { color: "#fff", fontSize: 44, fontWeight: "700" },
  modalTitle: {
    textAlign: "center",
    marginBottom: 18,
  },
  modalOkButton: {
    marginTop: 6,
    backgroundColor: "#1bcf4a",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOkText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
