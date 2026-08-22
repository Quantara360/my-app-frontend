import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { SafeView } from "@/components/safe-view";
import { BackgroundPattern } from "@/components/BackgroundPattern";
import { ConfirmModal } from "@/components/confirm-modal";
import { WorkerIdCardModal, IdCardWorker } from "@/components/WorkerIdCardModal";
import { resolveShiftConfig, timeToMinutes, computeShiftWindowSummaries, DEFAULT_SHIFT_CONFIG, ShiftConfig } from "@/utils/shiftConfig";
import { SelectInput } from "@/components/ui/select-input";
import { DateInput } from "@/components/ui/date-input";
import { TimeInput } from "@/components/ui/time-input";
import { BottomTabInset, Spacing, rf, MaxContentWidth } from "@/constants/theme";


import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useRef, useState } from "react";
import * as AssetsService from "@/services/adminAssetsService";
import * as ChemicalsService from "@/services/adminChemicalsService";
import * as MachineriesService from "@/services/adminMachineriesService";
import * as WorkersService from "@/services/adminWorkersService";
import * as ApprovalsService from "@/services/adminApprovalsService";
import * as PersonalAssetsService from "@/services/adminPersonalAssetsService";
import * as PersonalDocumentsService from "@/services/adminPersonalDocumentsService";
import * as AttendancesService from "@/services/adminAttendancesService";
import { getCashInHandEntries, createCashInHandEntry, updateCashInHandEntry, deleteCashInHandEntry, getBankEntries, createBankEntry, updateBankEntry, deleteBankEntry, createAccountTransfer } from "@/services/accountsService";
import { exportLedgerToExcel } from "@/utils/exportLedger";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL, getAuthHeaders } from "@/services/authService";
import { useTheme } from "@/hooks/use-theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";

interface AdminCard {
  id: string;
  title: string;
  value: number | string;
  icon: string;
  backgroundColor: string;
  textColor: string;
}

