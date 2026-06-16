import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Linking, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, CameraView } from 'expo-camera';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SuccessModal } from '@/components/success-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { API_BASE_URL } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

type Worksite = {
  id: number;
  name: string;
};

type Worker = {
  id: number;
  name: string;
  role: string;
  assigned_worksite_id: number | null;
  worksite?: Worksite;
  nic?: string;
  age?: number;
  join_date?: string;
  face_recognition_enabled: boolean;
};

const initialFormState = {
  name: '',
  role: '',
  assigned_worksite_id: null as number | null,
  nic: '',
  age: '',
  join_date: '',
  face_recognition_enabled: false,
};

export default function WorkersPage() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useAuth();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState<number | null>(null);
  const [filterSitePickerOpen, setFilterSitePickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [sitePickerOpen, setSitePickerOpen] = useState(false);
  const [faceRecognitionOpen, setFaceRecognitionOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [faceSuccess, setFaceSuccess] = useState(false);
  const [faceProgress, setFaceProgress] = useState(65);
  const [joinDate, setJoinDate] = useState<Date>(new Date());
  const [showJoinDatePicker, setShowJoinDatePicker] = useState(false);
  const [formValues, setFormValues] = useState(initialFormState);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [selectedViewWorker, setSelectedViewWorker] = useState<Worker | null>(null);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null); // face photo to upload
  const [uploadingFace, setUploadingFace] = useState(false);
  const cameraRef = useRef<any>(null);
  const webDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchData = async () => {
      const authHeader = { Authorization: `Bearer ${token}` };

      const worksiteResponse = await fetch(`${API_BASE_URL}/worksites`, {
        headers: { Accept: 'application/json', ...authHeader },
      });
      const worksiteData = await worksiteResponse.json();
      setWorksites(Array.isArray(worksiteData) ? worksiteData : worksiteData.data || []);

      const workerResponse = await fetch(`${API_BASE_URL}/workers`, {
        headers: { Accept: 'application/json', ...authHeader },
      });
      const workerData = await workerResponse.json();
      setWorkers(Array.isArray(workerData) ? workerData : workerData.data || []);
    };

    fetchData().catch(console.error);
  }, [token]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesSearch = worker.name.toLowerCase().includes(search.toLowerCase());
      const matchesSite = siteFilter ? worker.assigned_worksite_id === siteFilter : true;
      return matchesSearch && matchesSite;
    });
  }, [workers, search, siteFilter]);

  const openAddWorker = () => {
    setSelectedWorker(null);
    setIsEditing(false);
    setFormValues(initialFormState);
    setJoinDate(new Date());
    setShowJoinDatePicker(false);
    setFormOpen(true);
  };

  const openEditWorker = (worker: Worker) => {
    setSelectedWorker(worker);
    setIsEditing(true);
    const parsedJoinDate = worker.join_date ? new Date(worker.join_date) : new Date();
    setFormValues({
      name: worker.name,
      role: worker.role,
      assigned_worksite_id: worker.assigned_worksite_id,
      nic: worker.nic ?? '',
      age: worker.age?.toString() ?? '',
      join_date: worker.join_date ?? '',
      face_recognition_enabled: worker.face_recognition_enabled,
    });
    setJoinDate(parsedJoinDate);
    setShowJoinDatePicker(false);
    setFormOpen(true);
  };

  const openFaceRecognition = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status === 'granted') {
      setHasCameraPermission(true);
      setFaceRecognitionOpen(true);
      setFaceSuccess(false);
      setFaceProgress(65);
      setPhotoUri(null);
      setCameraReady(false);
    } else {
      setHasCameraPermission(false);
      Alert.alert(
        'Camera permission required',
        'This feature needs camera access. Please allow camera permission.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
    }
  };

  const closeFaceRecognition = () => {
    setFaceRecognitionOpen(false);
    setFaceSuccess(false);
    setFaceProgress(65);
    setPhotoUri(null);
  };

  const handleRetryFace = () => {
    setFaceSuccess(false);
    setPhotoUri(null);
    setFaceProgress(30);
  };

  const captureFacePhoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.6, base64: false });
      setPhotoUri(photo.uri);
      setFaceProgress(80);
    } catch (error) {
      Alert.alert('Capture failed', 'Unable to capture the photo. Please try again.');
    }
  };

  const handleMarkFace = async () => {
    if (!photoUri) {
      await captureFacePhoto();
      return;
    }
    // Store the photo URI to upload after worker is saved
    setPendingPhotoUri(photoUri);
    setFaceSuccess(true);
    setFaceProgress(100);
    setFormValues((prev) => ({
      ...prev,
      face_recognition_enabled: true,
    }));
  };

  const handleSaveWorker = async () => {
    if (!token) {
      return;
    }

    const payload = {
      name: formValues.name,
      role: formValues.role,
      assigned_worksite_id: formValues.assigned_worksite_id,
      phone: null,
      status: 'active',
      nic: formValues.nic,
      age: formValues.age ? Number(formValues.age) : null,
      join_date: formValues.join_date || joinDate.toISOString().split('T')[0],
      face_recognition_enabled: formValues.face_recognition_enabled,
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing && selectedWorker
      ? `${API_BASE_URL}/workers/${selectedWorker.id}`
      : `${API_BASE_URL}/workers`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const savedWorker = await response.json();
    if (response.ok) {
      const savedId = savedWorker.id;

      // Upload face photo to face service if one was captured
      if (pendingPhotoUri && savedId) {
        try {
          setUploadingFace(true);
          const formData = new FormData();
          const fileName = pendingPhotoUri.split('/').pop() || 'photo.jpg';
          const ext = fileName.split('.').pop() || 'jpg';
          const mimeType = `image/${ext}`;

          if (Platform.OS === 'web') {
            const res = await fetch(pendingPhotoUri);
            const blob = await res.blob();
            formData.append('photo', blob, fileName);
          } else {
            formData.append('photo', {
              uri: pendingPhotoUri,
              name: fileName,
              type: mimeType,
            } as any);
          }

          await fetch(`${API_BASE_URL}/workers/${savedId}/upload-face`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            body: formData,
          });
        } catch (err) {
          console.warn('Face upload error:', err);
        } finally {
          setUploadingFace(false);
          setPendingPhotoUri(null);
        }
      }

      setFormOpen(false);
      setSelectedWorker(null);
      setIsEditing(false);
      setWorkers((prev) => {
        if (isEditing && selectedWorker) {
          return prev.map((worker) => (worker.id === selectedWorker.id ? savedWorker : worker));
        }
        return [savedWorker, ...prev];
      });
      setSuccessMessage(isEditing ? 'Worker Updated Successfully!' : 'Worker Added Successfully!');
    }
  };

  const handleDeleteWorker = async (workerId: number) => {
    if (!token) {
      return;
    }

    const res = await fetch(`${API_BASE_URL}/workers/${workerId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      Alert.alert('Delete failed', errorBody.message || 'Unable to delete worker.');
      return;
    }

    setWorkers((prev) => prev.filter((worker) => worker.id !== workerId));
    setSuccessMessage('Worker Deleted Successfully!');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Pressable style={[styles.backButton, { backgroundColor: theme.backgroundSelected }]} onPress={() => router.back()}>
            <ThemedText type="smallBold">←</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.pageTitle}>
            Workers
          </ThemedText>
          
        </View>

        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}> 
          <View style={styles.topControls}>
            <Pressable style={[styles.addButton, { backgroundColor: theme.backgroundSelected }]} onPress={openAddWorker}>
              <ThemedText type="smallBold">+ Add Workers</ThemedText>
            </Pressable>
            <View style={styles.filtersRow}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Here"
                  placeholderTextColor={theme.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <View style={[styles.inputGroup, { zIndex: 10 }]}>
                <Pressable style={styles.dropdownButton} onPress={() => setFilterSitePickerOpen((prev) => !prev)}>
                  <Text style={styles.dropdownText}>
                    {siteFilter ? worksites.find((site) => site.id === siteFilter)?.name : 'Site Selection'}
                  </Text>
                </Pressable>
                {filterSitePickerOpen && (
                  <View style={[styles.siteOptions, { position: 'absolute', top: 40, left: 0, right: 0, zIndex: 20 }]}>
                    <Pressable
                      style={styles.siteOption}
                      onPress={() => {
                        setSiteFilter(null);
                        setFilterSitePickerOpen(false);
                      }}
                    >
                      <Text style={styles.siteOptionText}>All Sites</Text>
                    </Pressable>
                    {worksites.map((site) => (
                      <Pressable
                        key={site.id}
                        style={styles.siteOption}
                        onPress={() => {
                          setSiteFilter(site.id);
                          setFilterSitePickerOpen(false);
                        }}
                      >
                        <Text style={styles.siteOptionText}>{site.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: '100%' }}>
              <View style={styles.tableHeader}>
            <Text style={[styles.columnHeader, { width: 60, minWidth: 60, flex: 0 }]}>ID</Text>
            <Text style={styles.columnHeader}>Name</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Site</Text>
            <Text style={[styles.columnHeader, { width: 120, minWidth: 120, flex: 0 }]}>Type</Text>
            <Text style={styles.columnHeaderRight}>Actions</Text>
          </View>

          <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
            {filteredWorkers.map((worker) => (
              <View key={worker.id} style={styles.tableRow}>
                <Text style={[styles.rowCell, { width: 60, minWidth: 60, flex: 0 }]} numberOfLines={1}>{worker.id}</Text>
                <Text style={styles.rowCell} numberOfLines={1}>{worker.name}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{worker.worksite?.name ?? 'Unassigned'}</Text>
                <Text style={[styles.rowCell, { width: 120, minWidth: 120, flex: 0 }]} numberOfLines={1}>{worker.role}</Text>
                <View style={styles.actionsColumn}>
                  <Pressable style={styles.actionButtonIcon} onPress={() => { setSelectedViewWorker(worker); setViewDetailsOpen(true); }}>
                    <Text style={styles.actionIcon}>👁</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIcon} onPress={() => openEditWorker(worker)}>
                    <Text style={styles.actionIcon}>✎</Text>
                  </Pressable>
                  <Pressable style={styles.actionButtonIconDelete} onPress={() => handleDeleteWorker(worker.id)}>
                    <Text style={styles.actionIcon}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
            </View>
          </ScrollView>
        </View>

        {formOpen && (
          <View style={styles.formOverlay}>
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <ThemedText type="title">{isEditing ? 'Update Worker' : 'Add Workers'}</ThemedText>
                <Pressable onPress={() => setFormOpen(false)}>
                  <Text style={styles.closeText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.formBody} showsVerticalScrollIndicator={false}>
                <View style={[styles.fieldRow, { zIndex: sitePickerOpen ? 100 : 1 }]}>
                  <Text style={styles.fieldLabel}>Site Selection</Text>
                  <Pressable style={styles.selectInput} onPress={() => setSitePickerOpen((prev) => !prev)}>
                    <Text style={styles.selectText}>
                      {formValues.assigned_worksite_id
                        ? worksites.find((site) => site.id === formValues.assigned_worksite_id)?.name
                        : 'Site Selection'}
                    </Text>
                  </Pressable>
                  {sitePickerOpen && (
                    <View style={[styles.siteOptions, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>
                      {worksites.map((site) => (
                        <Pressable
                          key={site.id}
                          style={styles.siteOption}
                          onPress={() => {
                            setFormValues((prev) => ({
                              ...prev,
                              assigned_worksite_id: site.id,
                            }));
                            setSitePickerOpen(false);
                          }}
                        >
                          <Text style={styles.siteOptionText}>{site.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type"
                  value={formValues.role}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, role: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Full Name"
                  value={formValues.name}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, name: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="NIC no:"
                  value={formValues.nic}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, nic: value }))}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Age"
                  keyboardType="numeric"
                  value={formValues.age}
                  onChangeText={(value) => setFormValues((prev) => ({ ...prev, age: value }))}
                />
                {Platform.OS === 'web' ? (
                  <View style={styles.fieldRow}>
                    <Text style={styles.fieldLabel}>Join Date</Text>
                    <Pressable
                      style={[styles.pill, { backgroundColor: theme.background }]}
                      onPress={() => {
                        webDateInputRef.current?.showPicker?.();
                        webDateInputRef.current?.click();
                      }}
                    >
                      <Text style={styles.pillText}>
                        {formValues.join_date || joinDate.toISOString().split('T')[0]}
                      </Text>
                    </Pressable>
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={formValues.join_date || joinDate.toISOString().split('T')[0]}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setFormValues((prev) => ({ ...prev, join_date: value }));
                        const parsedDate = new Date(value);
                        if (!Number.isNaN(parsedDate.getTime())) {
                          setJoinDate(parsedDate);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 1,
                        height: 1,
                        zIndex: -1,
                        pointerEvents: 'none',
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Join Date</Text>
                      <Pressable
                        style={[styles.pill, { backgroundColor: theme.background }]}
                        onPress={() => setShowJoinDatePicker(true)}
                      >
                        <Text style={styles.pillText}>
                          {joinDate.toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </Pressable>
                    </View>
                    {showJoinDatePicker && (
                      <DateTimePicker
                        value={joinDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_event, selectedDate) => {
                          setShowJoinDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            setJoinDate(selectedDate);
                            setFormValues((prev) => ({
                              ...prev,
                              join_date: selectedDate.toISOString().split('T')[0],
                            }));
                          }
                        }}
                      />
                    )}
                  </>
                )}
                <View style={styles.faceRow}>
                  <Text style={styles.fieldLabel}>Set Face Recognition</Text>
                  <Pressable style={styles.faceButton} onPress={openFaceRecognition}>
                    <Text style={styles.faceButtonText}>Open Face Recognition</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.saveButton} onPress={handleSaveWorker}>
                  <Text style={styles.saveText}>Save Details!</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        )}

        {faceRecognitionOpen && (
          <View style={styles.faceOverlay}>
            <View style={styles.faceCard}>
              <View style={styles.faceHeader}>
                <Text style={styles.faceTitle}>Set Face Recognition</Text>
                <Pressable onPress={closeFaceRecognition} style={styles.faceCloseButton}>
                  <Text style={styles.faceCloseText}>✕</Text>
                </Pressable>
              </View>

              <Text style={styles.faceSubtitle}>Keep Your eyes open</Text>

              <View style={styles.facePreviewCard}>
                {!faceSuccess ? (
                  <View style={styles.facePreviewBox}>
                    {hasCameraPermission === false ? (
                      <View style={styles.faceFrame}>
                        <Text style={styles.faceFrameText}>Camera permission denied</Text>
                      </View>
                    ) : photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.facePreviewImage} />
                    ) : (
                      <CameraView
                        style={styles.facePreviewCamera}
                        ref={(ref) => {
                          cameraRef.current = ref;
                        }}
                        onCameraReady={() => setCameraReady(true)}
                        ratio="4:3"
                      >
                        {!cameraReady && (
                          <View style={styles.cameraLoadingOverlay}>
                            <ActivityIndicator size="large" color="#fff" />
                            <Text style={styles.faceFrameText}>Starting camera...</Text>
                          </View>
                        )}
                      </CameraView>
                    )}
                  </View>
                ) : (
                  <View style={styles.faceSuccessBox}>
                    <Text style={styles.faceSuccessIcon}>✓</Text>
                    <Text style={styles.faceSuccessText}>Face Recognition Successfully!</Text>
                    <Pressable style={styles.faceOkButton} onPress={closeFaceRecognition}>
                      <Text style={styles.faceOkText}>Ok</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {!faceSuccess && (
                <View style={styles.faceProgressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${faceProgress}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{faceProgress}%</Text>
                </View>
              )}

              {!faceSuccess && (
                <View style={styles.faceButtonsRow}>
                  <Pressable style={styles.faceRetryButton} onPress={handleRetryFace}>
                    <Text style={styles.faceRetryText}>&lt;&lt;Retry&gt;&gt;</Text>
                  </Pressable>
                  <Pressable style={styles.faceMarkButton} onPress={handleMarkFace}>
                    <Text style={styles.faceMarkText}>&lt;&lt;Mark&gt;&gt;</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        )}

        <Modal visible={viewDetailsOpen} transparent animationType="fade" onRequestClose={() => setViewDetailsOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">Worker Details</ThemedText>
                <Pressable onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedViewWorker && (
                  <>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Name</ThemedText>
                      <ThemedText>{selectedViewWorker.name}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Role</ThemedText>
                      <ThemedText>{selectedViewWorker.role}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Worksite</ThemedText>
                      <ThemedText>{selectedViewWorker.worksite?.name ?? 'Unassigned'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>NIC</ThemedText>
                      <ThemedText>{selectedViewWorker.nic ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Age</ThemedText>
                      <ThemedText>{selectedViewWorker.age ?? '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Join Date</ThemedText>
                      <ThemedText>{selectedViewWorker.join_date ? new Date(selectedViewWorker.join_date).toLocaleDateString() : '—'}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <ThemedText type="subtitle" style={styles.detailLabel}>Face Recognition</ThemedText>
                      <ThemedText>{selectedViewWorker.face_recognition_enabled ? 'Enabled' : 'Disabled'}</ThemedText>
                    </View>
                  </>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.modalButton, { backgroundColor: '#3b82f6' }]} onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.modalButtonText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
        <SuccessModal
          visible={!!successMessage}
          title={successMessage ?? ''}
          onClose={() => setSuccessMessage(null)}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    paddingBottom: BottomTabInset,
    backgroundColor: theme.background,
  },
  safeArea: {
    flex: 1,
    gap: Spacing.three,
  width: '100%',
  maxWidth: MaxContentWidth,
  alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: 40,
  },
  backButton: {
    padding: Spacing.two,
    borderRadius: 14,
  },
  salariesButton: {
    padding: Spacing.two,
    borderRadius: 14,
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    color: theme.text,
  },
  card: {
    borderRadius: 30,
    padding: Spacing.four,
    gap: Spacing.three,
    minHeight: 520,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
    backgroundColor: theme.backgroundElement,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 24,
    minWidth: 120,
  },
  filtersRow: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    minWidth: 200,
  flexWrap: 'wrap',
  },
  inputGroup: {
    flex: 1,
    minWidth: 100,
  },
  searchInput: {
    width: '100%',
    padding: Spacing.two,
    borderRadius: 24,
    backgroundColor: theme.background,
    color: theme.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  dropdownButton: {
    width: '100%',
    padding: Spacing.two,
    borderRadius: 24,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  dropdownText: {
    color: theme.text,
    fontSize: 13,
    maxWidth: 100,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 2,
    borderColor: theme.backgroundSelected,
    backgroundColor: theme.background,
    gap: Spacing.two,
  },
  columnHeader: {
      flex: 1,
      minWidth: 120,
    fontWeight: '700',
    color: theme.text,
    fontSize: 13,
  },
  columnHeaderRight: {
    minWidth: 120,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.text,
    fontSize: 13,
  },
  tableBody: {
    marginTop: Spacing.two,
    maxHeight: 340,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderColor: theme.backgroundSelected,
    gap: Spacing.one,
  },
  rowCell: {
      flex: 1,
      minWidth: 120,
    color: theme.text,
    fontSize: 13,
    },
    
  
  actionsColumn: {
    minWidth: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  actionButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonIconDelete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  formOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  formCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 32,
    backgroundColor: theme.backgroundElement,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  closeText: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  formBody: {
    gap: Spacing.three,
  },
  fieldRow: {
    marginBottom: Spacing.two,
  },
  fieldLabel: {
    marginBottom: Spacing.one,
    color: theme.text,
    fontWeight: '700',
  },
  selectInput: {
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  selectText: {
    color: theme.text,
  },
  textInput: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: 24,
    backgroundColor: theme.background,
    color: theme.text,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  pill: {
    borderRadius: 24,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
  },
  pillText: {
    color: theme.text,
    fontSize: 13,
  },
  faceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  faceButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
    backgroundColor: '#10b981',
    minWidth: 150,
    alignItems: 'center',
  },
  faceButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  faceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  faceCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.backgroundElement,
    borderRadius: 30,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: theme.backgroundSelected,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  faceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  faceTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.text,
  },
  faceCloseButton: {
    padding: Spacing.two,
    borderRadius: 16,
    backgroundColor: theme.backgroundSelected,
  },
  faceCloseText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  faceSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
    color: theme.textSecondary,
  },
  facePreviewCard: {
    borderRadius: 26,
    backgroundColor: theme.backgroundElement,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  facePreviewBox: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#22c55e',
    backgroundColor: theme.backgroundSelected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: '90%',
    height: '90%',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  facePreviewCamera: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    overflow: 'hidden',
  },
  facePreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  faceFrameText: {
    color: theme.textSecondary,
    fontWeight: '700',
  },
  faceSuccessBox: {
    width: '100%',
    minHeight: 260,
    borderRadius: 24,
    backgroundColor: theme.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  faceSuccessIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#22c55e',
    textAlign: 'center',
    lineHeight: 88,
    color: '#fff',
    fontSize: 42,
    fontWeight: '700',
  },
  faceSuccessText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    textAlign: 'center',
  },
  faceOkButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: 22,
    backgroundColor: '#9ca3af',
  },
  faceOkText: {
    color: '#fff',
    fontWeight: '700',
  },
  faceProgressRow: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  progressTrack: {
    width: '100%',
    height: 18,
    borderRadius: 18,
    backgroundColor: theme.backgroundSelected,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa',
  },
  progressLabel: {
    marginTop: Spacing.two,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.text,
  },
  faceButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  faceRetryButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 24,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  faceRetryText: {
    color: '#fff',
    fontWeight: '700',
  },
  faceMarkButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    borderRadius: 24,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  faceMarkText: {
    color: '#fff',
    fontWeight: '700',
  },
  siteOptions: {
    marginTop: Spacing.two,
    borderRadius: 20,
    backgroundColor: theme.backgroundSelected,
    overflow: 'hidden',
  },
  siteOption: {
    padding: Spacing.three,
    borderBottomWidth: 1,
    borderColor: theme.background,
  },
  siteOptionText: {
    color: theme.text,
  },
  
  faceToggleText: {
    color: theme.text,
    fontWeight: '700',
  },
  saveButton: {
    marginTop: Spacing.two,
    alignSelf: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: 28,
    backgroundColor: '#f59e0b',
  },
  saveText: {
    color: '#fff',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalCloseButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  detailRow: {
    marginBottom: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailLabel: {
    marginBottom: Spacing.one,
  },
  modalFooter: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },
  modalButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 8,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