export default function AdminDashboard() {
  const theme = useTheme();
  const { signOut, user, updateUser } = useAuth();
  const [selectedSite, setSelectedSite] = useState("Site Selection");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = React.useMemo(() => createStyles(isDark), [isDark]);

  // Admin profile state
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (user) {
      setAdminName(user.name || "");
      setAdminEmail(user.email || "");
    }
  }, [user]);

  // Create animated values for each card
  const cardScaleValues = React.useRef<{ [key: string]: Animated.Value }>(
    {},
  ).current;

  interface MachineryRecord {
    id: string | number;
    machine: string;
    status: string;
    description: string;
    worksite_id?: number | null;
  }

  interface AssetRecord {
    id: string | number;
    name: string;
    count: number;
    value: string;
    status?: string;
    worksite_id?: number | null;
  }

  interface WorkerRecord {
    id: string | number;
    name: string;
    site?: string;
    type?: string;
    status?: string;
    role?: string;
    worksite?: { name: string };
  }

  interface ApprovalRecord {
    id: string | number;
    description: string;
    amount: string;
    date: string;
    holder: string;
    status?: string;
  }

  interface VehicleRecord {
    id: string | number;
    name: string;
    type: string;
    value: string;
    plateNo: string;
  }

  interface JewelleryRecord {
    id: string | number;
    name: string;
    value: string;
    weight: string;
  }

  interface PropertyRecord {
    id: string | number;
    location: string;
    value: string;
    area: string;
  }

  interface Worksite {
    id: number;
    name: string;
    type?: string;
    parent_id?: number | null;
  }

  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "machineries"
    | "assets"
    | "chemicals"
    | "approvals"
    | "workers"
    | "personal"
    | "personalAssets"
    | "personalSelection"
    | "personalDocuments"
    | "manageSite"
    | "attendance"
    | "adminAccounts"
    | "adminCashInHand"
    | "adminBank"
  >("dashboard");

  // ── Admin Accounts: Cash-in-Hand state ────────────────────────────────────
  type AdminCashEntry = {
    id: number;
    date: string;
    chequeNo: string;
    description: string;
    debit: number | null;
    credit: number | null;
    balance: number;
    /** Set on both legs of a Bank<->Cash transfer, shared between them - null for a normal entry. */
    linkedTransferId: string | null;
  };
  type AdminBankEntry = AdminCashEntry;

  const getAdminSriLankaDate = (): string => {
    const now = new Date();
    const local = new Date(now.getTime() + 330 * 60 * 1000);
    return local.toISOString().slice(0, 10);
  };

  const [adminCashEntries, setAdminCashEntries] = useState<AdminCashEntry[]>([]);
  const [adminCashSearch, setAdminCashSearch] = useState("");
  const [adminCashSortOrder, setAdminCashSortOrder] = useState<"asc" | "desc">("asc");
  const [adminCashAddModalOpen, setAdminCashAddModalOpen] = useState(false);
  const [adminCashSuccessVisible, setAdminCashSuccessVisible] = useState(false);
  const [adminCashTransactionType, setAdminCashTransactionType] = useState<"debit" | "credit">("debit");
  const [adminCashEditingId, setAdminCashEditingId] = useState<number | null>(null);
  const [adminCashDeleteConfirm, setAdminCashDeleteConfirm] = useState<AdminCashEntry | null>(null);
  const [adminCashForm, setAdminCashForm] = useState({
    date: "",
    chequeNo: "",
    description: "",
    amount: "",
    prevBalance: "0.00",
  });
  const [adminCashTransferModalOpen, setAdminCashTransferModalOpen] = useState(false);
  const [adminCashTransferSaving, setAdminCashTransferSaving] = useState(false);
  const [adminCashTransferForm, setAdminCashTransferForm] = useState({
    date: "",
    chequeNo: "",
    amount: "",
  });

  const [adminBankEntries, setAdminBankEntries] = useState<AdminBankEntry[]>([]);
  const [adminBankSearch, setAdminBankSearch] = useState("");
  const [adminBankSortOrder, setAdminBankSortOrder] = useState<"asc" | "desc">("asc");
  const [adminBankAddModalOpen, setAdminBankAddModalOpen] = useState(false);
  const [adminBankSuccessVisible, setAdminBankSuccessVisible] = useState(false);
  const [adminBankTransactionType, setAdminBankTransactionType] = useState<"debit" | "credit">("debit");
  const [adminBankEditingId, setAdminBankEditingId] = useState<number | null>(null);
  const [adminBankDeleteConfirm, setAdminBankDeleteConfirm] = useState<AdminBankEntry | null>(null);
  const [adminBankForm, setAdminBankForm] = useState({
    date: "",
    chequeNo: "",
    description: "",
    amount: "",
    prevBalance: "0.00",
  });
  const [adminBankTransferModalOpen, setAdminBankTransferModalOpen] = useState(false);
  const [adminBankTransferSaving, setAdminBankTransferSaving] = useState(false);
  const [adminBankTransferForm, setAdminBankTransferForm] = useState({
    date: "",
    chequeNo: "",
    amount: "",
  });
  // ──────────────────────────────────────────────────────────────────────────

  // API data state
  const [machineries, setMachineries] = useState<MachineryRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [jewelleries, setJewelleries] = useState<JewelleryRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [attendances, setAttendances] = useState<
    AttendancesService.AttendanceRecord[]
  >([]);
  // Inline ID card viewer, opened from the attendance table's "ID Card" button.
  const [adminIdCardWorker, setAdminIdCardWorker] = useState<IdCardWorker | null>(null);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [mainSites, setMainSites] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [subSites, setSubSites] = useState<any[]>([]);
  const [worksitesRefreshing, setWorksitesRefreshing] = useState(false);

  // ── Hospital Shifts panel ──────────────────────────────────────────────
  const [shiftsWorksiteFilter, setShiftsWorksiteFilter] = useState<string>("All");
  const [shiftEditHospital, setShiftEditHospital] = useState<any | null>(null);
  const [shiftDefaults, setShiftDefaults] = useState<Record<string, string | number> | null>(null);
  const [shiftForm, setShiftForm] = useState({
    day_shift_start: "",
    day_shift_end: "",
    day_late_grace_minutes: "",
    day_early_grace_minutes: "",
    night_shift_start: "",
    night_shift_end: "",
    night_late_grace_minutes: "",
    night_early_grace_minutes: "",
  });
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftSaving, setShiftSaving] = useState(false);
  const [shiftSuccessVisible, setShiftSuccessVisible] = useState(false);

  // Search state
  const [machinerySearch, setMachinerySearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [chemicalSearch, setChemicalSearch] = useState("");
  const [approvalSearch, setApprovalSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState("All");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("All");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendanceTab, setAttendanceTab] = useState<"IN" | "OUT">("IN");

  // Modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showApprovalSuccessModal, setShowApprovalSuccessModal] =
    useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
  const [showTerminateConfirmModal, setShowTerminateConfirmModal] =
    useState(false);
  const [showTerminateSuccessModal, setShowTerminateSuccessModal] =
    useState(false);
  const [showWorkerDeleteSuccessModal, setShowWorkerDeleteSuccessModal] =
    useState(false);
  const [showSiteDeletedSuccessModal, setShowSiteDeletedSuccessModal] =
    useState(false);
  const [showAddPersonalModal, setShowAddPersonalModal] = useState(false);
  const [showPersonalEditModal, setShowPersonalEditModal] = useState(false);
  const [showAttendanceEditModal, setShowAttendanceEditModal] = useState(false);

  // Personal assets tabs
  const [selectedPersonalTab, setSelectedPersonalTab] = useState<
    "vehicles" | "jewelleries" | "properties"
  >("vehicles");
  const [selectedPersonalItem, setSelectedPersonalItem] = useState<
    VehicleRecord | JewelleryRecord | PropertyRecord | null
  >(null);

  // Form fields
  const [newPersonalName, setNewPersonalName] = useState("");
  const [newPersonalType, setNewPersonalType] = useState("");
  const [newPersonalValue, setNewPersonalValue] = useState("");
  const [newPersonalExtra, setNewPersonalExtra] = useState("");
  const [newSiteName, setNewSiteName] = useState("");

  // Drill-down navigation for Manage Sites: null=root, number=inside that site
  const [currentMainSiteId, setCurrentMainSiteId] = useState<number | null>(null);
  const [currentHospitalId, setCurrentHospitalId] = useState<number | null>(null);
  // drillLevel: 'main' | 'hospital' | 'subsite'
  const [drillLevel, setDrillLevel] = useState<'main' | 'hospital' | 'subsite'>('main');

  // Edit Site State
  const [showEditSiteModal, setShowEditSiteModal] = useState(false);
  const [selectedManageSite, setSelectedManageSite] = useState<any | null>(null);
  const [editSiteName, setEditSiteName] = useState("");

  const [siteLogoName, setSiteLogoName] = useState("");
  const [siteLogoUri, setSiteLogoUri] = useState<string | null>(null);
  const siteLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [deletedSiteName, setDeletedSiteName] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedApprovalForReject, setSelectedApprovalForReject] =
    useState<ApprovalRecord | null>(null);
  const [selectedWorkerForTermination, setSelectedWorkerForTermination] =
    useState<WorkerRecord | null>(null);
  const [successModalTitle, setSuccessModalTitle] = useState(
    "Assets Updated Successfully!",
  );
  const [successButtonText, setSuccessButtonText] = useState("Ok");
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editValue, setEditValue] = useState("");

  // Attendance edit
  const [selectedAttendance, setSelectedAttendance] =
    useState<AttendancesService.AttendanceRecord | null>(null);
  const [editAttendanceShift, setEditAttendanceShift] = useState("");
  const [editAttendanceDate, setEditAttendanceDate] = useState("");
  const [editAttendanceStatus, setEditAttendanceStatus] = useState("");

  // Notes and Files state for Personal Documents
  const [notes, setNotes] = useState<PersonalDocumentsService.PersonalNote[]>(
    [],
  );
  const [files, setFiles] = useState<PersonalDocumentsService.PersonalFile[]>(
    [],
  );
  const [newNoteText, setNewNoteText] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | number | null>(
    null,
  );
  const [newFileName, setNewFileName] = useState("");
  const [newFileType, setNewFileType] = useState<"PDF" | "WORD" | "IMG" | "">(
    "",
  );
  const [selectedFileId, setSelectedFileId] = useState<string | number | null>(
    null,
  );
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);
  const [pickedFileMime, setPickedFileMime] = useState<string | null>(null);
  const [pickedFileActualName, setPickedFileActualName] = useState<
    string | null
  >(null);

  const handlePickFile = async (type: "PDF" | "WORD" | "IMG") => {
    setNewFileType(type);
    setPickedFileUri(null);
    setPickedFileMime(null);
    setPickedFileActualName(null);
    try {
      if (type === "IMG") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "Permission required",
            "Allow media access to pick images.",
          );
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 0.85,
        });
        if (!result.canceled && result.assets.length > 0) {
          const asset = result.assets[0];
          setPickedFileUri(asset.uri);
          setPickedFileMime(asset.mimeType || "image/jpeg");
          setPickedFileActualName(asset.fileName || "image.jpg");
          if (!newFileName)
            setNewFileName(asset.fileName?.replace(/\.[^.]+$/, "") || "image");
        }
      } else {
        const mimeMap: Record<string, string> = {
          PDF: "application/pdf",
          WORD: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        const result = await DocumentPicker.getDocumentAsync({
          type: mimeMap[type] || "*/*",
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setPickedFileUri(asset.uri);
          setPickedFileMime(asset.mimeType || "application/octet-stream");
          setPickedFileActualName(asset.name);
          if (!newFileName) setNewFileName(asset.name.replace(/\.[^.]+$/, ""));
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const handleSaveNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      if (selectedNoteId) {
        const updated = await PersonalDocumentsService.updateNote(
          selectedNoteId,
          { text: newNoteText },
        );
        setNotes(notes.map((n) => (n.id === selectedNoteId ? updated : n)));
        setSelectedNoteId(null);
      } else {
        const created = await PersonalDocumentsService.createNote({
          text: newNoteText,
          date: new Date().toLocaleDateString("en-GB"),
        });
        setNotes([created, ...notes]);
      }
      setNewNoteText("");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save note");
    }
  };
  const handleEditNote = (note: any) => {
    setSelectedNoteId(note.id);
    setNewNoteText(note.text);
  };
  const handleDeleteNote = async (id: string | number) => {
    try {
      await PersonalDocumentsService.deleteNote(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to delete note");
    }
  };

  const handleSaveFile = async () => {
    if (!newFileName.trim() || !newFileType) return;
    if (!pickedFileUri && !selectedFileId) {
      Alert.alert(
        "No file selected",
        "Please tap a type button (PDF / WORD / IMG) to pick a file first.",
      );
      return;
    }
    try {
      if (selectedFileId) {
        const updated = await PersonalDocumentsService.updateFile(
          selectedFileId,
          {
            name: newFileName,
            type: newFileType,
            ...(pickedFileUri
              ? {
                fileUri: pickedFileUri,
                fileMimeType: pickedFileMime || undefined,
                fileActualName: pickedFileActualName || undefined,
              }
              : {}),
          },
        );
        setFiles(files.map((f) => (f.id === selectedFileId ? updated : f)));
        setSelectedFileId(null);
      } else {
        const created = await PersonalDocumentsService.createFile({
          name: newFileName,
          type: newFileType,
          uploaded_at: new Date().toLocaleDateString("en-GB"),
          fileUri: pickedFileUri || undefined,
          fileMimeType: pickedFileMime || undefined,
          fileActualName: pickedFileActualName || undefined,
        });
        setFiles([created, ...files]);
      }
      setNewFileName("");
      setNewFileType("");
      setPickedFileUri(null);
      setPickedFileMime(null);
      setPickedFileActualName(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save file");
    }
  };
  const handleEditFile = (file: any) => {
    setSelectedFileId(file.id);
    setNewFileName(file.name);
    setNewFileType(file.type as "PDF" | "WORD" | "IMG");
    setPickedFileUri(null);
  };
  const handleDeleteFile = async (id: string | number) => {
    try {
      await PersonalDocumentsService.deleteFile(id);
      setFiles(files.filter((f) => f.id !== id));
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to delete file");
    }
  };
  const getFileTypeIcon = (type: string) => {
    if (type === "PDF") return <Text style={{ fontSize: 20 }}>📄</Text>;
    if (type === "WORD") return <Text style={{ fontSize: 20 }}>📝</Text>;
    return <Text style={{ fontSize: 20 }}>🖼️</Text>;
  };
  const handlePersonalAssetsTilePress = () => setSelectedView("personalAssets");
  const handlePersonalDocumentsTilePress = () =>
    setSelectedView("personalDocuments");

  // Site-filtered data
  const filteredMachineries = selectedSiteId
    ? machineries.filter((m: any) => m.worksite_id === selectedSiteId)
    : machineries;
  const filteredAssets = selectedSiteId
    ? assets.filter((a: any) => a.worksite_id === selectedSiteId)
    : assets;
  const filteredChemicals = selectedSiteId
    ? chemicals.filter((c: any) => c.worksite_id === selectedSiteId)
    : chemicals;
  const filteredApprovals = selectedSiteId
    ? approvals.filter((a: any) => a.worksite_id === selectedSiteId)
    : approvals;
  const filteredWorkers = selectedSiteId
    ? workers.filter((w: any) => w.worksite_id === selectedSiteId)
    : workers;

  // Site-scoped attendance list, hoisted here (out of definition order
  // below) so the dashboard's Attendance tile count can use the same
  // site-filtered set as every other tile (Machineries/Assets/Chemicals/
  // Approvals/Workers) instead of counting across every site regardless
  // of which one is selected.
  const filteredAttendances = selectedSiteId
    ? attendances.filter((a: any) => a.worksite_id === selectedSiteId)
    : attendances;

  const todayAttendancesCount = filteredAttendances.filter((a: any) => {
    if (!a.date) return false;
    const today = new Date().toISOString().split("T")[0];
    return a.date.startsWith(today);
  }).length;

  // Search-filtered data
  const filteredWorkerData = filteredWorkers.filter((item) => {
    const query = workerSearch.trim().toLowerCase();
    if (!query) return true;
    const siteName = item.worksite?.name || item.site || "Unassigned";
    const roleName = item.role || item.type || item.status || "";
    return (
      String(item.id).includes(query) ||
      item.name.toLowerCase().includes(query) ||
      siteName.toLowerCase().includes(query) ||
      roleName.toLowerCase().includes(query)
    );
  });

  const filteredMachineryData = filteredMachineries.filter((item) => {
    const query = machinerySearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.machine.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  const filteredAssetData = filteredAssets.filter((item) => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.count.toString().includes(query) ||
      item.value.toLowerCase().includes(query)
    );
  });

  const filteredChemicalData = filteredChemicals.filter((item) => {
    const query = chemicalSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.name.toLowerCase().includes(query) ||
      String(item.quantity).includes(query) ||
      item.status.toLowerCase().includes(query)
    );
  });

  const filteredApprovalData = filteredApprovals.filter((item) => {
    if (item.status.toLowerCase() === 'approved') return false;

    const query = approvalSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.amount.toLowerCase().includes(query) ||
      item.date.includes(query) ||
      item.holder.toLowerCase().includes(query)
    );
  });

  const filteredAttendanceData = filteredAttendances.filter((item) => {
    const searchMatch =
      attendanceSearch.trim() === "" ||
      (item.worker?.name || "")
        .toLowerCase()
        .includes(attendanceSearch.toLowerCase()) ||
      String(item.id).includes(attendanceSearch);
    const shiftMatch =
      attendanceShiftFilter === "All" || item.shift === attendanceShiftFilter;
    const statusMatch =
      attendanceStatusFilter === "All" || (item.status || "").toLowerCase() === attendanceStatusFilter.toLowerCase();
    const dateMatch =
      attendanceDateFilter === "" ||
      (item.date && item.date.startsWith(attendanceDateFilter));

    // Tab filter:
    // IN tab  → show everyone who has clocked IN (marked_at), including absent synthetic rows
    // OUT tab → show only workers who have been clocked OUT (out_marked_at is set)
    const tabMatch =
      attendanceTab === "IN"
        ? (item.status || "").toLowerCase() === "absent" || !!item.marked_at
        : !!item.out_marked_at;

    return searchMatch && shiftMatch && statusMatch && dateMatch && tabMatch;
  });

  // === API HANDLERS ===

  const handleUpdateAdminProfile = async () => {
    try {
      setProfileError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          ...(adminPassword ? { password: adminPassword } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0];
          const errorMessage = Array.isArray(firstError)
            ? firstError[0]
            : firstError;
          throw new Error(errorMessage as string);
        }
        throw new Error(data.message || "Failed to update profile");
      }
      await updateUser(data.user);
      setAdminName(data.user.name || adminName);
      setAdminEmail(data.user.email || adminEmail);
      setSuccessModalTitle("Profile Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
      setAdminPassword("");
    } catch (error: any) {
      console.error("[Profile] Save error:", error);
      setProfileError(error.message || "Could not update profile.");
    }
  };

  const handleApproveApproval = async (item: ApprovalRecord) => {
    try {
      await ApprovalsService.approveApproval(item.id);
      setApprovals((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, status: "approved" } : a)),
      );
      setShowApprovalSuccessModal(true);
    } catch (error) {
      console.error("Failed to approve:", error);
      Alert.alert("Error", "Failed to approve");
    }
  };

  const handleOpenRejectModal = (item: ApprovalRecord) => {
    setSelectedApprovalForReject(item);
    setRejectReason("");
    setShowRejectReasonModal(true);
  };

  const handleConfirmReject = async () => {
    if (selectedApprovalForReject) {
      try {
        await ApprovalsService.rejectApproval(
          selectedApprovalForReject.id,
          rejectReason,
        );
        await loadApprovalsData();
        setShowRejectReasonModal(false);
        setShowRejectSuccessModal(true);
      } catch (error) {
        console.error("Failed to reject:", error);
        Alert.alert("Error", "Failed to reject");
      }
    }
  };

  const handleTerminateWorker = (item: WorkerRecord) => {
    setSelectedWorkerForTermination(item);
    setShowTerminateConfirmModal(true);
  };

  const handleConfirmTerminate = async () => {
    if (!selectedWorkerForTermination) return;
    try {
      await WorkersService.terminateWorker(selectedWorkerForTermination.id);
      setWorkers((current) =>
        current.map((worker) =>
          worker.id === selectedWorkerForTermination.id
            ? { ...worker, status: "Terminated" }
            : worker,
        ),
      );
      setShowTerminateConfirmModal(false);
      setShowTerminateSuccessModal(true);
    } catch (error) {
      console.error("Failed to terminate worker:", error);
      Alert.alert("Error", "Failed to terminate worker");
    }
  };

  const handleDeleteWorker = async (item: WorkerRecord) => {
    try {
      await WorkersService.deleteWorker(item.id);
      setWorkers((current) =>
        current.filter((worker) => worker.id !== item.id),
      );
      setShowWorkerDeleteSuccessModal(true);
    } catch (error) {
      console.error("Failed to delete worker:", error);
      Alert.alert("Error", "Failed to delete worker");
    }
  };

  const openUpdateModal = (item: AssetRecord) => {
    setSelectedAsset(item);
    setEditName(item.name);
    setEditCount(String(item.count));
    setEditValue(item.value);
    setShowUpdateModal(true);
  };

  const handleUpdateAsset = async () => {
    if (!selectedAsset) return;
    try {
      await AssetsService.updateAsset(selectedAsset.id, {
        name: editName,
        count: Number(editCount) || 0,
        value: editValue,
        status: selectedAsset.status || "available",
      });
      setAssets((current) =>
        current.map((asset) =>
          asset.id === selectedAsset.id
            ? {
              ...asset,
              name: editName,
              count: Number(editCount) || 0,
              value: editValue,
            }
            : asset,
        ),
      );
      setShowUpdateModal(false);
      setSuccessModalTitle("Assets Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to update asset:", error);
      Alert.alert("Error", "Failed to update asset");
    }
  };

  const handleDeleteAsset = async (item: AssetRecord) => {
    try {
      await AssetsService.deleteAsset(item.id);
      setAssets((current) => current.filter((asset) => asset.id !== item.id));
      setSelectedAsset(null);
      setShowUpdateModal(false);
      setSuccessModalTitle("Assets Deleted Successfully!");
      setSuccessButtonText("Close");
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Failed to delete asset:", error);
      Alert.alert("Error", "Failed to delete asset");
    }
  };

  const handleDeleteChemical = async (item: any) => {
    try {
      await ChemicalsService.deleteChemical(item.id);
      setChemicals((current: any[]) =>
        current.filter((c: any) => c.id !== item.id),
      );
    } catch (error) {
      console.error("Failed to delete chemical:", error);
      Alert.alert("Error", "Failed to delete chemical");
    }
  };

  const handleDeleteMachinery = async (item: MachineryRecord) => {
    try {
      await MachineriesService.deleteMachinery(item.id);
      setMachineries((current) => current.filter((m) => m.id !== item.id));
    } catch (error) {
      console.error("Failed to delete machinery:", error);
      Alert.alert("Error", "Failed to delete machinery");
    }
  };

  // Returns true if the worker marked IN but their shift has already ended
  // without them marking OUT — i.e. they're overdue to clock out. Uses this
  // record's hospital's own configured shift end time when set, falling
  // back to the app-wide default otherwise.
  const isOverdueOut = (item: any): boolean => {
    if (!item.marked_at || item.out_marked_at) return false;
    if ((item.status || "").toLowerCase() === "absent") return false;
    const recordDate = item.date ? String(item.date).split("T")[0] : null;
    if (!recordDate) return false;
    const [y, m, d] = recordDate.split("-").map(Number);
    if (!y || !m || !d) return false;
    const config = resolveShiftConfig(item.hospital);
    const shiftName = (item.shift || "").toLowerCase();
    const [endH, endM] = (shiftName === "morning" ? config.day_shift_end : config.night_shift_end)
      .split(":").map((n) => parseInt(n, 10));
    const shiftEnd = shiftName === "morning"
      ? new Date(y, m - 1, d, endH, endM, 0, 0)
      : new Date(y, m - 1, d + 1, endH, endM, 0, 0);
    return Date.now() >= shiftEnd.getTime();
  };

  const handleDeleteAttendance = async (
    item: AttendancesService.AttendanceRecord,
  ) => {
    try {
      await AttendancesService.deleteAttendance(item.id);
      setAttendances((current) => current.filter((a) => a.id !== item.id));
    } catch (error) {
      console.error("Failed to delete attendance:", error);
      Alert.alert("Error", "Failed to delete attendance");
    }
  };

  const openAttendanceEditModal = (
    item: AttendancesService.AttendanceRecord,
  ) => {
    setSelectedAttendance(item);
    setEditAttendanceShift(item.shift);
    setEditAttendanceDate(item.date ? item.date.split("T")[0] : "");
    setEditAttendanceStatus(item.status);
    setShowAttendanceEditModal(true);
  };

  const handleSaveAttendanceEdit = () => {
    if (!selectedAttendance) return;
    setAttendances((current) =>
      current.map((a) =>
        a.id === selectedAttendance.id
          ? {
            ...a,
            shift: editAttendanceShift,
            date: editAttendanceDate,
            status: editAttendanceStatus,
          }
          : a,
      ),
    );
    setShowAttendanceEditModal(false);
    setSelectedAttendance(null);
  };

  const handleDeletePersonalItem = async (
    item: VehicleRecord | JewelleryRecord | PropertyRecord,
  ) => {
    try {
      if (selectedPersonalTab === "vehicles") {
        await PersonalAssetsService.deleteVehicle(item.id);
        setVehicles((current) =>
          current.filter((record) => record.id !== item.id),
        );
      } else if (selectedPersonalTab === "jewelleries") {
        await PersonalAssetsService.deleteJewellery(item.id);
        setJewelleries((current) =>
          current.filter((record) => record.id !== item.id),
        );
      } else {
        await PersonalAssetsService.deleteProperty(item.id);
        setProperties((current) =>
          current.filter((record) => record.id !== item.id),
        );
      }
      setSuccessModalTitle("Record Deleted Successfully!");
      setSuccessButtonText("Close");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Failed to delete record.");
    }
  };

  const handleAddPersonalItem = async () => {
    if (!newPersonalValue.trim() || !newPersonalName.trim()) {
      Alert.alert("Missing fields", "Please complete the required fields.");
      return;
    }
    try {
      if (selectedPersonalTab === "vehicles") {
        const created = await PersonalAssetsService.createVehicle({
          name: newPersonalName,
          type: newPersonalType,
          value: newPersonalValue,
          plateNo: newPersonalExtra,
        });
        setVehicles((current) => [...current, created]);
      } else if (selectedPersonalTab === "jewelleries") {
        const created = await PersonalAssetsService.createJewellery({
          name: newPersonalName,
          value: newPersonalValue,
          weight: newPersonalExtra,
        });
        setJewelleries((current) => [...current, created]);
      } else {
        const created = await PersonalAssetsService.createProperty({
          location: newPersonalName,
          value: newPersonalValue,
          area: newPersonalExtra,
        });
        setProperties((current) => [...current, created]);
      }
      resetPersonalForm();
      setShowAddPersonalModal(false);
      setSuccessModalTitle("Record Added Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Failed to add record.");
    }
  };

  const handleSavePersonalEdit = async () => {
    if (!selectedPersonalItem) return;
    try {
      if (selectedPersonalTab === "vehicles") {
        const updated = await PersonalAssetsService.updateVehicle(
          selectedPersonalItem.id,
          {
            name: newPersonalName,
            type: newPersonalType,
            value: newPersonalValue,
            plateNo: newPersonalExtra,
          },
        );
        setVehicles((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id ? updated : item,
          ),
        );
      } else if (selectedPersonalTab === "jewelleries") {
        const updated = await PersonalAssetsService.updateJewellery(
          selectedPersonalItem.id,
          {
            name: newPersonalName,
            value: newPersonalValue,
            weight: newPersonalExtra,
          },
        );
        setJewelleries((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id ? updated : item,
          ),
        );
      } else {
        const updated = await PersonalAssetsService.updateProperty(
          selectedPersonalItem.id,
          {
            location: newPersonalName,
            value: newPersonalValue,
            area: newPersonalExtra,
          },
        );
        setProperties((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id ? updated : item,
          ),
        );
      }
      resetPersonalForm();
      setShowPersonalEditModal(false);
      setSuccessModalTitle("Record Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Failed to update record.");
    }
  };

  const handlePickSiteLogo = async () => {
    if (Platform.OS === "web") {
      siteLogoInputRef.current?.click();
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Allow media access to pick a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSiteLogoName(asset.fileName || "logo.jpg");
      if (asset.base64) {
        setSiteLogoUri(`data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`);
      } else {
        setSiteLogoUri(asset.uri);
      }
    }
  };

  const handleSiteLogoFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSiteLogoName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSiteLogoUri(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      Alert.alert("Missing Name", "Please enter a name.");
      return;
    }
    try {
      let url = `${API_BASE_URL}/worksites`;
      let body: any = { name: newSiteName.trim(), logo_base64: siteLogoUri };

      if (drillLevel === 'hospital') {
        url = `${API_BASE_URL}/hospitals`;
        body = { name: newSiteName.trim(), worksite_id: currentMainSiteId };
      } else if (drillLevel === 'subsite') {
        url = `${API_BASE_URL}/sub-sites`;
        body = { name: newSiteName.trim(), hospital_id: currentHospitalId };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...(await getAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to add");
      await loadWorksitesData(); // Sync all 3 arrays from DB
      setShowAddSiteModal(false);
      setNewSiteName("");
      setSiteLogoName("");
      setSiteLogoUri(null);
      setSuccessModalTitle("Added Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not add.");
    }
  };

  const handleEditSite = async () => {
    if (!selectedManageSite) return;
    if (!editSiteName.trim()) {
      Alert.alert("Missing Name", "Please enter a name.");
      return;
    }
    try {
      // Determine endpoint based on what kind of item is selected
      let url = `${API_BASE_URL}/worksites/${selectedManageSite.id}`;
      if (selectedManageSite._level === 'hospital') {
        url = `${API_BASE_URL}/hospitals/${selectedManageSite.id}`;
      } else if (selectedManageSite._level === 'subsite') {
        url = `${API_BASE_URL}/sub-sites/${selectedManageSite.id}`;
      }

      let body: any = { name: editSiteName.trim() };
      if (selectedManageSite._level === 'main') {
        body.logo_base64 = siteLogoUri;
      }

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          ...(await getAuthHeaders()),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Failed to edit");
      await loadWorksitesData();
      setShowEditSiteModal(false);
      setSuccessModalTitle("Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not update.");
    }
  };

  const handleDeleteSite = async (site: any) => {
    try {
      let url = `${API_BASE_URL}/worksites/${site.id}`;
      if (site._level === 'hospital') {
        url = `${API_BASE_URL}/hospitals/${site.id}`;
      } else if (site._level === 'subsite') {
        url = `${API_BASE_URL}/sub-sites/${site.id}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete");
      setDeletedSiteName(site.name);
      await loadWorksitesData();
      setShowSiteDeletedSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not delete.");
    }
  };

  const adminCards: AdminCard[] = [
    {
      id: "1",
      title: "Attendance",
      value: todayAttendancesCount,
      icon: "\u{1F465}",
      backgroundColor: "#e0e0e0",
      textColor: "#1f1d21",
    },
    {
      id: "2",
      title: "Machineries",
      value: filteredMachineries.length,
      icon: "\u2699\uFE0F",
      backgroundColor: "#f5c6c6",
      textColor: "#1f1d21",
    },
    {
      id: "3",
      title: "Assets",
      value: filteredAssets.length,
      icon: "\u{1F4E6}",
      backgroundColor: "#a8d5a8",
      textColor: "#1f1d21",
    },
    {
      id: "4",
      title: "Chemicals",
      value: filteredChemicals.length,
      icon: "\u{1F9EA}",
      backgroundColor: "#a8c1f5",
      textColor: "#1f1d21",
    },
    {
      id: "5",
      title: "Approvals",
      value: filteredApprovals.length,
      icon: "\u2705",
      backgroundColor: "#f5f5b8",
      textColor: "#1f1d21",
    },
    {
      id: "6",
      title: "Workers",
      value: filteredWorkers.length,
      icon: "\u{1F477}",
      backgroundColor: "#c0c0c0",
      textColor: "#1f1d21",
    },
    {
      id: "7",
      title: "Personal",
      value: vehicles.length + jewelleries.length + properties.length,
      icon: "\u{1F464}",
      backgroundColor: "#a8d5a8",
      textColor: "#1f1d21",
    },
    {
      id: "8",
      title: "Manage Site",
      value: worksites.length,
      icon: "\u{1F3E2}",
      backgroundColor: "#f5d7b3",
      textColor: "#1f1d21",
    },
    {
      id: "9",
      title: "Hospital Shifts",
      value: hospitals.length,
      icon: "\u{1F550}",
      backgroundColor: "#d3c8f0",
      textColor: "#1f1d21",
    },
  ];

  const getCardScaleValue = (cardId: string) => {
    if (!cardScaleValues[cardId]) {
      cardScaleValues[cardId] = new Animated.Value(1);
    }
    return cardScaleValues[cardId];
  };

  const onCardHoverEnter = (cardId: string) => {
    Animated.spring(getCardScaleValue(cardId), {
      toValue: 1.08,
      useNativeDriver: true,
    }).start();
  };

  const onCardHoverExit = (cardId: string) => {
    Animated.spring(getCardScaleValue(cardId), {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    loadAssetsData();
    loadChemicalsData();
    loadMachineriesData();
    loadWorkersData();
    loadApprovalsData();
    loadPersonalAssetsData();
    loadPersonalDocumentsData();
    loadWorksitesData();
    loadAttendancesData();
    loadAccountsData();
    return () => clearInterval(timer);
  }, []);

  const loadAccountsData = async () => {
    // Run both requests in parallel instead of awaiting one before starting
    // the next - they don't depend on each other, so serializing them just
    // stacked up two round-trips' worth of latency for no reason.
    await Promise.all([
      (async () => {
        try {
          const cashRows = await getCashInHandEntries();
          setAdminCashEntries(
            cashRows.map((r) => ({
              id: r.id,
              date: r.date,
              chequeNo: r.cheque_no ?? '',
              description: r.description ?? '',
              debit: r.debit,
              credit: r.credit,
              balance: r.balance,
              linkedTransferId: r.linked_transfer_id ?? null,
            }))
          );
        } catch (err) {
          console.warn('[Admin] loadAccountsData cash error', err);
        }
      })(),
      (async () => {
        try {
          const bankRows = await getBankEntries();
          setAdminBankEntries(
            bankRows.map((r) => ({
              id: r.id,
              date: r.date,
              chequeNo: r.cheque_no ?? '',
              description: r.description ?? '',
              debit: r.debit,
              credit: r.credit,
              balance: r.balance,
              linkedTransferId: r.linked_transfer_id ?? null,
            }))
          );
        } catch (err) {
          console.warn('[Admin] loadAccountsData bank error', err);
        }
      })(),
    ]);
  };

  const loadPersonalDocumentsData = async () => {
    try {
      // Parallel, not sequential - notes and files don't depend on each other.
      const [notesData, filesData] = await Promise.all([
        PersonalDocumentsService.getNotes(),
        PersonalDocumentsService.getFiles(),
      ]);
      setNotes(notesData);
      setFiles(filesData);
    } catch (error) {
      console.error("Failed to load personal documents:", error);
    }
  };

  const loadAttendancesData = async () => {
    try {
      if (selectedSiteId && attendanceDateFilter !== "" && attendanceShiftFilter !== "All") {
        const data = await AttendancesService.getAttendancesWithAbsents({
          worksiteId: selectedSiteId,
          date: attendanceDateFilter,
          shift: attendanceShiftFilter
        });
        setAttendances(data);
      } else {
        const data = await AttendancesService.getAttendances();
        setAttendances(data);
      }
    } catch (error) {
      console.error("Failed to load attendances:", error);
    }
  };

  useEffect(() => {
    // Only reload if we are actively viewing the attendance screen to prevent unnecessary fetches
    if (selectedView === "attendance") {
      loadAttendancesData();
    }
  }, [selectedSiteId, attendanceDateFilter, attendanceShiftFilter, selectedView]);

  const loadWorksitesData = async () => {
    try {
      setWorksitesRefreshing(true);
      const headers = await getAuthHeaders();
      const [wsRes, hospRes, subRes] = await Promise.all([
        fetch(`${API_BASE_URL}/worksites`, { headers }),
        fetch(`${API_BASE_URL}/hospitals`, { headers }),
        fetch(`${API_BASE_URL}/sub-sites`, { headers }),
      ]);
      const wsData = await wsRes.json();
      const hospData = await hospRes.json();
      const subData = await subRes.json();

      const loadedWorksites = Array.isArray(wsData) ? wsData : wsData.data || [];
      const loadedHospitals = Array.isArray(hospData) ? hospData : hospData.data || [];
      const loadedSubSites = Array.isArray(subData) ? subData : subData.data || [];

      setWorksites(loadedWorksites);
      setMainSites(loadedWorksites);
      setHospitals(loadedHospitals);
      setSubSites(loadedSubSites);
    } catch (error) {
      console.error("Failed to load worksites:", error);
    } finally {
      setWorksitesRefreshing(false);
    }
  };

  const openEditShifts = async (hospital: any) => {
    setShiftEditHospital(hospital);
    setShiftLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/hospitals/${hospital.id}/shifts`, {
        headers: await getAuthHeaders(),
      });
      const data = await res.json();
      setShiftDefaults(data.defaults ?? null);
      const o = data.overrides ?? {};
      setShiftForm({
        day_shift_start: o.day_shift_start ?? "",
        day_shift_end: o.day_shift_end ?? "",
        day_late_grace_minutes: o.day_late_grace_minutes != null ? String(o.day_late_grace_minutes) : "",
        day_early_grace_minutes: o.day_early_grace_minutes != null ? String(o.day_early_grace_minutes) : "",
        night_shift_start: o.night_shift_start ?? "",
        night_shift_end: o.night_shift_end ?? "",
        night_late_grace_minutes: o.night_late_grace_minutes != null ? String(o.night_late_grace_minutes) : "",
        night_early_grace_minutes: o.night_early_grace_minutes != null ? String(o.night_early_grace_minutes) : "",
      });
    } catch (error) {
      console.error("Failed to load hospital shifts:", error);
      Alert.alert("Error", "Could not load this hospital's shift settings.");
      setShiftEditHospital(null);
    } finally {
      setShiftLoading(false);
    }
  };

  const resetShiftFormFields = (fields: string[]) => {
    setShiftForm((prev) => {
      const next = { ...prev };
      fields.forEach((f) => { (next as any)[f] = ""; });
      return next;
    });
  };

  const handleSaveShifts = async () => {
    if (!shiftEditHospital) return;
    setShiftSaving(true);
    try {
      const toIntOrNull = (v: string) => (v.trim() === "" ? null : parseInt(v, 10));
      const toTimeOrNull = (v: string) => (v.trim() === "" ? null : v);
      const body = {
        day_shift_start: toTimeOrNull(shiftForm.day_shift_start),
        day_shift_end: toTimeOrNull(shiftForm.day_shift_end),
        day_late_grace_minutes: toIntOrNull(shiftForm.day_late_grace_minutes),
        day_early_grace_minutes: toIntOrNull(shiftForm.day_early_grace_minutes),
        night_shift_start: toTimeOrNull(shiftForm.night_shift_start),
        night_shift_end: toTimeOrNull(shiftForm.night_shift_end),
        night_late_grace_minutes: toIntOrNull(shiftForm.night_late_grace_minutes),
        night_early_grace_minutes: toIntOrNull(shiftForm.night_early_grace_minutes),
      };
      const res = await fetch(`${API_BASE_URL}/hospitals/${shiftEditHospital.id}/shifts`, {
        method: "PUT",
        headers: { ...(await getAuthHeaders()), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      await loadWorksitesData();
      setShiftEditHospital(null);
      setShiftSuccessVisible(true);
    } catch (error) {
      console.error("Failed to save hospital shifts:", error);
      Alert.alert("Error", "Could not save this hospital's shift settings.");
    } finally {
      setShiftSaving(false);
    }
  };

  const loadAssetsData = async () => {
    try {
      const data = await AssetsService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error("Failed to load assets:", error);
    }
  };

  const loadChemicalsData = async () => {
    try {
      const data = await ChemicalsService.getChemicals();
      setChemicals(data);
    } catch (error) {
      console.error("Failed to load chemicals:", error);
    }
  };

  const loadMachineriesData = async () => {
    try {
      const data = await MachineriesService.getMachineries();
      const mappedData = data.map((item: any) => ({
        id: item.id,
        machine: item.name || item.machine || "",
        status: item.status || "",
        description: item.location || item.description || "",
        worksite_id: item.worksite_id || null,
      }));
      setMachineries(mappedData);
    } catch (error) {
      console.error("Failed to load machineries:", error);
    }
  };

  const loadWorkersData = async () => {
    try {
      const data = await WorkersService.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error("Failed to load workers:", error);
    }
  };

  const loadApprovalsData = async () => {
    try {
      const data = await ApprovalsService.getApprovals();
      setApprovals(data);
    } catch (error) {
      console.error("Failed to load approvals:", error);
    }
  };

  const loadPersonalAssetsData = async () => {
    try {
      // Parallel, not sequential - none of these three depend on each other.
      const [vehiclesData, jewelleriesData, propertiesData] = await Promise.all([
        PersonalAssetsService.getVehicles(),
        PersonalAssetsService.getJewelleries(),
        PersonalAssetsService.getProperties(),
      ]);
      setVehicles(vehiclesData);
      setJewelleries(jewelleriesData);
      setProperties(propertiesData);
    } catch (error) {
      console.error("Failed to load personal assets:", error);
    }
  };

  const updateDateTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours.toString().padStart(2, "0")}.${minutes} ${ampm}`;
    const day = now.getDate().toString().padStart(2, "0");
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    setCurrentTime(timeStr);
    setCurrentDate(dateStr);
  };

  const handleCardPress = (card: AdminCard) => {
    if (card.title === "Attendance") {
      setSelectedView("attendance");
    } else if (card.title === "Machineries") {
      setSelectedView("machineries");
    } else if (card.title === "Assets") {
      setSelectedView("assets");
    } else if (card.title === "Chemicals") {
      setSelectedView("chemicals");
    } else if (card.title === "Approvals") {
      setSelectedView("approvals");
    } else if (card.title === "Workers") {
      setSelectedView("workers");
    } else if (card.title === "Personal") {
      setSelectedView("personalSelection");
    } else if (card.title === "Manage Site") {
      setDrillLevel('main');
      setCurrentMainSiteId(null);
      setCurrentHospitalId(null);
      setSelectedView("manageSite");
    } else if (card.title === "Hospital Shifts") {
      setSelectedView("hospitalShifts");
    } else if (card.title === "Bonds") {
      router.push("/bonds");
    } else {
      Alert.alert(`${card.title}`, `You clicked on ${card.title}`);
    }
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

  const getPersonalExtraLabel = () => {
    if (selectedPersonalTab === "vehicles") return "Plate No";
    if (selectedPersonalTab === "jewelleries") return "Weight";
    return "Area";
  };

  const getPersonalSectionTitleSingular = () => {
    if (selectedPersonalTab === "vehicles") return "Vehicle";
    if (selectedPersonalTab === "jewelleries") return "Jewellery";
    return "Property";
  };

  const getPersonalSectionTitle = () => {
    if (selectedPersonalTab === "vehicles") return "Vehicles";
    if (selectedPersonalTab === "jewelleries") return "Jewelleries";
    return "Properties";
  };

  const getPersonalItemList = () => {
    if (selectedPersonalTab === "vehicles") return vehicles;
    if (selectedPersonalTab === "jewelleries") return jewelleries;
    return properties;
  };

  const openPersonalEditModal = (
    item: VehicleRecord | JewelleryRecord | PropertyRecord,
  ) => {
    setSelectedPersonalItem(item);
    setNewPersonalValue(
      selectedPersonalTab === "vehicles"
        ? (item as VehicleRecord).value
        : selectedPersonalTab === "jewelleries"
          ? (item as JewelleryRecord).value
          : (item as PropertyRecord).value,
    );
    setNewPersonalExtra(
      selectedPersonalTab === "vehicles"
        ? (item as VehicleRecord).plateNo
        : selectedPersonalTab === "jewelleries"
          ? (item as JewelleryRecord).weight
          : (item as PropertyRecord).area,
    );
    if (selectedPersonalTab === "vehicles") {
      const vehicle = item as VehicleRecord;
      setNewPersonalName(vehicle.name);
      setNewPersonalType(vehicle.type);
    } else if (selectedPersonalTab === "jewelleries") {
      const jewellery = item as JewelleryRecord;
      setNewPersonalName(jewellery.name);
      setNewPersonalType("");
    } else {
      const property = item as PropertyRecord;
      setNewPersonalName(property.location);
      setNewPersonalType("");
    }
    setShowPersonalEditModal(true);
  };

  const resetPersonalForm = () => {
    setNewPersonalName("");
    setNewPersonalType("");
    setNewPersonalValue("");
    setNewPersonalExtra("");
    setSelectedPersonalItem(null);
  };

  const renderAttendancesView = () => (
    <View style={styles.machineriesContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.machineriesHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setAttendanceSearch("");
            setAttendanceShiftFilter("All");
            setAttendanceStatusFilter("All");
            setAttendanceDateFilter("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.machineriesTitle}>
          Attendances
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      {/* IN / OUT Tab Toggle */}
      <View style={{ flexDirection: "row", marginBottom: 14, borderRadius: 12, overflow: "hidden", backgroundColor: isDark ? "#1e1e1e" : "#e5e5ea", alignSelf: "flex-start" }}>
        <Pressable
          style={[{ paddingVertical: 8, paddingHorizontal: 20 }, attendanceTab === "IN" && { backgroundColor: "#4b4fbf", borderRadius: 10 }]}
          onPress={() => setAttendanceTab("IN")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: attendanceTab === "IN" ? "#ffffff" : (isDark ? "#a0a0a0" : "#555") }}>↩ Clock-IN</Text>
        </Pressable>
        <Pressable
          style={[{ paddingVertical: 8, paddingHorizontal: 20 }, attendanceTab === "OUT" && { backgroundColor: "#4b4fbf", borderRadius: 10 }]}
          onPress={() => setAttendanceTab("OUT")}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: attendanceTab === "OUT" ? "#ffffff" : (isDark ? "#a0a0a0" : "#555") }}>↪ Clock-OUT</Text>
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 15,
          zIndex: 1,
        }}
      >
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={attendanceSearch}
            onChangeText={setAttendanceSearch}
            placeholder="Search by worker or ID"
            placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
            style={styles.searchInput}
          />
        </View>
        <SelectInput
          value={attendanceShiftFilter}
          onChange={setAttendanceShiftFilter}
          options={[
            { value: "All", label: "All Shifts" },
            { value: "Morning", label: "Morning" },
            { value: "Evening", label: "Evening" },
          ]}
          webStyle={{
            backgroundColor: "transparent",
            color: isDark ? "#ffffff" : "#333",
            border: `1px solid ${isDark ? "#333" : "#ccc"}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 14,
          }}
        />
        <SelectInput
          value={attendanceStatusFilter}
          onChange={setAttendanceStatusFilter}
          options={[
            { value: "All", label: "All Status" },
            { value: "present", label: "Present" },
            { value: "absent", label: "Absent" },
            { value: "late", label: "Late" },
          ]}
          webStyle={{
            backgroundColor: "transparent",
            color: isDark ? "#ffffff" : "#333",
            border: `1px solid ${isDark ? "#333" : "#ccc"}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 14,
          }}
        />
        <View style={{ position: 'relative', minWidth: 140 }}>
          <DateInput
            value={attendanceDateFilter}
            onChange={setAttendanceDateFilter}
            webStyle={{
              backgroundColor: theme.backgroundSelected,
              color: theme.text,
              border: `1px solid ${theme.border || "#ccc"}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 14,
              colorScheme: isDark ? "dark" : "light",
              minWidth: 140,
              minHeight: 40,
              display: 'block',
            }}
          />
          {Platform.OS === 'web' && !attendanceDateFilter && (
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 12,
                top: 10,
                fontSize: 14,
                color: isDark ? '#888' : '#999',
              }}
            >
              mm/dd/yyyy
            </Text>
          )}
        </View>
      </View>

      {attendanceTab === "IN" && selectedSiteId && attendanceDateFilter !== "" && attendanceShiftFilter !== "All" && (
        <View style={{ backgroundColor: isDark ? "#2a2000" : "#fffbe6", borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: "#faad14" }}>
          <Text style={{ color: isDark ? "#e6c97a" : "#7a5c00", fontSize: 12 }}>
            💡 Absent workers (yellow) appear once the shift ends — Morning at 6 PM, Evening at 6 AM next day.
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCard, { minWidth: 960 }]}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Worker</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Hospital</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Shift</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>In Time</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Out Time</Text>
              <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
            </View>

            {filteredAttendanceData.map((item, index) => {
              const isAbsent = (item.status || "").toLowerCase() === "absent";
              const overdueOut = isOverdueOut(item);
              return (
                <View
                  key={String(item.id)}
                  style={[
                    styles.tableRow,
                    (isAbsent || overdueOut) && { backgroundColor: isDark ? "#2a2000" : "#fffbe6" },
                    index !== filteredAttendanceData.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: "#e5e7eb",
                    },
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 1 }]}>{item.id}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {item.worker?.name || `Worker #${item.worker_id}`}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {item.hospital?.name || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {item.date ? item.date.split("T")[0] : ""}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.shift}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.marked_at
                      ? new Date(item.marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>
                    {item.out_marked_at
                      ? new Date(item.out_marked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </Text>
                  {(() => {
                    // Worker clocked in but their shift has already ended
                    // with no clock-out — the row itself is also
                    // highlighted yellow (see isOverdueOut above).
                    if (overdueOut) {
                      return (
                        <Text style={[styles.tableCell, { flex: 1.5, color: "#faad14", fontWeight: "600" }]}>
                          Not Clocked Out
                        </Text>
                      );
                    }
                    // Show "Early" if the worker left more than that shift's
                    // own early-departure grace period before it was due to
                    // end - using this hospital's own configured shift
                    // times when set, falling back to the app-wide defaults.
                    if (item.out_marked_at) {
                      const shiftConfigForRow = resolveShiftConfig(item.hospital);
                      const shiftName = (item.shift || "").toLowerCase();
                      const outTime = new Date(item.out_marked_at);
                      const outMinutes = outTime.getHours() * 60 + outTime.getMinutes();
                      const threshold = shiftName === "morning"
                        ? timeToMinutes(shiftConfigForRow.day_shift_end) - shiftConfigForRow.day_early_grace_minutes
                        : timeToMinutes(shiftConfigForRow.night_shift_end) - shiftConfigForRow.night_early_grace_minutes;
                      const isEarly = outMinutes < threshold;
                      if (isEarly) {
                        return (
                          <Text style={[styles.tableCell, { flex: 1.5, color: "#fa8c16", fontWeight: "600" }]}>
                            Early
                          </Text>
                        );
                      }
                    }
                    // Default: use original status
                    const s = (item.status || "").toLowerCase();
                    return (
                      <Text
                        style={[
                          styles.tableCell,
                          { flex: 1.5 },
                          s === "present"
                            ? { color: "#28a745" }
                            : s === "late"
                              ? { color: "#ff4d4f" }
                              : isAbsent
                                ? { color: "#faad14" }
                                : { color: "#ff4d4f" },
                        ]}
                      >
                        {s === "present" ? "Present" : s === "late" ? "Late" : isAbsent ? "Absent" : "Absent"}
                      </Text>
                    );
                  })()}
                  <View
                    style={[
                      styles.tableCell,
                      { flex: 2, flexDirection: "row", gap: 6 },
                    ]}
                  >
                    <Pressable
                      onPress={() => setAdminIdCardWorker({
                        id: item.worker_id,
                        name: item.worker?.name || `Worker #${item.worker_id}`,
                        role: (item.worker as any)?.role,
                        nic: (item.worker as any)?.nic,
                        join_date: (item.worker as any)?.join_date,
                        face_photo_path: (item.worker as any)?.face_photo_path,
                        worksite: item.worksite,
                      })}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                      }}
                    >
                      <Text style={styles.assetActionIcon}>🪪</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => openAttendanceEditModal(item)}
                      style={[
                        styles.assetActionButtonEdit,
                        {
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <Text style={styles.assetActionIcon}>✏️</Text>
                    </Pressable>
                    {user?.role !== "supervisor" && (
                      <Pressable
                        onPress={() => handleDeleteAttendance(item)}
                        style={[
                          styles.assetActionButtonDelete,
                          {
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                          },
                        ]}
                      >
                        <Text style={styles.assetActionIcon}>🗑️</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
            {filteredAttendanceData.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  No matching attendances found.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );

  const renderAttendanceEditModal = () => (
    <Modal
      visible={showAttendanceEditModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAttendanceEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Attendance</Text>
            <Pressable
              onPress={() => setShowAttendanceEditModal(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Date</Text>
            <TextInput
              value={editAttendanceDate}
              onChangeText={setEditAttendanceDate}
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Shift</Text>
            <TextInput
              value={editAttendanceShift}
              onChangeText={setEditAttendanceShift}
              style={styles.formInput}
              placeholder="Morning / Evening"
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Status</Text>
            <TextInput
              value={editAttendanceStatus}
              onChangeText={setEditAttendanceStatus}
              style={styles.formInput}
              placeholder="present / absent"
            />
          </View>
          <Pressable
            onPress={handleSaveAttendanceEdit}
            style={styles.updateButton}
          >
            <Text style={styles.updateButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderMachineriesView = () => (
    <View style={styles.machineriesContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.machineriesHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setMachinerySearch("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.machineriesTitle}>
          Machineries
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={machinerySearch}
          onChangeText={setMachinerySearch}
          placeholder="Search"
          placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        style={[styles.tableScrollContainer, { overscrollBehavior: 'none' } as any]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.tableCard}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text
              style={[styles.tableCell, styles.tableHeaderCell, styles.cellId]}
            >
              ID
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.cellMachine,
              ]}
            >
              Machine
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.cellStatus,
              ]}
            >
              Status
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.cellDescription,
              ]}
            >
              Description
            </Text>
          </View>

          {filteredMachineryData.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.cellId]}>{item.id}</Text>
              <Text style={[styles.tableCell, styles.cellMachine]}>
                {item.machine}
              </Text>
              <Text style={[styles.tableCell, styles.cellStatus]}>
                {item.status}
              </Text>
              <Text style={[styles.tableCell, styles.cellDescription]}>
                {item.description}
              </Text>
            </View>
          ))}

          {filteredMachineryData.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No matching machinery found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderDashboardView = () => (
    // Previously tried to vertically center this view (via justifyContent:
    // 'center' on the wrapping ScrollView's contentContainerStyle, plus a
    // margin:'auto' wrapper here as reinforcement) when its content is
    // shorter than the viewport - but that's a documented WebKit bug on iOS
    // Safari specifically (issues centering flex content inside a container
    // that also has overflow:auto plus -webkit-overflow-scrolling:touch,
    // which RN's ScrollView always sets on web). In practice it silently
    // fell back to flush-top, dumping ALL the leftover space at the bottom
    // instead of splitting it top/bottom - reported as a "blank space at
    // the bottom" bug rather than a centered layout. Content now just flows
    // naturally from the top instead of fighting that.
    <>
      {/* Header with greeting */}
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>

      {/* Site Selection and Time/Date Row */}
      <View style={styles.siteTimeRow}>
        <View style={styles.siteSelectionContainer}>
          <Pressable
            style={styles.siteDropdown}
            onPress={() => setShowSiteDropdown(!showSiteDropdown)}
          >
            <Text style={styles.siteDropdownText}>{selectedSite}</Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </Pressable>
          {showSiteDropdown && (
            <View style={styles.dropdownMenu}>
              {mainSites.map((site) => (
                <Pressable
                  key={site.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedSite(site.name);
                    setSelectedSiteId(site.id);
                    setShowSiteDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{site.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.timeSection}>
          <Text style={styles.timeText}>{currentTime}</Text>
          <Text style={styles.dateText}>{currentDate}</Text>
        </View>
      </View>

      {/* Cards Grid */}
      <View style={styles.cardsContainer}>
        <View style={styles.cardsRow}>
          {adminCards.slice(0, 2).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value !== undefined && card.value !== null && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.cardsRow}>
          {adminCards.slice(2, 4).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value !== undefined && card.value !== null && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.cardsRow}>
          {adminCards.slice(4, 6).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value !== undefined && card.value !== null && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.cardsRow}>
          {adminCards.slice(6, 8).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value !== undefined && card.value !== null && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.cardsRow}>
          {adminCards.slice(8, 10).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: card.backgroundColor },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: card.textColor }]}
                >
                  {card.title}
                </ThemedText>
                {card.value !== undefined && card.value !== null && (
                  <Text style={[styles.cardValue, { color: card.textColor }]}>
                    {card.value}
                  </Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Accounts & Bonds - Side by Side Row */}
        <View style={styles.cardsRow}>
          {(() => {
            const scaleValue = getCardScaleValue("petacash");
            return (
              <AnimatedPressable
                key="petacash"
                style={[
                  styles.card,
                  { backgroundColor: "#b2f0b2", transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => {
                  setAdminCashForm((p) => ({ ...p, date: getAdminSriLankaDate() }));
                  setAdminBankForm((p) => ({ ...p, date: getAdminSriLankaDate() }));
                  setSelectedView("adminAccounts");
                }}
              >
                <Text style={styles.cardIcon}>💰</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: "#1f1d21" }]}
                >
                  Accounts
                </ThemedText>
              </AnimatedPressable>
            );
          })()}
          {(() => {
            const scaleValue = getCardScaleValue("bonds");
            return (
              <AnimatedPressable
                key="bonds"
                style={[
                  styles.card,
                  { backgroundColor: "#d1c4e9", transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => router.push("/bonds" as any)}
              >
                <Text style={styles.cardIcon}>📜</Text>
                <ThemedText
                  type="smallBold"
                  style={[styles.cardTitle, { color: "#1f1d21" }]}
                >
                  Bonds
                </ThemedText>
              </AnimatedPressable>
            );
          })()}
        </View>
      </View>
    </>
  );

  const renderManageSiteView = () => {
    // Determine what to display based on drillLevel
    let displayedSites: any[] = [];
    let screenTitle = 'Manage Sites';
    let addLabel = '+ Add Main Site';
    let levelIcon = '🏗️';

    if (drillLevel === 'main') {
      displayedSites = mainSites.map(s => ({ ...s, _level: 'main' }));
      screenTitle = 'Manage Sites';
      addLabel = '+ Add Main Site';
      levelIcon = '🏗️';
    } else if (drillLevel === 'hospital') {
      const parentSite = mainSites.find(s => Number(s.id) === currentMainSiteId);
      displayedSites = hospitals
        .filter(h => Number(h.worksite_id) === currentMainSiteId)
        .map(h => ({ ...h, _level: 'hospital' }));
      screenTitle = `${parentSite?.name || 'Site'} › Hospitals`;
      addLabel = '+ Add Hospital';
      levelIcon = '🏥';
    } else if (drillLevel === 'subsite') {
      const parentHosp = hospitals.find(h => Number(h.id) === currentHospitalId);
      displayedSites = subSites
        .filter(s => Number(s.hospital_id) === currentHospitalId)
        .map(s => ({ ...s, _level: 'subsite' }));
      screenTitle = `${parentHosp?.name || 'Hospital'} › Sub Sites`;
      addLabel = '+ Add Sub Site';
      levelIcon = '📍';
    }

    const handleBack = () => {
      if (drillLevel === 'main') {
        setSelectedView("dashboard");
      } else if (drillLevel === 'hospital') {
        setDrillLevel('main');
        setCurrentMainSiteId(null);
      } else if (drillLevel === 'subsite') {
        setDrillLevel('hospital');
        setCurrentHospitalId(null);
      }
    };

    const openAdd = () => {
      setNewSiteName("");
      setSiteLogoName("");
      setSiteLogoUri(null);
      setShowAddSiteModal(true);
    };

    const openEdit = (site: any) => {
      setSelectedManageSite(site);
      setEditSiteName(site.name || "");
      setShowEditSiteModal(true);
    };

    return (
      <SafeView style={styles.manageSiteContainer}>
        <SafeView style={[styles.headerSection, styles.greetingContainer, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Malith"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => { await signOut(); router.replace("/"); }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? "#333" : "#e0e0e0", borderRadius: 8 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#000" }}>Sign Out</Text>
          </Pressable>
        </SafeView>

        <SafeView style={styles.manageSiteHeader}>
          <Pressable style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.manageSiteTitle}>
            {screenTitle}
          </ThemedText>
          <SafeView style={{ width: 44 }} />
        </SafeView>

        <ScrollView
          style={[styles.manageSiteList, { overscrollBehavior: 'none' } as any]}
          contentContainerStyle={{ paddingBottom: 40 }}
          bounces={false}
          overScrollMode="never"
          refreshControl={
            <RefreshControl
              refreshing={worksitesRefreshing}
              onRefresh={loadWorksitesData}
              colors={['#16a34a']}
              tintColor={isDark ? '#16a34a' : '#16a34a'}
            />
          }
        >
          <SafeView style={styles.manageSiteCardsContainer}>
            {displayedSites.map((site) => (
              <Pressable
                key={`${site._level}-${site.id}`}
                style={styles.manageSiteCard}
                onPress={() => {
                  if (site._level === 'main') {
                    setCurrentMainSiteId(Number(site.id));
                    setDrillLevel('hospital');
                  } else if (site._level === 'hospital') {
                    setCurrentHospitalId(Number(site.id));
                    setDrillLevel('subsite');
                  }
                  // sub_site cards are not drillable
                }}
              >
                <SafeView style={styles.manageSiteCardTopRow}>
                  <SafeView style={styles.manageSiteLogoWrapper}>
                    {site.logo ? (
                      <Image source={{ uri: site.logo.startsWith('http') ? site.logo : `${API_BASE_URL.replace(/\/api$/, '')}${site.logo}` }} style={{ width: 70, height: 70, borderRadius: 12 }} resizeMode="cover" />
                    ) : (
                      <Text style={styles.manageSiteLogoIcon}>
                        {site._level === 'hospital' ? '🏥' : site._level === 'subsite' ? '📍' : '🏗️'}
                      </Text>
                    )}
                  </SafeView>
                  <SafeView style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <Pressable style={styles.manageSiteDeleteButton} onPress={() => handleDeleteSite(site)}>
                      <Text style={styles.manageSiteDeleteIcon}>🗑️</Text>
                    </Pressable>
                    <Pressable style={styles.manageSiteDeleteButton} onPress={() => openEdit(site)}>
                      <Text style={styles.manageSiteDeleteIcon}>✏️</Text>
                    </Pressable>
                  </SafeView>
                </SafeView>
                <SafeView style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <Text style={styles.manageSiteCardLabel}>{site.name}</Text>
                </SafeView>
                {site._level !== 'subsite' && (
                  <Text style={{ fontSize: 11, color: isDark ? '#888' : '#aaa', marginTop: 8, textAlign: 'center' }}>
                    Tap to manage ›
                  </Text>
                )}
              </Pressable>
            ))}

            <Pressable
              style={[styles.manageSiteCard, styles.manageSiteAddCard]}
              onPress={openAdd}
            >
              <Text style={styles.manageSiteAddIcon}>+</Text>
              <Text style={{ marginTop: 8, color: '#16a34a', fontWeight: 'bold' }}>{addLabel}</Text>
            </Pressable>
          </SafeView>
        </ScrollView>
      </SafeView>
    );
  };

  const renderAddSiteModal = () => {
    const titleMap = {
      main: 'Add Main Site',
      hospital: 'Add Hospital',
      subsite: 'Add Sub Site',
    };
    const iconMap = { main: '🏗️', hospital: '🏥', subsite: '📍' };
    return (
      <Modal
        visible={showAddSiteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddSiteModal(false)}
      >
        <SafeView style={styles.modalOverlay}>
          <SafeView style={styles.modalContent}>
            <SafeView style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{titleMap[drillLevel]}</Text>
              <Pressable onPress={() => setShowAddSiteModal(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </Pressable>
            </SafeView>

            {/* Type indicator — read only, locked by screen context */}
            <SafeView style={[styles.formRow, { marginBottom: 8 }]}>
              <Text style={{ fontSize: 13, color: isDark ? '#aaa' : '#666', textAlign: 'center', flex: 1 }}>
                {iconMap[drillLevel]}{' '}
                {drillLevel === 'main' ? 'Will be saved as a Main Site'
                  : drillLevel === 'hospital' ? `Will be saved under ${mainSites.find(s => Number(s.id) === currentMainSiteId)?.name || 'selected site'}`
                    : `Will be saved under ${hospitals.find(h => Number(h.id) === currentHospitalId)?.name || 'selected hospital'}`}
              </Text>
            </SafeView>

            <SafeView style={styles.formRow}>
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                value={newSiteName}
                onChangeText={setNewSiteName}
                placeholder="Enter name"
                placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
                style={styles.formInput}
                autoFocus
              />
            </SafeView>

            {drillLevel === 'main' && (
              <SafeView style={styles.formRow}>
                <Text style={styles.formLabel}>Logo (Optional)</Text>
                <Pressable
                  onPress={handlePickSiteLogo}
                  style={[styles.formInput, { alignItems: 'center', justifyContent: 'center', padding: 12, borderStyle: 'dashed', borderWidth: 1 }]}
                >
                  {siteLogoUri ? (
                    <Image source={{ uri: siteLogoUri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                  ) : (
                    <Text style={{ color: isDark ? '#aaa' : '#666' }}>Tap to select an image</Text>
                  )}
                </Pressable>
                {Platform.OS === 'web' && (
                  // @ts-ignore -- web-only file input, guarded above
                  <input
                    type="file"
                    ref={siteLogoInputRef as any}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleSiteLogoFileChange}
                  />
                )}
              </SafeView>
            )}

            <Pressable onPress={handleAddSite} style={styles.addSiteButton}>
              <Text style={styles.addSiteButtonText}>Add</Text>
            </Pressable>
          </SafeView>
        </SafeView>
      </Modal>
    );
  };

  const renderEditSiteModal = () => (
    <Modal
      visible={showEditSiteModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowEditSiteModal(false)}
    >
      <SafeView style={styles.modalOverlay}>
        <SafeView style={styles.modalContent}>
          <SafeView style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rename</Text>
            <Pressable onPress={() => setShowEditSiteModal(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </SafeView>

          <SafeView style={styles.formRow}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              value={editSiteName}
              onChangeText={setEditSiteName}
              placeholder="Enter new name"
              placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
              style={styles.formInput}
              autoFocus
            />
          </SafeView>

          {selectedManageSite?._level === 'main' && (
            <SafeView style={styles.formRow}>
              <Text style={styles.formLabel}>Logo (Optional)</Text>
              <Pressable
                onPress={handlePickSiteLogo}
                style={[styles.formInput, { alignItems: 'center', justifyContent: 'center', padding: 12, borderStyle: 'dashed', borderWidth: 1 }]}
              >
                {siteLogoUri || selectedManageSite?.logo ? (
                  <Image source={{ uri: siteLogoUri || (selectedManageSite.logo.startsWith('http') ? selectedManageSite.logo : `${API_BASE_URL.replace(/\/api$/, '')}${selectedManageSite.logo}`) }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                ) : (
                  <Text style={{ color: isDark ? '#aaa' : '#666' }}>Tap to select an image</Text>
                )}
              </Pressable>
              {Platform.OS === 'web' && (
                // @ts-ignore -- web-only file input, guarded above
                <input
                  type="file"
                  ref={siteLogoInputRef as any}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleSiteLogoFileChange}
                />
              )}
            </SafeView>
          )}

          <Pressable onPress={handleEditSite} style={styles.addSiteButton}>
            <Text style={styles.addSiteButtonText}>Update</Text>
          </Pressable>
        </SafeView>
      </SafeView>
    </Modal>
  );

  const renderSiteDeletedModal = () => (
    <Modal
      visible={showSiteDeletedSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSiteDeletedSuccessModal(false)}
    >
      <SafeView style={styles.modalOverlay}>
        <SafeView style={styles.successModalCard}>
          <SafeView style={styles.deleteSuccessIconWrapper}>
            <Text style={styles.successIcon}>✓</Text>
          </SafeView>
          <Text style={styles.successTitle}>Site Deleted Successfully!</Text>
          <Pressable
            onPress={() => setShowSiteDeletedSuccessModal(false)}
            style={styles.successButton}
          >
            <Text style={styles.successButtonText}>Ok</Text>
          </Pressable>
        </SafeView>
      </SafeView>
    </Modal>
  );

  const renderAssetsView = () => (
    <View style={styles.assetsContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.assetsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setAssetSearch("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.assetsTitle}>
          Assets
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={assetSearch}
          onChangeText={setAssetSearch}
          placeholder="Search"
          placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        style={[styles.assetsTableVerticalScroll, { overscrollBehavior: 'none' } as any]}
        showsVerticalScrollIndicator={true}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled={true}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.assetsTableHorizontalScroll}
          nestedScrollEnabled={true}
        >
          <View style={styles.assetsTableWrapper}>
            {/* Header Row */}
            <View style={[styles.assetsTableRow, styles.assetsTableHeaderRow]}>
              <Text
                style={[
                  styles.assetsTableCell,
                  styles.assetsTableHeaderCell,
                  styles.assetColId,
                ]}
              >
                ID
              </Text>
              <Text
                style={[
                  styles.assetsTableCell,
                  styles.assetsTableHeaderCell,
                  styles.assetColName,
                ]}
              >
                Name
              </Text>
              <Text
                style={[
                  styles.assetsTableCell,
                  styles.assetsTableHeaderCell,
                  styles.assetColCount,
                ]}
              >
                Count
              </Text>
              <Text
                style={[
                  styles.assetsTableCell,
                  styles.assetsTableHeaderCell,
                  styles.assetColValue,
                ]}
              >
                Value
              </Text>
              <Text
                style={[
                  styles.assetsTableCell,
                  styles.assetsTableHeaderCell,
                  styles.assetColActions,
                ]}
              >
                Actions
              </Text>
            </View>

            {/* Data Rows */}
            {filteredAssetData.length > 0 ? (
              filteredAssetData.map((item) => (
                <View key={item.id} style={styles.assetsTableRow}>
                  <Text style={[styles.assetsTableCell, styles.assetColId]}>
                    {item.id}
                  </Text>
                  <Text style={[styles.assetsTableCell, styles.assetColName]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.assetsTableCell, styles.assetColCount]}>
                    {item.count}
                  </Text>
                  <Text style={[styles.assetsTableCell, styles.assetColValue]}>
                    {item.value}
                  </Text>
                  <View
                    style={[styles.assetsTableCell, styles.assetColActions]}
                  >
                    <Pressable
                      onPress={() => openUpdateModal(item)}
                      style={styles.assetActionButtonEdit}
                    >
                      <Text style={styles.assetActionIcon}>✏️</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteAsset(item)}
                      style={styles.assetActionButtonDelete}
                    >
                      <Text style={styles.assetActionIcon}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.assetsTableEmptyRow}>
                <Text style={styles.emptyText}>No matching assets found.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );

  const renderPersonalSelectionView = () => {
    return (
      <View style={styles.personalSelectionContainer}>
        <View
          style={[
            styles.headerSection,
            styles.greetingContainer,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Malith"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? "#333" : "#e0e0e0",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "#fff" : "#000",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>

        <View style={[styles.personalSelectionHeader, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Pressable
            onPress={() => {
              setSelectedView("dashboard");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonIcon}>{"←"}</Text>
          </Pressable>
          <ThemedText type="subtitle" style={[styles.personalSelectionTitle, { flex: 1, textAlign: 'center' }]}>
            Personal
          </ThemedText>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.personalSelectionContent}>
          <Pressable
            onPress={handlePersonalAssetsTilePress}
            style={styles.personalTile}
          >
            <View
              style={[styles.personalTileInner, { backgroundColor: "#e74c3c" }]}
            >
              <ThemedText style={styles.personalTileText}>
                Personal Assets
              </ThemedText>
            </View>
          </Pressable>

          <Pressable
            onPress={handlePersonalDocumentsTilePress}
            style={styles.personalTile}
          >
            <View
              style={[styles.personalTileInner, { backgroundColor: "#9b8b7e" }]}
            >
              <ThemedText style={styles.personalTileText}>
                Personal Details{"\n"}& Documents
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderPersonalDocumentsView = () => {
    return (
      <View style={styles.personalDocumentsContainer}>
        <View
          style={[
            styles.headerSection,
            styles.greetingContainer,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Malith"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? "#333" : "#e0e0e0",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "#fff" : "#000",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>

        <View style={styles.personalDocumentsHeader}>
          <Pressable
            onPress={() => setSelectedView("personalSelection")}
            style={styles.backButton}
          >
            <Text style={styles.backButtonIcon}>{"←"}</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalDocumentsTitle}>
            Personal Details & Documents
          </ThemedText>
        </View>

        <View style={styles.personalDocumentsSection}>
          {/* NOTES */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              value={newNoteText}
              onChangeText={setNewNoteText}
              placeholder="Add a new note"
              placeholderTextColor="#8a8a8f"
              style={styles.notesInput}
              multiline
            />
            <Pressable onPress={handleSaveNote} style={styles.sectionButton}>
              <Text style={styles.sectionButtonText}>
                {selectedNoteId ? "Update Note" : "Save Note"}
              </Text>
            </Pressable>

            {notes.map((note) => (
              <View key={note.id} style={styles.noteItem}>
                <View style={styles.noteTextSection}>
                  <Text style={styles.noteText}>{note.text}</Text>
                  <Text style={styles.noteDate}>{note.date}</Text>
                </View>
                <View style={styles.noteActions}>
                  <Pressable
                    onPress={() => handleEditNote(note)}
                    style={styles.noteActionButton}
                  >
                    <Text style={styles.noteActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteNote(note.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>

          {/* FILES */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Files</Text>
            <TextInput
              value={newFileName}
              onChangeText={setNewFileName}
              placeholder="File name (auto-filled on pick)"
              placeholderTextColor="#8a8a8f"
              style={styles.textInput}
            />
            <Text
              style={{
                color: isDark ? "#a0a0a0" : "#6b7280",
                fontSize: 13,
                marginBottom: 6,
              }}
            >
              Tap a type to pick a file from your device:
            </Text>
            <View style={styles.fileTypeRow}>
              {(["PDF", "WORD", "IMG"] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => handlePickFile(type)}
                  style={[
                    styles.fileTypeButton,
                    newFileType === type && styles.fileTypeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fileTypeText,
                      newFileType === type && styles.fileTypeTextActive,
                    ]}
                  >
                    {type === "IMG" ? "🖼️" : type === "PDF" ? "📄" : "📝"}{" "}
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
            {pickedFileActualName ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  padding: 8,
                  backgroundColor: isDark ? "#1a2a1a" : "#dcfce7",
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text
                  style={{
                    color: isDark ? "#86efac" : "#166534",
                    fontSize: 13,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {pickedFileActualName}
                </Text>
              </View>
            ) : null}
            <Pressable onPress={handleSaveFile} style={styles.sectionButton}>
              <Text style={styles.sectionButtonText}>
                {selectedFileId ? "Update File" : "Add File"}
              </Text>
            </Pressable>

            {files.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileIcon}>
                  {getFileTypeIcon(file.type)}
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.fileDate}>{file.uploaded_at}</Text>
                </View>
                <View style={styles.fileActions}>
                  <Pressable
                    onPress={() => handleEditFile(file)}
                    style={styles.noteActionButton}
                  >
                    <Text style={styles.noteActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteFile(file.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderPersonalAssetsView = () => {
    return (
      <View style={styles.personalContainer}>
        <View
          style={[
            styles.headerSection,
            styles.greetingContainer,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Malith"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? "#333" : "#e0e0e0",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: isDark ? "#fff" : "#000",
              }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>

        <View style={styles.personalHeader}>
          <Pressable
            onPress={() => {
              setSelectedView("personalSelection");
            }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalTitle}>
            Personal Assets
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.personalTabRow}>
          {[
            { key: "vehicles", label: "Vehicles" },
            { key: "jewelleries", label: "Jewelleries" },
            { key: "properties", label: "Properties" },
          ].map((tab) => {
            const active = selectedPersonalTab === tab.key;
            const backgroundColors: Record<string, string> = {
              vehicles: active ? "#16a34a" : "#dcfce7",
              jewelleries: active ? "#fb923c" : "#fed7aa",
              properties: active ? "#2563eb" : "#dbeafe",
            };
            const textColors: Record<string, string> = {
              vehicles: active ? "#ffffff" : "#166534",
              jewelleries: active ? "#ffffff" : "#92400e",
              properties: active ? "#ffffff" : "#1d4ed8",
            };

            return (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedPersonalTab(tab.key as any)}
                style={[
                  styles.personalTabButton,
                  { backgroundColor: backgroundColors[tab.key] },
                ]}
              >
                {active && <View style={styles.personalTabDot} />}
                <Text
                  style={[
                    styles.personalTabText,
                    { color: textColors[tab.key] },
                    active && styles.personalTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setShowAddPersonalModal(true)}
            style={styles.personalAddButton}
          >
            <Text style={styles.personalAddButtonText}>
              {`Add ${getPersonalSectionTitleSingular()}`}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={[styles.personalTableScroll, { overscrollBehavior: 'none' } as any]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled={true}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.personalTableHorizontalScroll}
            nestedScrollEnabled={true}
          >
            <View style={styles.personalTableCard}>
              {selectedPersonalTab === "vehicles" ? (
                <>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCell, styles.personalCellId]}>
                      ID
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellMain]}>
                      Name
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellType]}>
                      Type
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellValue]}>
                      Value
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellExtra]}>
                      Plate No
                    </Text>
                    <Text
                      style={[styles.tableCell, styles.personalCellActions]}
                    >
                      Actions
                    </Text>
                  </View>
                  {vehicles.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.personalCellId]}>
                        {item.id}
                      </Text>
                      <Text style={[styles.tableCell, styles.personalCellMain]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.tableCell, styles.personalCellType]}>
                        {item.type}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellValue]}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellExtra]}
                      >
                        {item.plateNo}
                      </Text>
                      <View
                        style={[styles.tableCell, styles.personalCellActions]}
                      >
                        <Pressable
                          onPress={() => openPersonalEditModal(item)}
                          style={styles.assetActionButtonEdit}
                        >
                          <Text style={styles.assetActionIcon}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeletePersonalItem(item)}
                          style={styles.assetActionButtonDelete}
                        >
                          <Text style={styles.assetActionIcon}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              ) : selectedPersonalTab === "jewelleries" ? (
                <>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCell, styles.personalCellId]}>
                      ID
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellMain]}>
                      Name
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellValue]}>
                      Value
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellExtra]}>
                      Weight
                    </Text>
                    <Text
                      style={[styles.tableCell, styles.personalCellActions]}
                    >
                      Actions
                    </Text>
                  </View>
                  {jewelleries.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.personalCellId]}>
                        {item.id}
                      </Text>
                      <Text style={[styles.tableCell, styles.personalCellMain]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellValue]}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellExtra]}
                      >
                        {item.weight}
                      </Text>
                      <View
                        style={[styles.tableCell, styles.personalCellActions]}
                      >
                        <Pressable
                          onPress={() => openPersonalEditModal(item)}
                          style={styles.assetActionButtonEdit}
                        >
                          <Text style={styles.assetActionIcon}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeletePersonalItem(item)}
                          style={styles.assetActionButtonDelete}
                        >
                          <Text style={styles.assetActionIcon}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableCell, styles.personalCellId]}>
                      ID
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellMain]}>
                      Location
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellValue]}>
                      Value
                    </Text>
                    <Text style={[styles.tableCell, styles.personalCellExtra]}>
                      Area
                    </Text>
                    <Text
                      style={[styles.tableCell, styles.personalCellActions]}
                    >
                      Actions
                    </Text>
                  </View>
                  {properties.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.personalCellId]}>
                        {item.id}
                      </Text>
                      <Text style={[styles.tableCell, styles.personalCellMain]}>
                        {item.location}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellValue]}
                      >
                        {item.value}
                      </Text>
                      <Text
                        style={[styles.tableCell, styles.personalCellExtra]}
                      >
                        {item.area}
                      </Text>
                      <View
                        style={[styles.tableCell, styles.personalCellActions]}
                      >
                        <Pressable
                          onPress={() => openPersonalEditModal(item)}
                          style={styles.assetActionButtonEdit}
                        >
                          <Text style={styles.assetActionIcon}>✏️</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeletePersonalItem(item)}
                          style={styles.assetActionButtonDelete}
                        >
                          <Text style={styles.assetActionIcon}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}
              {getPersonalItemList().length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    No records available for {getPersonalSectionTitle()}.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    );
  };

  const renderPersonalAddModal = () => (
    <Modal
      visible={showAddPersonalModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddPersonalModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Add {getPersonalSectionTitleSingular()}
            </Text>
            <Pressable
              onPress={() => setShowAddPersonalModal(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {selectedPersonalTab === "properties" ? "Location" : "Name"}
            </Text>
            <TextInput
              value={newPersonalName}
              onChangeText={setNewPersonalName}
              placeholder={
                selectedPersonalTab === "properties"
                  ? "Enter location"
                  : "Enter name"
              }
              placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
              style={styles.formInput}
            />
          </View>

          {selectedPersonalTab === "vehicles" ? (
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type</Text>
              <TextInput
                value={newPersonalType}
                onChangeText={setNewPersonalType}
                placeholder="Enter type"
                placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
                style={styles.formInput}
              />
            </View>
          ) : null}

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {selectedPersonalTab === "vehicles" ? "Volume" : "Value"}
            </Text>
            <TextInput
              value={newPersonalValue}
              onChangeText={setNewPersonalValue}
              placeholder={
                selectedPersonalTab === "vehicles"
                  ? "Enter volume"
                  : "Enter value"
              }
              placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
              style={styles.formInput}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>{getPersonalExtraLabel()}</Text>
            <TextInput
              value={newPersonalExtra}
              onChangeText={setNewPersonalExtra}
              placeholder={`Enter ${getPersonalExtraLabel().toLowerCase()}`}
              placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
              style={styles.formInput}
            />
          </View>

          <Pressable
            onPress={handleAddPersonalItem}
            style={styles.addSiteButton}
          >
            <Text style={styles.addSiteButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderPersonalEditModal = () => (
    <Modal
      visible={showPersonalEditModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPersonalEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Edit {getPersonalSectionTitle()}
            </Text>
            <Pressable
              onPress={() => setShowPersonalEditModal(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>
              {selectedPersonalTab === "properties" ? "Location" : "Name"}
            </Text>
            <TextInput
              value={newPersonalName}
              onChangeText={setNewPersonalName}
              style={styles.formInput}
            />
          </View>

          {selectedPersonalTab === "vehicles" ? (
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type</Text>
              <TextInput
                value={newPersonalType}
                onChangeText={setNewPersonalType}
                style={styles.formInput}
              />
            </View>
          ) : null}

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Value</Text>
            <TextInput
              value={newPersonalValue}
              onChangeText={setNewPersonalValue}
              style={styles.formInput}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>{getPersonalExtraLabel()}</Text>
            <TextInput
              value={newPersonalExtra}
              onChangeText={setNewPersonalExtra}
              style={styles.formInput}
            />
          </View>

          <Pressable
            onPress={handleSavePersonalEdit}
            style={styles.updateButton}
          >
            <Text style={styles.updateButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderUpdateModal = () => (
    <Modal
      visible={showUpdateModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUpdateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Assets</Text>
            <Pressable
              onPress={() => setShowUpdateModal(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.formInput}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Count</Text>
            <TextInput
              value={editCount}
              onChangeText={setEditCount}
              keyboardType="numeric"
              style={styles.formInput}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Value</Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              style={styles.formInput}
            />
          </View>

          <Pressable onPress={handleUpdateAsset} style={styles.updateButton}>
            <Text style={styles.updateButtonText}>Update</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View style={styles.successIconWrapper}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{successModalTitle}</Text>
          <Pressable
            onPress={() => setShowSuccessModal(false)}
            style={styles.successButton}
          >
            <Text style={styles.successButtonText}>{successButtonText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderApprovalSuccessModal = () => (
    <Modal
      visible={showApprovalSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowApprovalSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View
            style={[styles.successIconWrapper, { backgroundColor: "#22c55e" }]}
          >
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Approval successful</Text>
          <Pressable
            onPress={() => setShowApprovalSuccessModal(false)}
            style={[styles.successButton, { backgroundColor: "#22c55e" }]}
          >
            <Text style={styles.successButtonText}>Ok</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderRejectReasonModal = () => (
    <Modal
      visible={showRejectReasonModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRejectReasonModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.rejectModalCard}>
          <View style={styles.rejectIconWrapper}>
            <Text style={styles.rejectIcon}>?</Text>
          </View>
          <Text style={styles.rejectTitle}>Why you want to reject?</Text>
          <TextInput
            style={styles.rejectInput}
            placeholder="Enter reason..."
            placeholderTextColor={isDark ? "#b0b0b0" : "#999"}
            value={rejectReason}
            onChangeText={setRejectReason}
          />
          <Pressable
            onPress={handleConfirmReject}
            style={[styles.successButton, { backgroundColor: "#dc2626" }]}
          >
            <Text style={styles.successButtonText}>Reject</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderRejectSuccessModal = () => (
    <Modal
      visible={showRejectSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRejectSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View
            style={[styles.successIconWrapper, { backgroundColor: "#dc2626" }]}
          >
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Rejected Successfully!</Text>
          <Pressable
            onPress={() => setShowRejectSuccessModal(false)}
            style={[styles.successButton, { backgroundColor: "#dc2626" }]}
          >
            <Text style={styles.successButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderTerminateConfirmModal = () => (
    <Modal
      visible={showTerminateConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowTerminateConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalCard}>
          <View style={styles.terminateIconWrapper}>
            <Text style={styles.terminateIcon}>📦</Text>
          </View>
          <Text style={styles.confirmTitle}>
            Do you want to terminate this worker?
          </Text>
          <View style={styles.confirmButtonRow}>
            <Pressable
              onPress={handleConfirmTerminate}
              style={[styles.confirmButton, styles.confirmYesButton]}
            >
              <Text style={styles.confirmButtonText}>Yes</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTerminateConfirmModal(false)}
              style={[styles.confirmButton, styles.confirmNoButton]}
            >
              <Text style={styles.confirmButtonText}>No</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTerminateSuccessModal = () => (
    <Modal
      visible={showTerminateSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowTerminateSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View
            style={[styles.successIconWrapper, { backgroundColor: "#22c55e" }]}
          >
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            This worker terminated Successfully!!
          </Text>
          <Pressable
            onPress={() => setShowTerminateSuccessModal(false)}
            style={[styles.successButton, { backgroundColor: "#22c55e" }]}
          >
            <Text style={styles.successButtonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderWorkerDeleteSuccessModal = () => (
    <Modal
      visible={showWorkerDeleteSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowWorkerDeleteSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View
            style={[styles.successIconWrapper, { backgroundColor: "#dc2626" }]}
          >
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>worker Deleted Successfully!</Text>
          <Pressable
            onPress={() => setShowWorkerDeleteSuccessModal(false)}
            style={[styles.successButton, { backgroundColor: "#dc2626" }]}
          >
            <Text style={styles.successButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderChemicalsView = () => (
    <View style={styles.chemicalsContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.chemicalsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setChemicalSearch("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.chemicalsTitle}>
          Chemicals
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={chemicalSearch}
          onChangeText={setChemicalSearch}
          placeholder="Search Here"
          placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        style={[styles.tableScrollContainer, { overscrollBehavior: 'none' } as any]}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      >
        <View style={styles.tableCard}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.chemicalCellName,
              ]}
            >
              Name
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.chemicalCellQuantity,
              ]}
            >
              Quantity
            </Text>
            <Text
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                styles.chemicalCellStatus,
              ]}
            >
              Status
            </Text>
          </View>

          {filteredChemicalData.map((item: any, idx: number) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.chemicalCellName]}>
                {item.name}
              </Text>
              <Text style={[styles.tableCell, styles.chemicalCellQuantity]}>
                {item.quantity}
              </Text>
              <Text style={[styles.tableCell, styles.chemicalCellStatus]}>
                {item.status}
              </Text>
            </View>
          ))}

          {filteredChemicalData.length === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No matching chemicals found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const renderApprovalsView = () => (
    <View style={styles.approvalsContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.approvalsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setApprovalSearch("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.approvalsTitle}>
          Approvals
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={approvalSearch}
          onChangeText={setApprovalSearch}
          placeholder="Search Here"
          placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalTableScroll}
        >
          <View style={styles.tableCard}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellID,
                ]}
              >
                ID
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellDescription,
                ]}
              >
                Description
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellAmount,
                ]}
              >
                Amount
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellDate,
                ]}
              >
                Date
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellHolder,
                ]}
              >
                Holder
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.approvalCellAction,
                ]}
              >
                Action
              </Text>
            </View>

            {filteredApprovalData.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.approvalCellID]}>
                  {item.id}
                </Text>
                <Text
                  style={[styles.tableCell, styles.approvalCellDescription]}
                >
                  {item.description}
                </Text>
                <Text style={[styles.tableCell, styles.approvalCellAmount]}>
                  {item.amount}
                </Text>
                <Text style={[styles.tableCell, styles.approvalCellDate]}>
                  {item.date}
                </Text>
                <Text style={[styles.tableCell, styles.approvalCellHolder]}>
                  {item.holder}
                </Text>
                <View style={styles.approvalActionsContainer}>
                  <Pressable
                    onPress={() => handleApproveApproval(item)}
                    style={[styles.actionButton, styles.approveButton]}
                  >
                    <Text style={styles.approveButtonText}>✓</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleOpenRejectModal(item)}
                    style={[styles.actionButton, styles.rejectButton]}
                  >
                    <Text style={styles.rejectButtonText}>✕</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {filteredApprovalData.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>
                  No matching approvals found.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Approval History Grid */}
      <View
        style={[
          {
            backgroundColor: isDark ? "#1e1e1e" : "#fff",
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
            marginHorizontal: 0,
          },
        ]}
      >
        <ThemedText
          type="subtitle"
          style={{ marginBottom: 12, color: isDark ? "#fff" : "#1f1d21" }}
        >
          Approval History
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: "100%" }}>
            <View
              style={[
                styles.tableCard,
                { borderColor: "#16a34a", borderWidth: 2 },
              ]}
            >
              {/* Header */}
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    styles.approvalCellID,
                  ]}
                >
                  ID
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    styles.approvalCellDescription,
                  ]}
                >
                  Description
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    styles.approvalCellAmount,
                  ]}
                >
                  Amount
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    styles.approvalCellDate,
                  ]}
                >
                  Date
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableHeaderCell,
                    styles.approvalCellHolder,
                  ]}
                >
                  Holder
                </Text>
              </View>

              {/* Rows */}
              <ScrollView
                style={{ maxHeight: 240 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {filteredApprovals.filter(
                  (a: any) => a.status?.toLowerCase() === "approved"
                ).length === 0 ? (
                  <View
                    style={{ paddingVertical: 16, alignItems: "center" }}
                  >
                    <Text
                      style={{
                        color: isDark ? "#aaa" : "#888",
                        fontSize: 13,
                      }}
                    >
                      No approved records yet.
                    </Text>
                  </View>
                ) : (
                  filteredApprovals
                    .filter(
                      (a: any) => a.status?.toLowerCase() === "approved"
                    )
                    .map((item: any, index: number) => (
                      <View
                        key={item.id}
                        style={[
                          styles.tableRow,
                          index % 2 === 0
                            ? {
                              backgroundColor: isDark
                                ? "#2a2a2a"
                                : "#f9f9f9",
                            }
                            : {
                              backgroundColor: isDark ? "#1e1e1e" : "#fff",
                            },
                          { borderLeftWidth: 3, borderLeftColor: "#16a34a" },
                        ]}
                      >
                        <Text
                          style={[styles.tableCell, styles.approvalCellID]}
                          numberOfLines={1}
                        >
                          {item.id}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.approvalCellDescription,
                          ]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.approvalCellAmount,
                            { color: "#16a34a", fontWeight: "600" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.amount ?? "-"}
                        </Text>
                        <Text
                          style={[styles.tableCell, styles.approvalCellDate]}
                          numberOfLines={1}
                        >
                          {item.date ?? "-"}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            styles.approvalCellHolder,
                          ]}
                          numberOfLines={1}
                        >
                          {item.holder ?? "-"}
                        </Text>
                      </View>
                    ))
                )}
              </ScrollView>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  // ── renderHospitalShiftsView ─────────────────────────────────────────────
  const renderHospitalShiftsView = () => {
    const worksiteOptions = [
      { label: "All Worksites", value: "All" },
      ...worksites.map((w: any) => ({ label: w.name, value: String(w.id) })),
    ];
    const filteredHospitalsForShifts = hospitals.filter((h: any) =>
      shiftsWorksiteFilter === "All" || String(h.worksite_id) === shiftsWorksiteFilter
    );

    const summarize = (h: any, prefix: "day" | "night") => {
      // Hospital has no cast on these TIME columns (see the model), so the
      // general /hospitals list returns raw "HH:MM:SS" - trim to "HH:MM".
      const start = h[`${prefix}_shift_start`];
      const end = h[`${prefix}_shift_end`];
      if (start && end) return `${String(start).slice(0, 5)} - ${String(end).slice(0, 5)}`;
      return "Default";
    };

    // Live preview of what the form's current values (falling back to this
    // hospital's defaults for anything left blank) actually mean in plain
    // clock time - the same numbers the backend will end up using once saved.
    const previewConfig: ShiftConfig = {
      day_shift_start: shiftForm.day_shift_start || String(shiftDefaults?.day_shift_start ?? DEFAULT_SHIFT_CONFIG.day_shift_start),
      day_shift_end: shiftForm.day_shift_end || String(shiftDefaults?.day_shift_end ?? DEFAULT_SHIFT_CONFIG.day_shift_end),
      day_late_grace_minutes: shiftForm.day_late_grace_minutes !== "" ? parseInt(shiftForm.day_late_grace_minutes, 10) : Number(shiftDefaults?.day_late_grace_minutes ?? DEFAULT_SHIFT_CONFIG.day_late_grace_minutes),
      day_early_grace_minutes: shiftForm.day_early_grace_minutes !== "" ? parseInt(shiftForm.day_early_grace_minutes, 10) : Number(shiftDefaults?.day_early_grace_minutes ?? DEFAULT_SHIFT_CONFIG.day_early_grace_minutes),
      night_shift_start: shiftForm.night_shift_start || String(shiftDefaults?.night_shift_start ?? DEFAULT_SHIFT_CONFIG.night_shift_start),
      night_shift_end: shiftForm.night_shift_end || String(shiftDefaults?.night_shift_end ?? DEFAULT_SHIFT_CONFIG.night_shift_end),
      night_late_grace_minutes: shiftForm.night_late_grace_minutes !== "" ? parseInt(shiftForm.night_late_grace_minutes, 10) : Number(shiftDefaults?.night_late_grace_minutes ?? DEFAULT_SHIFT_CONFIG.night_late_grace_minutes),
      night_early_grace_minutes: shiftForm.night_early_grace_minutes !== "" ? parseInt(shiftForm.night_early_grace_minutes, 10) : Number(shiftDefaults?.night_early_grace_minutes ?? DEFAULT_SHIFT_CONFIG.night_early_grace_minutes),
    };
    const shiftWindowPreview = computeShiftWindowSummaries(previewConfig);

    const renderShiftWindowTable = (title: string, s: ReturnType<typeof computeShiftWindowSummaries>["day"]) => (
      <View style={{ marginBottom: 16 }}>
        <ThemedText type="subtitle" style={{ fontSize: 14, marginBottom: 6 }}>{title}</ThemedText>
        <View style={[styles.tableCard, { minWidth: undefined }]}>
          <View style={[styles.tableRow, styles.tableHeaderRow]}>
            <Text style={[styles.tableHeaderCell, { flex: 1.6 }]}></Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Time</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Toggle button Action</Text>
          </View>
          {[
            ["Shift window", s.shiftWindow, "-"],
            ["Shift begins", s.shiftBegins, "-"],
            ["On-time IN", s.onTimeIn.range, s.onTimeIn.toggle],
            ["Late IN", s.lateIn.range, s.lateIn.toggle],
            ["Shift ends", s.shiftEnds, "-"],
            ["On-time OUT", s.onTimeOut.range, s.onTimeOut.toggle],
            ["Early OUT", s.earlyOut.range, s.earlyOut.toggle],
          ].map(([label, time, toggle], idx) => (
            <View key={label} style={[styles.tableRow, idx !== 6 && { borderBottomWidth: 1, borderBottomColor: isDark ? "#333" : "#e5e7eb" }]}>
              <Text style={[styles.tableCell, { flex: 1.6, fontWeight: "600" }]}>{label}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{time}</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{toggle}</Text>
            </View>
          ))}
        </View>
      </View>
    );

    return (
      <View style={styles.workersContainer}>
        <View style={styles.workersHeader}>
          <Pressable onPress={() => setSelectedView("dashboard")} style={styles.backButton}>
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.workersTitle}>
            Hospital Shifts
          </ThemedText>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ paddingHorizontal: Spacing.four, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 6 }}>
            Filter by worksite
          </Text>
          <SelectInput
            value={shiftsWorksiteFilter}
            onChange={setShiftsWorksiteFilter}
            options={worksiteOptions}
            webStyle={{
              backgroundColor: isDark ? "#1e1e1e" : "#fff",
              color: isDark ? "#fff" : "#000",
              border: `1px solid ${isDark ? "#333" : "#ddd"}`,
              borderRadius: 8,
              padding: "8px 12px",
              width: "100%",
            }}
          />
        </View>

        <ScrollView
          style={styles.tableScrollContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          bounces={false}
          overScrollMode="never"
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalTableScroll} nestedScrollEnabled={true}>
            <View style={[styles.tableCard, { minWidth: 720 }]}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Hospital</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Worksite</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Day Shift</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Night Shift</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Actions</Text>
              </View>

              {filteredHospitalsForShifts.map((h: any, index: number) => (
                <View
                  key={h.id}
                  style={[
                    styles.tableRow,
                    index !== filteredHospitalsForShifts.length - 1 && { borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
                  ]}
                >
                  <Text style={[styles.tableCell, { flex: 2 }]}>{h.name}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>
                    {worksites.find((w: any) => w.id === h.worksite_id)?.name || "—"}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{summarize(h, "day")}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{summarize(h, "night")}</Text>
                  <View style={[styles.tableCell, { flex: 1.5 }]}>
                    <Pressable
                      onPress={() => openEditShifts(h)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: "#6a5acd",
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Edit Shifts</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {filteredHospitalsForShifts.length === 0 && (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>No hospitals found.</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Edit Shifts Modal */}
        <Modal visible={!!shiftEditHospital} transparent animationType="fade" onRequestClose={() => setShiftEditHospital(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff", maxHeight: "85%" }]}>
              <View style={styles.modalHeader}>
                <ThemedText type="title">{shiftEditHospital?.name} — Shifts</ThemedText>
                <Pressable style={styles.modalClose} onPress={() => setShiftEditHospital(null)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              {shiftLoading ? (
                <ActivityIndicator style={{ marginVertical: 40 }} color={isDark ? "#fff" : "#000"} />
              ) : (
                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 16 }}>
                    Leave a field blank to use the app-wide default shown as its placeholder.
                  </Text>

                  {/* Day Shift */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <ThemedText type="subtitle" style={{ fontSize: 15 }}>☀️ Day Shift</ThemedText>
                    <Pressable onPress={() => resetShiftFormFields(["day_shift_start", "day_shift_end", "day_late_grace_minutes", "day_early_grace_minutes"])}>
                      <Text style={{ fontSize: 12, color: "#6a5acd", fontWeight: "600" }}>Reset to Default</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Start (default {shiftDefaults?.day_shift_start ?? "07:00"})</Text>
                      <TimeInput value={shiftForm.day_shift_start} onChange={(v) => setShiftForm((p) => ({ ...p, day_shift_start: v }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>End (default {shiftDefaults?.day_shift_end ?? "19:00"})</Text>
                      <TimeInput value={shiftForm.day_shift_end} onChange={(v) => setShiftForm((p) => ({ ...p, day_shift_end: v }))} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Late grace, min (default {shiftDefaults?.day_late_grace_minutes ?? 30})</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="number-pad"
                        placeholder={String(shiftDefaults?.day_late_grace_minutes ?? 30)}
                        placeholderTextColor="#aaa"
                        value={shiftForm.day_late_grace_minutes}
                        onChangeText={(v) => setShiftForm((p) => ({ ...p, day_late_grace_minutes: v.replace(/[^0-9]/g, "") }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Early grace, min (default {shiftDefaults?.day_early_grace_minutes ?? 120})</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="number-pad"
                        placeholder={String(shiftDefaults?.day_early_grace_minutes ?? 120)}
                        placeholderTextColor="#aaa"
                        value={shiftForm.day_early_grace_minutes}
                        onChangeText={(v) => setShiftForm((p) => ({ ...p, day_early_grace_minutes: v.replace(/[^0-9]/g, "") }))}
                      />
                    </View>
                  </View>

                  {/* Night Shift */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <ThemedText type="subtitle" style={{ fontSize: 15 }}>🌙 Night Shift</ThemedText>
                    <Pressable onPress={() => resetShiftFormFields(["night_shift_start", "night_shift_end", "night_late_grace_minutes", "night_early_grace_minutes"])}>
                      <Text style={{ fontSize: 12, color: "#6a5acd", fontWeight: "600" }}>Reset to Default</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Start (default {shiftDefaults?.night_shift_start ?? "19:00"})</Text>
                      <TimeInput value={shiftForm.night_shift_start} onChange={(v) => setShiftForm((p) => ({ ...p, night_shift_start: v }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>End (default {shiftDefaults?.night_shift_end ?? "07:00"})</Text>
                      <TimeInput value={shiftForm.night_shift_end} onChange={(v) => setShiftForm((p) => ({ ...p, night_shift_end: v }))} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Late grace, min (default {shiftDefaults?.night_late_grace_minutes ?? 30})</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="number-pad"
                        placeholder={String(shiftDefaults?.night_late_grace_minutes ?? 30)}
                        placeholderTextColor="#aaa"
                        value={shiftForm.night_late_grace_minutes}
                        onChangeText={(v) => setShiftForm((p) => ({ ...p, night_late_grace_minutes: v.replace(/[^0-9]/g, "") }))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Early grace, min (default {shiftDefaults?.night_early_grace_minutes ?? 120})</Text>
                      <TextInput
                        style={styles.formInput}
                        keyboardType="number-pad"
                        placeholder={String(shiftDefaults?.night_early_grace_minutes ?? 120)}
                        placeholderTextColor="#aaa"
                        value={shiftForm.night_early_grace_minutes}
                        onChangeText={(v) => setShiftForm((p) => ({ ...p, night_early_grace_minutes: v.replace(/[^0-9]/g, "") }))}
                      />
                    </View>
                  </View>

                  {/* Live preview: exactly what these numbers mean in real
                      clock time, updating as the fields above change. */}
                  <View style={{ height: 1, backgroundColor: isDark ? "#333" : "#e5e7eb", marginBottom: 16 }} />
                  <ThemedText type="subtitle" style={{ fontSize: 15, marginBottom: 4 }}>What this means</ThemedText>
                  <Text style={{ fontSize: 12, color: isDark ? "#aaa" : "#666", marginBottom: 12 }}>
                    Live preview based on the values above (or their defaults, for anything left blank).
                  </Text>
                  {renderShiftWindowTable("Morning (Day)", shiftWindowPreview.day)}
                  {renderShiftWindowTable("Evening (Night)", shiftWindowPreview.night)}
                </ScrollView>
              )}

              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.addSiteButton, { backgroundColor: "#6a5acd", opacity: shiftSaving ? 0.7 : 1 }]}
                  onPress={handleSaveShifts}
                  disabled={shiftSaving || shiftLoading}
                >
                  <Text style={styles.addSiteButtonText}>{shiftSaving ? "Saving…" : "Save Shifts"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Success banner */}
        {shiftSuccessVisible && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff", padding: 28, alignItems: "center" }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <ThemedText type="title" style={{ marginBottom: 6 }}>Shifts Updated!</ThemedText>
                <Text style={{ color: isDark ? "#ccc" : "#666", marginBottom: 20, textAlign: "center" }}>
                  This hospital's shift settings have been saved.
                </Text>
                <Pressable style={[styles.addSiteButton, { backgroundColor: "#3b82f6" }]} onPress={() => setShiftSuccessVisible(false)}>
                  <Text style={styles.addSiteButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  const renderWorkersView = () => (
    <View style={styles.workersContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.workersHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setWorkerSearch("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.workersTitle}>
          Workers
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={workerSearch}
          onChangeText={setWorkerSearch}
          placeholder="Search Here"
          placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={false}
        overScrollMode="never"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalTableScroll}
          nestedScrollEnabled={true}
        >
          <View style={styles.tableCard}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellID,
                ]}
              >
                ID
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellName,
                ]}
              >
                Name
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellSite,
                ]}
              >
                Site
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellType,
                ]}
              >
                Type
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellActions,
                  { textAlign: 'center' },
                ]}
              >
                Actions
              </Text>
            </View>

            {filteredWorkerData.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                {/* Display-only sequential number (1, 2, 3…) - the real
                    database id (used by attendance, salaries, EPF history,
                    and the face-recognition service) is left untouched. */}
                <Text style={[styles.tableCell, styles.workerCellID]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellName]}>
                  {item.name}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellSite]}>
                  {item.worksite?.name || item.site || "Unassigned"}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellType]}>
                  {item.role || item.type || "N/A"}
                </Text>
                <View style={styles.workerActionsContainer}>
                  <Pressable
                    onPress={() => handleTerminateWorker(item)}
                    style={[styles.workerActionButton, styles.terminateButton]}
                  >
                    <Text style={styles.workerActionIcon}>⚠️</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteWorker(item)}
                    style={[styles.workerActionButton, styles.deleteButton]}
                  >
                    <Text style={styles.workerActionIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))}

            {filteredWorkerData.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No matching workers found.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );

  const renderAdminProfileModal = () => (
    <View style={styles.personalContainer}>
      <View
        style={[
          styles.headerSection,
          styles.greetingContainer,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Malith"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: isDark ? "#333" : "#e0e0e0",
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isDark ? "#fff" : "#000",
            }}
          >
            Sign Out
          </Text>
        </Pressable>
      </View>
      <View style={styles.personalHeader}>
        <Pressable
          onPress={() => setSelectedView("dashboard")}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.personalTitle}>
          Admin Profile
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Name</Text>
        <TextInput
          value={adminName}
          onChangeText={(text) => {
            setAdminName(text);
            setProfileError("");
          }}
          style={styles.formInput}
          placeholder="Admin name"
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput
          value={adminEmail}
          onChangeText={(text) => {
            setAdminEmail(text);
            setProfileError("");
          }}
          style={styles.formInput}
          placeholder="Email"
          keyboardType="email-address"
        />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Password</Text>
        <TextInput
          value={adminPassword}
          onChangeText={(text) => {
            setAdminPassword(text);
            setProfileError("");
          }}
          style={styles.formInput}
          placeholder="New password (leave blank to keep)"
          secureTextEntry
        />
      </View>
      {profileError ? (
        <Text style={{ color: "red", marginBottom: 8, paddingHorizontal: 16 }}>
          {profileError}
        </Text>
      ) : null}
      <Pressable
        onPress={handleUpdateAdminProfile}
        style={[styles.addSiteButton, { marginTop: 16, marginHorizontal: 16 }]}
      >
        <Text style={styles.addSiteButtonText}>Save Profile</Text>
      </Pressable>
    </View>
  );

  // ── renderAdminAccountsView ─────────────────────────────────────────────
  const renderAdminAccountsView = () => (
    <View style={styles.personalContainer}>
      {/* Greeting + Sign Out */}
      <View style={[styles.headerSection, styles.greetingContainer, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
        <Pressable
          onPress={async () => { await signOut(); router.replace("/"); }}
          style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? "#333" : "#e0e0e0", borderRadius: 8 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#000" }}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Header row with Back */}
      <View style={styles.personalHeader}>
        <Pressable style={styles.backButton} onPress={() => setSelectedView("dashboard")}>
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.personalTitle}>Accounts</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      {/* Tile buttons */}
      <View style={[styles.tableCard, { padding: 24, gap: 16 }]}>
        <Pressable
          style={[
            styles.addSiteButton,
            { backgroundColor: "#c0392b", paddingVertical: 22, borderRadius: 16 },
          ]}
          onPress={() => {
            setAdminCashForm((p) => ({ ...p, date: getAdminSriLankaDate(), prevBalance: "0.00" }));
            setSelectedView("adminCashInHand");
          }}
        >
          <Text style={[styles.addSiteButtonText, { fontSize: 16 }]}>💵  Cash in Hand</Text>
        </Pressable>

        <Pressable
          style={[
            styles.addSiteButton,
            { backgroundColor: "#a89080", paddingVertical: 22, borderRadius: 16 },
          ]}
          onPress={() => {
            setAdminBankForm((p) => ({ ...p, date: getAdminSriLankaDate(), prevBalance: "0.00" }));
            setSelectedView("adminBank");
          }}
        >
          <Text style={[styles.addSiteButtonText, { fontSize: 16 }]}>{"🏦  Bank"}</Text>
        </Pressable>
      </View>
    </View>
  );

  // ── renderAdminCashInHandView ───────────────────────────────────────────
  const renderAdminCashInHandView = () => {
    const totalDebit = adminCashEntries.reduce((s, e) => s + (e.debit ?? 0), 0);
    const totalCredit = adminCashEntries.reduce((s, e) => s + (e.credit ?? 0), 0);

    // Closing balance = balance field of the last entry in the previous
    // calendar month (same lookup the export button used to duplicate
    // inline - hoisted here so it's shared with the summary below too).
    const adminCashPrevMonthBalance = (() => {
      const now = new Date();
      const offset = 330;
      const local = new Date(now.getTime() + offset * 60 * 1000);
      const year = local.getUTCFullYear();
      const month = local.getUTCMonth();
      const prevMonthStart = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
      const prevMonthEnd = new Date(Date.UTC(year, month, 1));
      const prevMonthEntries = adminCashEntries
        .filter((e) => {
          const d = new Date(e.date);
          return d >= prevMonthStart && d < prevMonthEnd;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return prevMonthEntries.length > 0 ? prevMonthEntries[prevMonthEntries.length - 1].balance : 0;
    })();

    // Closing Balance = Opening Balance + Total Credit - Total Debit
    const currentBalance = adminCashPrevMonthBalance + totalCredit - totalDebit;

    const filtered = adminCashEntries
      .filter(
        (e) =>
          e.chequeNo.toLowerCase().includes(adminCashSearch.toLowerCase()) ||
          e.description.toLowerCase().includes(adminCashSearch.toLowerCase())
      )
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return adminCashSortOrder === "asc" ? da - db : db - da;
      });

    const handleAdd = () => {
      if (!adminCashForm.date) { Alert.alert("Validation", "Date is required."); return; }
      const debit = adminCashTransactionType === "debit" && adminCashForm.amount ? parseFloat(adminCashForm.amount) : null;
      const credit = adminCashTransactionType === "credit" && adminCashForm.amount ? parseFloat(adminCashForm.amount) : null;
      const prev = parseFloat(adminCashForm.prevBalance || "0");
      const newBalance = prev + (credit ?? 0) - (debit ?? 0);

      if (adminCashEditingId) {
        setAdminCashEntries((prev2) => prev2.map((e) => e.id === adminCashEditingId
          ? { ...e, date: adminCashForm.date, chequeNo: adminCashForm.chequeNo, description: adminCashForm.description, debit, credit, balance: newBalance }
          : e));
        updateCashInHandEntry(adminCashEditingId, {
          date: adminCashForm.date,
          cheque_no: adminCashForm.chequeNo || null,
          description: adminCashForm.description || null,
          debit,
          credit,
          balance: newBalance,
        }).catch((err) => console.warn('[Admin] cash update error', err));
      } else {
        const entry: AdminCashEntry = {
          id: Date.now(),
          date: adminCashForm.date,
          chequeNo: adminCashForm.chequeNo,
          description: adminCashForm.description,
          debit,
          credit,
          balance: newBalance,
          linkedTransferId: null,
        };
        setAdminCashEntries((prev2) => [...prev2, entry]);
        // Persist to backend (fire-and-forget)
        createCashInHandEntry({
          date: entry.date,
          cheque_no: entry.chequeNo || null,
          description: entry.description || null,
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.balance,
        }).catch((err) => console.warn('[Admin] cash save error', err));
      }

      setAdminCashForm({ date: getAdminSriLankaDate(), chequeNo: "", description: "", amount: "", prevBalance: "0.00" });
      setAdminCashTransactionType("debit");
      setAdminCashEditingId(null);
      setAdminCashAddModalOpen(false);
      setAdminCashSuccessVisible(true);
    };

    const handleEdit = (entry: AdminCashEntry) => {
      setAdminCashEditingId(entry.id);
      setAdminCashForm({
        date: entry.date,
        chequeNo: entry.chequeNo || "",
        description: entry.description || "",
        amount: (entry.debit || entry.credit || "").toString(),
        prevBalance: adminCashPrevMonthBalance.toFixed(2),
      });
      setAdminCashTransactionType(entry.debit != null ? "debit" : "credit");
      setAdminCashAddModalOpen(true);
    };

    const handleDelete = (id: number) => {
      const entry = adminCashEntries.find((e) => e.id === id);
      if (entry) setAdminCashDeleteConfirm(entry);
    };

    const confirmDelete = () => {
      if (!adminCashDeleteConfirm) return;
      const id = adminCashDeleteConfirm.id;
      setAdminCashEntries((prev2) => prev2.filter((e) => e.id !== id));
      deleteCashInHandEntry(id).catch((err) => console.warn('[Admin] cash delete error', err));
      setAdminCashDeleteConfirm(null);
    };

    // Transfer to Bank: Cash in Hand is always the Debit (losing) side, Bank
    // is always the Credit (receiving) side - matches cash-in-hand.tsx's
    // own Transfer to Bank button, just wired to admin's local state.
    const handleTransfer = async () => {
      if (!adminCashTransferForm.date) { Alert.alert("Validation", "Date is required."); return; }
      const amount = parseFloat(adminCashTransferForm.amount);
      if (!amount || amount <= 0) { Alert.alert("Validation", "Enter a valid amount."); return; }

      setAdminCashTransferSaving(true);
      try {
        const result = await createAccountTransfer({
          direction: 'cash_to_bank',
          date: adminCashTransferForm.date,
          cheque_no: adminCashTransferForm.chequeNo || null,
          amount,
          cash_description: 'Cash Deposit to Bank',
          cash_balance: adminCashPrevMonthBalance - amount,
          bank_description: 'Cash Deposit',
        });

        setAdminCashEntries((prev2) => [...prev2, {
          id: result.cash.id,
          date: result.cash.date,
          chequeNo: result.cash.cheque_no ?? '',
          description: result.cash.description ?? '',
          debit: result.cash.debit,
          credit: result.cash.credit,
          balance: result.cash.balance,
          linkedTransferId: result.cash.linked_transfer_id ?? null,
        }]);

        setAdminCashTransferForm({ date: getAdminSriLankaDate(), chequeNo: "", amount: "" });
        setAdminCashTransferModalOpen(false);
        setAdminCashSuccessVisible(true);
      } catch (err: any) {
        console.warn('[Admin] cash transfer error', err);
        Alert.alert('Error', err?.message || 'Failed to record transfer.');
      } finally {
        setAdminCashTransferSaving(false);
      }
    };

    const columns = ["Date", "Cheque No", "Description", "Credit", "Debit", "Balance", "Actions"];

    return (
      <View style={styles.personalContainer}>
        {/* Greeting */}
        <View style={[styles.headerSection, styles.greetingContainer, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Admin"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => { await signOut(); router.replace("/"); }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? "#333" : "#e0e0e0", borderRadius: 8 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#000" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Header */}
        <View style={styles.personalHeader}>
          <Pressable style={styles.backButton} onPress={() => setSelectedView("adminAccounts")}>
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalTitle}>Cash In Hand</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        {/* Main card */}
        <View style={[styles.tableCard, { padding: 16, gap: 12 }]}>
          {/* Controls */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            {/* Search */}
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 160, padding: 8, borderRadius: 24, backgroundColor: "transparent", borderWidth: 1, borderColor: isDark ? "#333" : "#e5e5e5" }}>
              <TextInput
                value={adminCashSearch}
                onChangeText={setAdminCashSearch}
                placeholder="Search Cheque No"
                placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
                style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 4, color: isDark ? "#fff" : "#000", fontSize: 13 }}
              />
              <Text style={{ fontSize: 16, color: "#aaa", marginLeft: 8 }}>🔍</Text>
            </View>

            {/* Sort toggle */}
            <Pressable
              style={{ backgroundColor: adminCashSortOrder === "asc" ? "#6366f1" : "#f59e0b", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => setAdminCashSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{adminCashSortOrder === "asc" ? "↑ Asc" : "↓ Desc"}</Text>
            </Pressable>

            {/* Export button */}
            <Pressable
              style={{ backgroundColor: "#22c55e", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => exportLedgerToExcel('Admin_Cash_In_Hand', filtered, adminCashPrevMonthBalance)}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>⬇ Export</Text>
            </Pressable>

            {/* Add button */}
            <Pressable
              style={{ backgroundColor: "#3b82f6", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => { setAdminCashEditingId(null); setAdminCashForm({ date: getAdminSriLankaDate(), chequeNo: "", description: "", amount: "", prevBalance: adminCashPrevMonthBalance.toFixed(2) }); setAdminCashAddModalOpen(true); }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>＋ Add</Text>
            </Pressable>

            {/* Transfer to Bank button */}
            <Pressable
              style={{ backgroundColor: "#8b5cf6", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => { setAdminCashTransferForm({ date: getAdminSriLankaDate(), chequeNo: "", amount: "" }); setAdminCashTransferModalOpen(true); }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>⇄ Transfer to Bank</Text>
            </Pressable>
          </View>

          {/* Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 620 }}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                {columns.map((col) => (
                  <Text key={col} style={[styles.tableCell, styles.tableHeaderCell, { width: 90, textAlign: "center" }]}>{col}</Text>
                ))}
              </View>
              {/* A plain View, not its own nested ScrollView - see
                  cash-in-hand.tsx's identical fix for why a vertical
                  scroller boxed to maxHeight and nested inside this
                  horizontal ScrollView (itself nested inside the page's own
                  vertical scroll) broke touch gesture routing on mobile. */}
              <View>
                {filtered.length === 0 ? (
                  <View style={styles.emptyRow}><Text style={styles.emptyText}>No records found</Text></View>
                ) : (
                  filtered.map((entry, idx) => (
                    <View key={entry.id} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)") : "transparent" }]}>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.date}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.chequeNo || "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>
                        {entry.linkedTransferId ? "🔗 " : ""}{entry.description || "-"}
                      </Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.credit != null ? entry.credit.toFixed(2) : "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.debit != null ? entry.debit.toFixed(2) : "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.balance.toFixed(2)}</Text>
                      <View style={[styles.tableCell, { width: 90, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
                        <Pressable onPress={() => handleEdit(entry)} style={{ padding: 4, backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>✏️</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDelete(entry.id)} style={{ padding: 4, backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </ScrollView>

          {/* Summary */}
          <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", paddingTop: 12, gap: 8 }}>
            {[
              { label: "Total Debit Balance", value: totalDebit },
              { label: "Total Credit Balance", value: totalCredit },
              { label: "Current Cash Balance", value: currentBalance },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: isDark ? "#e0e0e0" : "#1f1d21" }}>{row.label}</Text>
                <View style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7, minWidth: 110, alignItems: "center", backgroundColor: isDark ? "#333" : "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#1f1d21" }}>{row.value.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add Modal */}
        <Modal visible={adminCashAddModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
              <View style={[styles.modalHeader, { paddingTop: 26 }]}>
                <ThemedText type="title">{adminCashEditingId ? "Edit Entry" : "Add Entry"}</ThemedText>
                <Pressable style={styles.modalClose} onPress={() => { setAdminCashEditingId(null); setAdminCashAddModalOpen(false); }}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Prev Balance */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Previous Month Cash In Hand Balance</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminCashForm.prevBalance}
                    onChangeText={(v) => setAdminCashForm((p) => ({ ...p, prevBalance: v }))}
                  />
                </View>
                {/* Date */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    value={adminCashForm.date}
                    onChangeText={(v) => setAdminCashForm((p) => ({ ...p, date: v }))}
                  />
                </View>
                {/* Cheque No */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Cheque No</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. CHQ-001"
                    placeholderTextColor="#aaa"
                    value={adminCashForm.chequeNo}
                    onChangeText={(v) => setAdminCashForm((p) => ({ ...p, chequeNo: v }))}
                  />
                </View>
                {/* Description */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter description"
                    placeholderTextColor="#aaa"
                    value={adminCashForm.description}
                    onChangeText={(v) => setAdminCashForm((p) => ({ ...p, description: v }))}
                  />
                </View>
                {/* Transaction Type */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Transaction Type</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                    <Pressable
                      onPress={() => setAdminCashTransactionType("debit")}
                      style={[{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, alignItems: "center", minWidth: 90 },
                      adminCashTransactionType === "debit" ? { backgroundColor: "#ef4444", borderColor: "#ef4444" } : { backgroundColor: "transparent", borderColor: "#ef4444" }]}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 14, color: adminCashTransactionType === "debit" ? "#fff" : "#ef4444" }}>Debit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAdminCashTransactionType("credit")}
                      style={[{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, alignItems: "center", minWidth: 90 },
                      adminCashTransactionType === "credit" ? { backgroundColor: "#22c55e", borderColor: "#22c55e" } : { backgroundColor: "transparent", borderColor: "#22c55e" }]}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 14, color: adminCashTransactionType === "credit" ? "#fff" : "#22c55e" }}>Credit</Text>
                    </Pressable>
                  </View>
                </View>
                {/* Amount */}
                <View style={styles.formRow}>
                  <Text style={[styles.formLabel, { color: adminCashTransactionType === "debit" ? "#ef4444" : "#22c55e" }]}>
                    {adminCashTransactionType === "debit" ? "Debit Amount" : "Credit Amount"}
                  </Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: adminCashTransactionType === "debit" ? "#ef4444" : "#22c55e", borderWidth: 1.5 }]}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminCashForm.amount}
                    onChangeText={(v) => setAdminCashForm((p) => ({ ...p, amount: v }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.addSiteButton, { backgroundColor: "#3b82f6" }]} onPress={handleAdd}>
                  <Text style={styles.addSiteButtonText}>{adminCashEditingId ? "Update Entry" : "Save Entry"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Transfer to Bank Modal */}
        <Modal visible={adminCashTransferModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
              <View style={[styles.modalHeader, { paddingTop: 26 }]}>
                <ThemedText type="title">Transfer to Bank</ThemedText>
                <Pressable style={styles.modalClose} onPress={() => setAdminCashTransferModalOpen(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={{ color: isDark ? "#ccc" : "#666", fontSize: 13, marginBottom: 12 }}>
                  Records cash deposited into the bank: a Debit here (Cash in Hand) and a matching
                  Credit in Bank, linked together.
                </Text>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    value={adminCashTransferForm.date}
                    onChangeText={(v) => setAdminCashTransferForm((p) => ({ ...p, date: v }))}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Cheque No / Reference (optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. CHQ-001"
                    placeholderTextColor="#aaa"
                    value={adminCashTransferForm.chequeNo}
                    onChangeText={(v) => setAdminCashTransferForm((p) => ({ ...p, chequeNo: v }))}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminCashTransferForm.amount}
                    onChangeText={(v) => setAdminCashTransferForm((p) => ({ ...p, amount: v }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.addSiteButton, { backgroundColor: "#8b5cf6", opacity: adminCashTransferSaving ? 0.7 : 1 }]}
                  onPress={handleTransfer}
                  disabled={adminCashTransferSaving}
                >
                  <Text style={styles.addSiteButtonText}>{adminCashTransferSaving ? "Saving…" : "Save Transfer"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete confirmation - a real Modal, not Alert.alert (a no-op on web) */}
        <ConfirmModal
          visible={!!adminCashDeleteConfirm}
          title="Delete Entry?"
          message={
            adminCashDeleteConfirm?.linkedTransferId
              ? "This entry is one leg of a Bank transfer - deleting it will also delete the matching entry in Bank. Continue?"
              : "Are you sure you want to delete this entry? This cannot be undone."
          }
          onCancel={() => setAdminCashDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />

        {/* Success banner */}
        {adminCashSuccessVisible && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff", padding: 28, alignItems: "center" }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <ThemedText type="title" style={{ marginBottom: 6 }}>Entry Added!</ThemedText>
                <Text style={{ color: isDark ? "#ccc" : "#666", marginBottom: 20, textAlign: "center" }}>The new cash-in-hand entry has been saved successfully.</Text>
                <Pressable style={[styles.addSiteButton, { backgroundColor: "#3b82f6" }]} onPress={() => setAdminCashSuccessVisible(false)}>
                  <Text style={styles.addSiteButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };

  // ── renderAdminBankView ─────────────────────────────────────────────────
  const renderAdminBankView = () => {
    const totalDebit = adminBankEntries.reduce((s, e) => s + (e.debit ?? 0), 0);
    const totalCredit = adminBankEntries.reduce((s, e) => s + (e.credit ?? 0), 0);

    // Closing balance = balance field of the last entry in the previous
    // calendar month (same lookup the export button used to duplicate
    // inline - hoisted here so it's shared with the summary below too).
    const adminBankPrevMonthBalance = (() => {
      const now = new Date();
      const offset = 330;
      const local = new Date(now.getTime() + offset * 60 * 1000);
      const year = local.getUTCFullYear();
      const month = local.getUTCMonth();
      const prevMonthStart = new Date(Date.UTC(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, 1));
      const prevMonthEnd = new Date(Date.UTC(year, month, 1));
      const prevMonthEntries = adminBankEntries
        .filter((e) => {
          const d = new Date(e.date);
          return d >= prevMonthStart && d < prevMonthEnd;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return prevMonthEntries.length > 0 ? prevMonthEntries[prevMonthEntries.length - 1].balance : 0;
    })();

    // Closing Balance = Opening Balance + Total Credit - Total Debit
    const currentBalance = adminBankPrevMonthBalance + totalCredit - totalDebit;

    const filtered = adminBankEntries
      .filter(
        (e) =>
          e.chequeNo.toLowerCase().includes(adminBankSearch.toLowerCase()) ||
          e.description.toLowerCase().includes(adminBankSearch.toLowerCase())
      )
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return adminBankSortOrder === "asc" ? da - db : db - da;
      });

    const handleAdd = () => {
      if (!adminBankForm.date) { Alert.alert("Validation", "Date is required."); return; }
      const debit = adminBankTransactionType === "debit" && adminBankForm.amount ? parseFloat(adminBankForm.amount) : null;
      const credit = adminBankTransactionType === "credit" && adminBankForm.amount ? parseFloat(adminBankForm.amount) : null;
      const prev = parseFloat(adminBankForm.prevBalance || "0");
      const newBalance = prev + (credit ?? 0) - (debit ?? 0);

      if (adminBankEditingId) {
        setAdminBankEntries((prev2) => prev2.map((e) => e.id === adminBankEditingId
          ? { ...e, date: adminBankForm.date, chequeNo: adminBankForm.chequeNo, description: adminBankForm.description, debit, credit, balance: newBalance }
          : e));
        updateBankEntry(adminBankEditingId, {
          date: adminBankForm.date,
          cheque_no: adminBankForm.chequeNo || null,
          description: adminBankForm.description || null,
          debit,
          credit,
          balance: newBalance,
        }).catch((err) => console.warn('[Admin] bank update error', err));
      } else {
        const entry: AdminBankEntry = {
          id: Date.now(),
          date: adminBankForm.date,
          chequeNo: adminBankForm.chequeNo,
          description: adminBankForm.description,
          debit,
          credit,
          balance: newBalance,
          linkedTransferId: null,
        };
        setAdminBankEntries((prev2) => [...prev2, entry]);
        // Persist to backend (fire-and-forget)
        createBankEntry({
          date: entry.date,
          cheque_no: entry.chequeNo || null,
          description: entry.description || null,
          debit: entry.debit,
          credit: entry.credit,
          balance: entry.balance,
        }).catch((err) => console.warn('[Admin] bank save error', err));
      }

      setAdminBankForm({ date: getAdminSriLankaDate(), chequeNo: "", description: "", amount: "", prevBalance: "0.00" });
      setAdminBankTransactionType("debit");
      setAdminBankEditingId(null);
      setAdminBankAddModalOpen(false);
      setAdminBankSuccessVisible(true);
    };

    const handleEdit = (entry: AdminBankEntry) => {
      setAdminBankEditingId(entry.id);
      setAdminBankForm({
        date: entry.date,
        chequeNo: entry.chequeNo || "",
        description: entry.description || "",
        amount: (entry.debit || entry.credit || "").toString(),
        prevBalance: adminBankPrevMonthBalance.toFixed(2),
      });
      setAdminBankTransactionType(entry.debit != null ? "debit" : "credit");
      setAdminBankAddModalOpen(true);
    };

    const handleDelete = (id: number) => {
      const entry = adminBankEntries.find((e) => e.id === id);
      if (entry) setAdminBankDeleteConfirm(entry);
    };

    const confirmDelete = () => {
      if (!adminBankDeleteConfirm) return;
      const id = adminBankDeleteConfirm.id;
      setAdminBankEntries((prev2) => prev2.filter((e) => e.id !== id));
      deleteBankEntry(id).catch((err) => console.warn('[Admin] bank delete error', err));
      setAdminBankDeleteConfirm(null);
    };

    // Transfer to Cash: Bank is always the Debit (losing) side, Cash in Hand
    // is always the Credit (receiving) side - matches bank.tsx's own
    // Transfer to Cash button, just wired to admin's local state.
    const handleTransfer = async () => {
      if (!adminBankTransferForm.date) { Alert.alert("Validation", "Date is required."); return; }
      const amount = parseFloat(adminBankTransferForm.amount);
      if (!amount || amount <= 0) { Alert.alert("Validation", "Enter a valid amount."); return; }

      setAdminBankTransferSaving(true);
      try {
        const result = await createAccountTransfer({
          direction: 'bank_to_cash',
          date: adminBankTransferForm.date,
          cheque_no: adminBankTransferForm.chequeNo || null,
          amount,
          bank_description: 'Cash Withdrawal',
          bank_balance: adminBankPrevMonthBalance - amount,
          cash_description: 'Cash Received from Bank',
        });

        setAdminBankEntries((prev2) => [...prev2, {
          id: result.bank.id,
          date: result.bank.date,
          chequeNo: result.bank.cheque_no ?? '',
          description: result.bank.description ?? '',
          debit: result.bank.debit,
          credit: result.bank.credit,
          balance: result.bank.balance,
          linkedTransferId: result.bank.linked_transfer_id ?? null,
        }]);

        setAdminBankTransferForm({ date: getAdminSriLankaDate(), chequeNo: "", amount: "" });
        setAdminBankTransferModalOpen(false);
        setAdminBankSuccessVisible(true);
      } catch (err: any) {
        console.warn('[Admin] bank transfer error', err);
        Alert.alert('Error', err?.message || 'Failed to record transfer.');
      } finally {
        setAdminBankTransferSaving(false);
      }
    };

    const columns = ["Date", "Cheque No", "Description", "Credit", "Debit", "Balance", "Actions"];

    return (
      <View style={styles.personalContainer}>
        {/* Greeting */}
        <View style={[styles.headerSection, styles.greetingContainer, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Admin"}, Welcome!
          </ThemedText>
          <Pressable
            onPress={async () => { await signOut(); router.replace("/"); }}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: isDark ? "#333" : "#e0e0e0", borderRadius: 8 }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#000" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Header */}
        <View style={styles.personalHeader}>
          <Pressable style={styles.backButton} onPress={() => setSelectedView("adminAccounts")}>
            <Text style={styles.backButtonIcon}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalTitle}>Bank</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        {/* Main card */}
        <View style={[styles.tableCard, { padding: 16, gap: 12 }]}>
          {/* Controls */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            {/* Search */}
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, minWidth: 160, padding: 8, borderRadius: 24, backgroundColor: "transparent", borderWidth: 1, borderColor: isDark ? "#333" : "#e5e5e5" }}>
              <TextInput
                value={adminBankSearch}
                onChangeText={setAdminBankSearch}
                placeholder="Search Cheque No"
                placeholderTextColor={isDark ? "#b0b0b0" : "#8a8a8f"}
                style={{ flex: 1, paddingVertical: 2, paddingHorizontal: 4, color: isDark ? "#fff" : "#000", fontSize: 13 }}
              />
              <Text style={{ fontSize: 16, color: "#aaa", marginLeft: 8 }}>🔍</Text>
            </View>

            {/* Sort toggle */}
            <Pressable
              style={{ backgroundColor: adminBankSortOrder === "asc" ? "#6366f1" : "#f59e0b", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => setAdminBankSortOrder((p) => (p === "asc" ? "desc" : "asc"))}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{adminBankSortOrder === "asc" ? "↑ Asc" : "↓ Desc"}</Text>
            </Pressable>

            {/* Export button */}
            <Pressable
              style={{ backgroundColor: "#22c55e", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => exportLedgerToExcel('Admin_Bank', filtered, adminBankPrevMonthBalance)}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>⬇ Export</Text>
            </Pressable>

            {/* Add button */}
            <Pressable
              style={{ backgroundColor: "#3b82f6", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => { setAdminBankEditingId(null); setAdminBankForm({ date: getAdminSriLankaDate(), chequeNo: "", description: "", amount: "", prevBalance: adminBankPrevMonthBalance.toFixed(2) }); setAdminBankAddModalOpen(true); }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>＋ Add</Text>
            </Pressable>

            {/* Transfer to Cash button */}
            <Pressable
              style={{ backgroundColor: "#8b5cf6", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 24, alignItems: "center", justifyContent: "center" }}
              onPress={() => { setAdminBankTransferForm({ date: getAdminSriLankaDate(), chequeNo: "", amount: "" }); setAdminBankTransferModalOpen(true); }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>⇄ Transfer to Cash</Text>
            </Pressable>
          </View>

          {/* Table */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 620 }}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                {columns.map((col) => (
                  <Text key={col} style={[styles.tableCell, styles.tableHeaderCell, { width: 90, textAlign: "center" }]}>{col}</Text>
                ))}
              </View>
              {/* A plain View, not its own nested ScrollView - see
                  cash-in-hand.tsx's identical fix for why a vertical
                  scroller boxed to maxHeight and nested inside this
                  horizontal ScrollView (itself nested inside the page's own
                  vertical scroll) broke touch gesture routing on mobile. */}
              <View>
                {filtered.length === 0 ? (
                  <View style={styles.emptyRow}><Text style={styles.emptyText}>No records found</Text></View>
                ) : (
                  filtered.map((entry, idx) => (
                    <View key={entry.id} style={[styles.tableRow, { backgroundColor: idx % 2 === 0 ? (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)") : "transparent" }]}>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.date}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.chequeNo || "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>
                        {entry.linkedTransferId ? "🔗 " : ""}{entry.description || "-"}
                      </Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.credit != null ? entry.credit.toFixed(2) : "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.debit != null ? entry.debit.toFixed(2) : "-"}</Text>
                      <Text style={[styles.tableCell, { width: 90, textAlign: "center" }]} numberOfLines={1}>{entry.balance.toFixed(2)}</Text>
                      <View style={[styles.tableCell, { width: 90, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
                        <Pressable onPress={() => handleEdit(entry)} style={{ padding: 4, backgroundColor: "rgba(59, 130, 246, 0.1)", borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>✏️</Text>
                        </Pressable>
                        <Pressable onPress={() => handleDelete(entry.id)} style={{ padding: 4, backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: 6 }}>
                          <Text style={{ fontSize: 14 }}>🗑️</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          </ScrollView>

          {/* Summary */}
          <View style={{ borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", paddingTop: 12, gap: 8 }}>
            {[
              { label: "Total Debit Balance", value: totalDebit },
              { label: "Total Credit Balance", value: totalCredit },
              { label: "Current Bank Balance", value: currentBalance },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: isDark ? "#e0e0e0" : "#1f1d21" }}>{row.label}</Text>
                <View style={{ borderRadius: 20, paddingHorizontal: 18, paddingVertical: 7, minWidth: 110, alignItems: "center", backgroundColor: isDark ? "#333" : "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#fff" : "#1f1d21" }}>{row.value.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add Modal */}
        <Modal visible={adminBankAddModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
              <View style={[styles.modalHeader, { paddingTop: 26 }]}>
                <ThemedText type="title">{adminBankEditingId ? "Edit Entry" : "Add Entry"}</ThemedText>
                <Pressable style={styles.modalClose} onPress={() => { setAdminBankEditingId(null); setAdminBankAddModalOpen(false); }}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Prev Balance */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Previous Month Bank Balance</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminBankForm.prevBalance}
                    onChangeText={(v) => setAdminBankForm((p) => ({ ...p, prevBalance: v }))}
                  />
                </View>
                {/* Date */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    value={adminBankForm.date}
                    onChangeText={(v) => setAdminBankForm((p) => ({ ...p, date: v }))}
                  />
                </View>
                {/* Cheque No */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Cheque No</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. CHQ-001"
                    placeholderTextColor="#aaa"
                    value={adminBankForm.chequeNo}
                    onChangeText={(v) => setAdminBankForm((p) => ({ ...p, chequeNo: v }))}
                  />
                </View>
                {/* Description */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter description"
                    placeholderTextColor="#aaa"
                    value={adminBankForm.description}
                    onChangeText={(v) => setAdminBankForm((p) => ({ ...p, description: v }))}
                  />
                </View>
                {/* Transaction Type */}
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Transaction Type</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                    <Pressable
                      onPress={() => setAdminBankTransactionType("debit")}
                      style={[{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, alignItems: "center", minWidth: 90 },
                      adminBankTransactionType === "debit" ? { backgroundColor: "#ef4444", borderColor: "#ef4444" } : { backgroundColor: "transparent", borderColor: "#ef4444" }]}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 14, color: adminBankTransactionType === "debit" ? "#fff" : "#ef4444" }}>Debit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setAdminBankTransactionType("credit")}
                      style={[{ paddingVertical: 9, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1.5, alignItems: "center", minWidth: 90 },
                      adminBankTransactionType === "credit" ? { backgroundColor: "#22c55e", borderColor: "#22c55e" } : { backgroundColor: "transparent", borderColor: "#22c55e" }]}
                    >
                      <Text style={{ fontWeight: "700", fontSize: 14, color: adminBankTransactionType === "credit" ? "#fff" : "#22c55e" }}>Credit</Text>
                    </Pressable>
                  </View>
                </View>
                {/* Amount */}
                <View style={styles.formRow}>
                  <Text style={[styles.formLabel, { color: adminBankTransactionType === "debit" ? "#ef4444" : "#22c55e" }]}>
                    {adminBankTransactionType === "debit" ? "Debit Amount" : "Credit Amount"}
                  </Text>
                  <TextInput
                    style={[styles.formInput, { borderColor: adminBankTransactionType === "debit" ? "#ef4444" : "#22c55e", borderWidth: 1.5 }]}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminBankForm.amount}
                    onChangeText={(v) => setAdminBankForm((p) => ({ ...p, amount: v }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable style={[styles.addSiteButton, { backgroundColor: "#3b82f6" }]} onPress={handleAdd}>
                  <Text style={styles.addSiteButtonText}>{adminBankEditingId ? "Update Entry" : "Save Entry"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Transfer to Cash Modal */}
        <Modal visible={adminBankTransferModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff" }]}>
              <View style={[styles.modalHeader, { paddingTop: 26 }]}>
                <ThemedText type="title">Transfer to Cash</ThemedText>
                <Pressable style={styles.modalClose} onPress={() => setAdminBankTransferModalOpen(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={{ color: isDark ? "#ccc" : "#666", fontSize: 13, marginBottom: 12 }}>
                  Records cash withdrawn from the bank: a Debit here (Bank) and a matching Credit
                  in Cash in Hand, linked together.
                </Text>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    value={adminBankTransferForm.date}
                    onChangeText={(v) => setAdminBankTransferForm((p) => ({ ...p, date: v }))}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Cheque No / Reference (optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. CHQ-001"
                    placeholderTextColor="#aaa"
                    value={adminBankTransferForm.chequeNo}
                    onChangeText={(v) => setAdminBankTransferForm((p) => ({ ...p, chequeNo: v }))}
                  />
                </View>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0.00"
                    placeholderTextColor="#aaa"
                    keyboardType="decimal-pad"
                    value={adminBankTransferForm.amount}
                    onChangeText={(v) => setAdminBankTransferForm((p) => ({ ...p, amount: v }))}
                  />
                </View>
              </ScrollView>
              <View style={styles.modalFooter}>
                <Pressable
                  style={[styles.addSiteButton, { backgroundColor: "#8b5cf6", opacity: adminBankTransferSaving ? 0.7 : 1 }]}
                  onPress={handleTransfer}
                  disabled={adminBankTransferSaving}
                >
                  <Text style={styles.addSiteButtonText}>{adminBankTransferSaving ? "Saving…" : "Save Transfer"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete confirmation - a real Modal, not Alert.alert (a no-op on web) */}
        <ConfirmModal
          visible={!!adminBankDeleteConfirm}
          title="Delete Entry?"
          message={
            adminBankDeleteConfirm?.linkedTransferId
              ? "This entry is one leg of a Cash in Hand transfer - deleting it will also delete the matching entry in Cash in Hand. Continue?"
              : "Are you sure you want to delete this entry? This cannot be undone."
          }
          onCancel={() => setAdminBankDeleteConfirm(null)}
          onConfirm={confirmDelete}
        />

        {/* Success banner */}
        {adminBankSuccessVisible && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { backgroundColor: isDark ? "#1e1e1e" : "#fff", padding: 28, alignItems: "center" }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                <ThemedText type="title" style={{ marginBottom: 6 }}>Entry Added!</ThemedText>
                <Text style={{ color: isDark ? "#ccc" : "#666", marginBottom: 20, textAlign: "center" }}>The new bank entry has been saved successfully.</Text>
                <Pressable style={[styles.addSiteButton, { backgroundColor: "#3b82f6" }]} onPress={() => setAdminBankSuccessVisible(false)}>
                  <Text style={styles.addSiteButtonText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    );
  };
  // ───────────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={[styles.container, { backgroundColor: isDark ? "#121212" : "#F1E7DF" }]}>
      <BackgroundPattern />
      {selectedView === "dashboard" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', overscrollBehavior: 'none' } as any}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {renderDashboardView()}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ maxWidth: MaxContentWidth, alignSelf: 'center', width: '100%', overscrollBehavior: 'none' } as any}
        >
          {selectedView === "attendance"
            ? renderAttendancesView()
            : selectedView === "machineries"
              ? renderMachineriesView()
              : selectedView === "assets"
                ? renderAssetsView()
                : selectedView === "chemicals"
                  ? renderChemicalsView()
                  : selectedView === "approvals"
                    ? renderApprovalsView()
                    : selectedView === "workers"
                      ? renderWorkersView()
                      : selectedView === "personalAssets"
                        ? renderPersonalAssetsView()
                        : selectedView === "personalSelection"
                          ? renderPersonalSelectionView()
                          : selectedView === "personalDocuments"
                            ? renderPersonalDocumentsView()
                            : selectedView === "manageSite"
                              ? renderManageSiteView()
                              : selectedView === "adminAccounts"
                                ? renderAdminAccountsView()
                                : selectedView === "adminCashInHand"
                                  ? renderAdminCashInHandView()
                                  : selectedView === "adminBank"
                                    ? renderAdminBankView()
                                    : selectedView === "hospitalShifts"
                                      ? renderHospitalShiftsView()
                                      : null}
        </ScrollView>
      )}
      {renderUpdateModal()}
      {renderPersonalAddModal()}
      {renderPersonalEditModal()}
      {renderAddSiteModal()}
      {renderEditSiteModal()}
      {renderSiteDeletedModal()}
      {renderSuccessModal()}
      {renderApprovalSuccessModal()}
      {renderRejectReasonModal()}
      {renderRejectSuccessModal()}
      {renderTerminateConfirmModal()}
      {renderTerminateSuccessModal()}
      {renderWorkerDeleteSuccessModal()}
      {renderAttendanceEditModal()}
      <WorkerIdCardModal
        visible={!!adminIdCardWorker}
        worker={adminIdCardWorker}
        onClose={() => setAdminIdCardWorker(null)}
      />
    </ThemedView>
  );
}

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    statusAvailable: { color: "green" },
    statusFinished: { color: "red" },

    container: {
      flex: 1,
      padding: Spacing.four,
      paddingTop: Platform.select({ web: 20, default: 60 }),
      paddingBottom: BottomTabInset,
      backgroundColor: "transparent",
      overflow: 'hidden',
    },
    headerSection: {
      marginBottom: Spacing.three,
    },
    greeting: {
      fontSize: rf(20, 16, 22),
      fontWeight: "600",
      flexShrink: 1,
    },
    greetingContainer: {
      minHeight: 48,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: Spacing.two,
      marginBottom: Spacing.four,
    },
    siteTimeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginTop: Spacing.two,
      marginBottom: Spacing.three,
      gap: Spacing.two,
      zIndex: 100,
    },
    siteSelectionContainer: {
      flex: 1,
      position: "relative",
      zIndex: 100,
    },
    siteDropdown: {
      backgroundColor: isDark ? "#333333" : "#e0e0e0",
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    siteDropdownText: {
      fontSize: 13,
      color: isDark ? "#e0e0e0" : "#666",
      fontWeight: "500",
    },
    dropdownIcon: {
      fontSize: 10,
      color: isDark ? "#ffffff" : "#333",
    },
    dropdownMenu: {
      position: "absolute",
      top: 44,
      left: 0,
      right: 0,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 8,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 5,
      zIndex: 10,
    },
    machineriesContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    assetsContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    chemicalsContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    workersContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    personalContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    workersHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    workersTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    tableScrollContainer: {
      flex: 1,
      maxHeight: 500,
    },
    machineriesHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    assetsHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    chemicalsHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#333333" : "#e0e0e0",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
    },
    backButtonIcon: {
      fontSize: 24,
      color: isDark ? "#ffffff" : "#333",
      fontWeight: "600",
      lineHeight: 28,
      marginTop: -4,
    },
    machineriesTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    assetsTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    chemicalsTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    personalHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    personalTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    machineriesSubtitle: {
      fontSize: 13,
      color: isDark ? "#e0e0e0" : "#666",
      lineHeight: 20,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
      shadowColor: "#000",
      shadowOpacity: 0.03,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      gap: Spacing.two,
      marginBottom: Spacing.three,
    },
    searchIcon: {
      fontSize: 18,
      color: isDark ? "#aaaaaa" : "#8a8a8f",
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: isDark ? "#ffffff" : "#1f1d21",
      padding: 0,
      minHeight: 22,
    },
    tableCard: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 24,
      paddingVertical: Spacing.three,
      paddingHorizontal: Spacing.four,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    horizontalTableScroll: {
      marginHorizontal: -Spacing.four,
      paddingHorizontal: Spacing.four,
    },
    tableRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f3",
    },
    tableHeaderRow: {
      borderBottomWidth: 1,
      borderBottomColor: "#d8d8dc",
      paddingBottom: 10,
    },
    tableCell: {
      fontSize: 13,
      color: isDark ? "#ffffff" : "#1f1d21",
      paddingHorizontal: 8,
    },
    tableHeaderCell: {
      fontWeight: "700",
      color: "#4f4f53",
    },
    cellId: {
      flex: 0.5,
    },
    cellMachine: {
      flex: 1.4,
    },
    cellStatus: {
      flex: 1,
    },
    cellDescription: {
      flex: 1.8,
    },
    assetCellId: {
      flex: 0.4,
    },
    assetCellName: {
      flex: 1.2,
    },
    assetCellCount: {
      flex: 0.8,
    },
    assetCellValue: {
      flex: 1.2,
    },
    assetCellActions: {
      flex: 0.8,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    assetCellActionsContainer: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      flex: 0.8,
      minWidth: 120,
      maxWidth: 220,
    },
    actionButton: {
      marginHorizontal: 4,
      padding: 6,
    },
    editIcon: {
      fontSize: 16,
    },
    deleteIcon: {
      fontSize: 16,
    },
    assetActionsScrollContent: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
      padding: Spacing.four,
    },
    modalContent: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 24,
      padding: Spacing.four,
      alignItems: "stretch",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    modalCard: {
      width: "100%",
      maxHeight: "85%" as any,
      borderRadius: 28,
      overflow: "hidden" as const,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    modalBody: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
    },
    modalFooter: {
      paddingHorizontal: Spacing.four,
      paddingVertical: Spacing.three,
      borderTopWidth: 1,
      borderTopColor: "rgba(0,0,0,0.1)",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.four,
      position: "relative",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#111",
    },
    modalClose: {
      position: "absolute",
      right: 10,
      top: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: "#efefef",
      alignItems: "center",
      justifyContent: "center",
    },
    modalCloseText: {
      fontSize: 16,
      color: isDark ? "#ffffff" : "#333",
    },
    formRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.three,
    },
    formLabel: {
      fontSize: 14,
      color: isDark ? "#ffffff" : "#1f1d21",
      fontWeight: "600",
      flex: 0.35,
    },
    formInput: {
      flex: 0.65,
      backgroundColor: isDark ? "#333333" : "#f2f2f6",
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 16,
      color: isDark ? "#ffffff" : "#1f1d21",
      fontSize: 14,
    },
    updateButton: {
      marginTop: Spacing.three,
      backgroundColor: "#16a34a",
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
    },
    updateButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    addSiteButton: {
      marginTop: Spacing.three,
      backgroundColor: "#16a34a",
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: "center",
    },
    addSiteButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    logoUploadButton: {
      flex: 0.65,
      backgroundColor: isDark ? "#333333" : "#f2f2f6",
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      minHeight: 56,
    },
    logoUploadText: {
      color: isDark ? "#ffffff" : "#1f1d21",
      fontSize: 14,
      flexShrink: 1,
    },
    successModalCard: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 24,
      padding: Spacing.four,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    successIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#22c55e",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.three,
    },
    successIcon: {
      color: "#fff",
      fontSize: 32,
      fontWeight: "700",
    },
    successTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
      marginBottom: Spacing.four,
    },
    successButton: {
      backgroundColor: "#16a34a",
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 32,
    },
    successButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    emptyRow: {
      paddingVertical: Spacing.three,
      alignItems: "center",
    },
    chemicalCellName: {
      flex: 1.6,
    },
    chemicalCellQuantity: {
      flex: 0.8,
    },
    chemicalCellStatus: {
      flex: 1.0,
    },
    emptyText: {
      color: isDark ? "#aaaaaa" : "#8a8a8f",
      fontSize: 14,
    },
    dropdownItem: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    dropdownItemText: {
      fontSize: 13,
      color: isDark ? "#ffffff" : "#333",
    },
    timeSection: {
      alignItems: "flex-end",
    },
    timeText: {
      fontSize: 16,
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    dateText: {
      fontSize: 13,
      color: isDark ? "#e0e0e0" : "#666",
      marginTop: 4,
    },
    cardsContainer: {
      gap: Spacing.two,
      flex: 1,
      justifyContent: "space-between",
      marginTop: Spacing.three,
    },
    manageSiteContainer: {
      flex: 1,
      paddingTop: Spacing.four,
      paddingHorizontal: Spacing.four,
    },
    manageSiteHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: Spacing.four,
      width: "100%",
    },
    manageSiteTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    manageSiteCardsContainer: {
      gap: Spacing.four,
      alignItems: "center",
      paddingTop: Spacing.two,
    },
    manageSiteList: {
      flex: 1,
    },

    manageSiteCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    manageSiteCardTopRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Spacing.three,
    },
    manageSiteLogoWrapper: {
      width: 96,
      height: 96,
      borderRadius: 20,
      backgroundColor: "#f5f3ef",
      alignItems: "center",
      justifyContent: "center",
    },
    manageSiteLogoIcon: {
      fontSize: 38,
    },
    manageSiteCardLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      marginTop: 4,
    },
    manageSiteDeleteIcon: {
      fontSize: 18,
      color: "#e11d48",
    },
    manageSiteDeleteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    deleteSuccessIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#ef4444",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: Spacing.three,
    },
    manageSiteAddCard: {
      minHeight: 180,
      justifyContent: "center",
    },
    manageSiteAddIcon: {
      fontSize: 42,
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    cardsRow: {
      flexDirection: "row",
      gap: Spacing.two,
      flex: 1,
      alignItems: "stretch",
    },
    card: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardIcon: {
      fontSize: 22,
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 2,
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    cardValue: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    fullWidthCard: {
      backgroundColor: "#b3e5d8",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: Spacing.two,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    fullWidthCardTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    approvalsContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    approvalsHeader: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      marginBottom: Spacing.two,
      width: "100%",
    },
    approvalsTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
      textAlign: "center",
    },
    approvalCellID: {
      minWidth: 50,
      paddingHorizontal: 10,
    },
    approvalCellDescription: {
      minWidth: 140,
      paddingHorizontal: 10,
    },
    approvalCellAmount: {
      minWidth: 100,
      paddingHorizontal: 10,
    },
    approvalCellDate: {
      minWidth: 90,
      paddingHorizontal: 10,
    },
    approvalCellHolder: {
      minWidth: 110,
      paddingHorizontal: 10,
    },
    approvalCellAction: {
      minWidth: 130,
      paddingHorizontal: 10,
    },
    workerCellID: {
      minWidth: 50,
      paddingHorizontal: 10,
    },
    workerCellName: {
      minWidth: 120,
      paddingHorizontal: 10,
    },
    workerCellSite: {
      minWidth: 110,
      paddingHorizontal: 10,
    },
    workerCellType: {
      minWidth: 120,
      paddingHorizontal: 10,
    },
    workerCellActions: {
      minWidth: 140,
      paddingHorizontal: 10,
    },
    workerActionsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      minWidth: 140,
      paddingHorizontal: 10,
      gap: 8,
    },
    workerActionButton: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    terminateButton: {
      backgroundColor: "#fbbf24",
    },
    deleteButton: {
      backgroundColor: "#ef4444",
    },
    workerActionIcon: {
      fontSize: 16,
    },
    approvalActionsContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      minWidth: 130,
      paddingHorizontal: 10,
      gap: 6,
    },
    approveButton: {
      backgroundColor: "#22c55e",
      borderRadius: 6,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    approveButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    rejectButton: {
      backgroundColor: "#dc2626",
      borderRadius: 6,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    rejectModalCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 24,
      paddingVertical: 30,
      paddingHorizontal: 22,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
    },
    rejectIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#dc2626",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    rejectIcon: {
      fontSize: 36,
      color: "#fff",
      fontWeight: "700",
    },
    rejectTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111",
      textAlign: "center",
      marginBottom: 16,
    },
    rejectInput: {
      width: "100%",
      backgroundColor: "#f0f0f0",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 20,
      color: isDark ? "#ffffff" : "#1f1d21",
      fontSize: 14,
    },
    confirmModalCard: {
      width: "100%",
      maxWidth: 320,
      backgroundColor: isDark ? "#1e1e1e" : "#fff",
      borderRadius: 24,
      paddingVertical: 30,
      paddingHorizontal: 22,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.22,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 12,
    },
    terminateIconWrapper: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: "#fbbf24",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    terminateIcon: {
      fontSize: 36,
      color: "#fff",
    },
    confirmTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#111",
      textAlign: "center",
      marginBottom: 22,
    },
    confirmButtonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      gap: 12,
    },
    confirmButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmYesButton: {
      backgroundColor: "#22c55e",
    },
    confirmNoButton: {
      backgroundColor: "#ef4444",
    },
    confirmButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    // Assets Table Grid Styles
    assetsTableVerticalScroll: {
      flex: 1,
    },
    assetsTableHorizontalScroll: {
      flex: 1,
    },
    assetsTableWrapper: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 12,
      marginHorizontal: -Spacing.four,
      paddingHorizontal: Spacing.four,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    assetsTableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e8e8ec",
      minHeight: 50,
      alignItems: "center",
    },
    assetsTableHeaderRow: {
      backgroundColor: isDark ? "#121212" : "#f5f5f5",
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomWidth: 2,
      borderBottomColor: "#d0d0d4",
      minHeight: 48,
    },
    assetsTableCell: {
      fontSize: 13,
      color: isDark ? "#ffffff" : "#1f1d21",
      paddingHorizontal: Spacing.two,
      paddingVertical: Spacing.two,
    },
    assetsTableHeaderCell: {
      fontWeight: "700",
      color: "#4f4f53",
      backgroundColor: isDark ? "#121212" : "#f5f5f5",
    },
    assetColId: {
      minWidth: 45,
      paddingLeft: Spacing.three,
    },
    assetColName: {
      minWidth: 100,
    },
    assetColCount: {
      minWidth: 80,
      textAlign: "center",
    },
    assetColValue: {
      minWidth: 110,
      textAlign: "center",
    },
    assetColActions: {
      minWidth: 100,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.one,
    },
    assetActionButtonEdit: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: "#22c55e",
      alignItems: "center",
      justifyContent: "center",
    },
    assetActionButtonDelete: {
      width: 32,
      height: 32,
      borderRadius: 6,
      backgroundColor: "#ef4444",
      alignItems: "center",
      justifyContent: "center",
    },
    assetActionIcon: {
      fontSize: 14,
      color: "#fff",
    },
    assetsTableEmptyRow: {
      paddingVertical: Spacing.four,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyAssetsContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: Spacing.four,
    },
    // Personal View Styles
    personalButtonsContainer: {
      gap: Spacing.three,
      justifyContent: "center",
      alignItems: "center",
      flex: 1,
      width: "100%",
      paddingHorizontal: Spacing.three,
      marginTop: Spacing.four * 6,
    },
    personalAssetButton: {
      width: "100%",
      maxWidth: 300,
      minHeight: 80,
      backgroundColor: "#dc2626",
      borderRadius: 16,
      paddingVertical: Spacing.four,
      paddingHorizontal: Spacing.three,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    personalDetailsButton: {
      width: "100%",
      maxWidth: 300,
      minHeight: 80,
      backgroundColor: "#8b7355",
      borderRadius: 16,
      paddingVertical: Spacing.four,
      paddingHorizontal: Spacing.three,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    personalButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#ffffff",
      textAlign: "center",
      lineHeight: 22,
    },
    personalTabRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: Spacing.two,
      marginBottom: Spacing.three,
    },
    personalTabButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: "#f5f5f7",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    personalTabDot: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: "#22c55e",
    },
    personalTabText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#4b5563",
    },
    personalTabTextActive: {
      color: "#111827",
    },
    personalAddButton: {
      marginLeft: "auto",
      backgroundColor: "#2563eb",
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    personalAddButtonText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 14,
    },
    personalTableScroll: {
      flex: 1,
    },
    personalTableHorizontalScroll: {
      flex: 1,
      marginBottom: Spacing.two,
    },
    personalTableCard: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 24,
      paddingVertical: Spacing.three,
      paddingHorizontal: Spacing.four,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      alignSelf: "flex-start",
    },
    personalCellId: {
      minWidth: 50,
      paddingHorizontal: 10,
    },
    personalCellMain: {
      minWidth: 140,
      paddingHorizontal: 10,
    },
    personalCellType: {
      minWidth: 100,
      paddingHorizontal: 10,
    },
    personalCellValue: {
      minWidth: 100,
      paddingHorizontal: 10,
    },
    personalCellExtra: {
      minWidth: 100,
      paddingHorizontal: 10,
    },
    personalCellActions: {
      minWidth: 100,
      flexDirection: "row",
      gap: Spacing.one,
      alignItems: "center",
      paddingHorizontal: 10,
    },
    personalSelectionContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    personalSelectionHeader: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.two,
      position: "relative",
    },
    personalSelectionTitle: {
      fontSize: 22,
      fontWeight: "700",
    },
    personalSelectionContent: {
      gap: Spacing.four,
      marginTop: Spacing.four,
      paddingHorizontal: Spacing.two,
    },
    personalTile: {
      height: 120,
      borderRadius: 20,
      overflow: "hidden",
    },
    personalTileInner: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: Spacing.three,
    },
    personalTileText: {
      fontSize: 18,
      fontWeight: "600",
      color: "#ffffff",
      textAlign: "center",
      lineHeight: 26,
    },

    personalDocumentsContainer: {
      gap: Spacing.three,
      paddingBottom: Spacing.three,
      flex: 1,
    },
    personalDocumentsHeader: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: Spacing.two,
      position: "relative",
    },
    personalDocumentsTitle: {
      flex: 1,
      fontSize: 22,
      fontWeight: "700",
      textAlign: 'center',
      flexWrap: 'wrap',
    },
    personalDocumentsSection: {
      gap: Spacing.three,
    },
    sectionCard: {
      backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
      borderRadius: 20,
      padding: Spacing.four,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      gap: Spacing.three,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    notesInput: {
      backgroundColor: isDark ? "#2a2a2a" : "#f2f2f7",
      borderRadius: 16,
      padding: Spacing.three,
      minHeight: 100,
      textAlignVertical: "top",
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    textInput: {
      backgroundColor: isDark ? "#2a2a2a" : "#f2f2f7",
      borderRadius: 16,
      padding: Spacing.three,
      color: isDark ? "#ffffff" : "#1f1d21",
    },
    sectionButton: {
      backgroundColor: "#f97316",
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
    },
    sectionButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
    fileTypeRow: {
      flexDirection: "row",
      gap: Spacing.two,
    },
    fileTypeButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: Spacing.three,
      alignItems: "center",
      backgroundColor: isDark ? "#2a2a2a" : "#f2f2f7",
    },
    fileTypeButtonActive: {
      backgroundColor: "#fb923c",
    },
    fileTypeText: {
      color: isDark ? "#ffffff" : "#1f1d21",
      fontWeight: "700",
    },
    fileTypeTextActive: {
      color: "#ffffff",
    },
    fileItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? "#222" : "#f8fafc",
      borderRadius: 16,
      padding: Spacing.three,
      marginTop: Spacing.two,
    },
    fileIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: "#fde68a",
      alignItems: "center",
      justifyContent: "center",
      marginRight: Spacing.three,
    },
    fileInfo: {
      flex: 1,
      gap: Spacing.one,
    },
    fileName: {
      color: isDark ? "#ffffff" : "#1f1d21",
      fontSize: 15,
      fontWeight: "700",
    },
    fileDate: {
      color: isDark ? "#a0a0a0" : "#6b7280",
      fontSize: 13,
    },
    fileActions: {
      flexDirection: "row",
      gap: Spacing.two,
    },
    fileActionButton: {
      borderRadius: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: isDark ? "#333" : "#e5e7eb",
    },
    noteItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: isDark ? "#222" : "#f8fafc",
      borderRadius: 16,
      padding: Spacing.three,
      marginTop: Spacing.two,
    },
    noteTextSection: {
      flex: 1,
      gap: Spacing.one,
    },
    noteText: {
      color: isDark ? "#ffffff" : "#1f1d21",
      fontSize: 15,
    },
    noteDate: {
      color: isDark ? "#a0a0a0" : "#6b7280",
      fontSize: 13,
    },
    noteActions: {
      flexDirection: "row",
      gap: Spacing.two,
      alignItems: "center",
    },
    noteActionButton: {
      borderRadius: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: isDark ? "#333" : "#e5e7eb",
    },
    noteActionText: {
      color: isDark ? "#ffffff" : "#1f1d21",
      fontWeight: "600",
      fontSize: 13,
    },
    deleteActionButton: {
      backgroundColor: "#ef4444",
    },
    deleteBtn: {
      borderRadius: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      backgroundColor: "#ef4444",
    },
    deleteBtnText: {
      color: "#ffffff",
      fontWeight: "600",
      fontSize: 13,
    },
  });
