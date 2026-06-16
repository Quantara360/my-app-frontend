import re

cur = open('C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx', 'r', encoding='utf-8').read()
new_ui = open('C:/xampp1/htdocs/MyFirstProject (1)/admin.tsx.txt', 'r', encoding='utf-8').read()

cur_lines = cur.splitlines()
new_lines = new_ui.splitlines()

# ===========================================================
# 1. IMPORTS
# ===========================================================
imports_block = """import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import * as AssetsService from "@/services/adminAssetsService";
import * as ChemicalsService from "@/services/adminChemicalsService";
import * as MachineriesService from "@/services/adminMachineriesService";
import * as WorkersService from "@/services/adminWorkersService";
import * as ApprovalsService from "@/services/adminApprovalsService";
import * as PersonalAssetsService from "@/services/adminPersonalAssetsService";
import * as AttendancesService from "@/services/adminAttendancesService";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL, getAuthHeaders } from "@/services/authService";
import { useTheme } from "@/hooks/use-theme";
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";"""

admin_card_iface = """
interface AdminCard {
  id: string;
  title: string;
  value: number | string;
  icon: string;
  backgroundColor: string;
  textColor: string;
}"""

component_start = """
export default function AdminDashboard() {
  const theme = useTheme();
  const { signOut, user, updateUser } = useAuth();
  const [selectedSite, setSelectedSite] = useState("Site Selection");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const router = useRouter();

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
  ).current;"""

inner_interfaces = """
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
    site: string;
    type: string;
    status?: string;
    role?: string;
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
  }"""

state_vars = """
  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "machineries"
    | "assets"
    | "chemicals"
    | "approvals"
    | "workers"
    | "personal"
    | "personalAssets"
    | "manageSite"
    | "attendance"
  >("dashboard");

  // API data state
  const [machineries, setMachineries] = useState<MachineryRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [workers, setWorkers] = useState<WorkerRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [jewelleries, setJewelleries] = useState<JewelleryRecord[]>([]);
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendancesService.AttendanceRecord[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [manageSites, setManageSites] = useState<any[]>([]);

  // Search state
  const [machinerySearch, setMachinerySearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [chemicalSearch, setChemicalSearch] = useState("");
  const [approvalSearch, setApprovalSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState("All");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");

  // Modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showApprovalSuccessModal, setShowApprovalSuccessModal] = useState(false);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [showRejectSuccessModal, setShowRejectSuccessModal] = useState(false);
  const [showTerminateConfirmModal, setShowTerminateConfirmModal] = useState(false);
  const [showTerminateSuccessModal, setShowTerminateSuccessModal] = useState(false);
  const [showWorkerDeleteSuccessModal, setShowWorkerDeleteSuccessModal] = useState(false);
  const [showSiteDeletedSuccessModal, setShowSiteDeletedSuccessModal] = useState(false);
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
  const [siteLogoName, setSiteLogoName] = useState("");
  const [deletedSiteName, setDeletedSiteName] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedApprovalForReject, setSelectedApprovalForReject] = useState<ApprovalRecord | null>(null);
  const [selectedWorkerForTermination, setSelectedWorkerForTermination] = useState<WorkerRecord | null>(null);
  const [successModalTitle, setSuccessModalTitle] = useState("Assets Updated Successfully!");
  const [successButtonText, setSuccessButtonText] = useState("Ok");
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editCount, setEditCount] = useState("");
  const [editValue, setEditValue] = useState("");

  // Attendance edit
  const [selectedAttendance, setSelectedAttendance] = useState<AttendancesService.AttendanceRecord | null>(null);
  const [editAttendanceShift, setEditAttendanceShift] = useState("");
  const [editAttendanceDate, setEditAttendanceDate] = useState("");
  const [editAttendanceStatus, setEditAttendanceStatus] = useState("");"""

filtered_data = """
  // Site-filtered data
  const filteredMachineries = selectedSiteId ? machineries.filter((m: any) => m.worksite_id === selectedSiteId) : machineries;
  const filteredAssets = selectedSiteId ? assets.filter((a: any) => a.worksite_id === selectedSiteId) : assets;
  const filteredChemicals = selectedSiteId ? chemicals.filter((c: any) => c.worksite_id === selectedSiteId) : chemicals;
  const filteredApprovals = selectedSiteId ? approvals.filter((a: any) => a.worksite_id === selectedSiteId) : approvals;
  const filteredWorkers = selectedSiteId ? workers.filter((w: any) => w.worksite_id === selectedSiteId) : workers;

  const todayAttendancesCount = attendances.filter((a: any) => {
    if (!a.date) return false;
    const today = new Date().toISOString().split('T')[0];
    return a.date.startsWith(today);
  }).length;

  // Search-filtered data
  const filteredWorkerData = filteredWorkers.filter((item) => {
    const query = workerSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.site.toLowerCase().includes(query) ||
      (item.type || item.status || item.role || "").toLowerCase().includes(query)
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

  const filteredAttendances = selectedSiteId ? attendances.filter((a: any) => a.worksite_id === selectedSiteId) : attendances;
  const filteredAttendanceData = filteredAttendances.filter((item) => {
    const searchMatch = attendanceSearch.trim() === "" ||
      (item.worker?.name || "").toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      String(item.id).includes(attendanceSearch);
    const shiftMatch = attendanceShiftFilter === "All" || item.shift === attendanceShiftFilter;
    const dateMatch = attendanceDateFilter === "" || (item.date && item.date.startsWith(attendanceDateFilter));
    return searchMatch && shiftMatch && dateMatch;
  });"""

api_handlers = """
  // === API HANDLERS ===

  const handleUpdateAdminProfile = async () => {
    try {
      setProfileError("");
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          ...(adminPassword ? { password: adminPassword } : {})
        })
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0];
          const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
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
      setApprovals((prev) => prev.map((a) => a.id === item.id ? { ...a, status: 'approved' } : a));
      setShowApprovalSuccessModal(true);
    } catch (error) {
      console.error('Failed to approve:', error);
      Alert.alert('Error', 'Failed to approve');
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
        await ApprovalsService.rejectApproval(selectedApprovalForReject.id, rejectReason);
        await loadApprovalsData();
        setShowRejectReasonModal(false);
        setShowRejectSuccessModal(true);
      } catch (error) {
        console.error('Failed to reject:', error);
        Alert.alert('Error', 'Failed to reject');
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
      console.error('Failed to terminate worker:', error);
      Alert.alert('Error', 'Failed to terminate worker');
    }
  };

  const handleDeleteWorker = async (item: WorkerRecord) => {
    try {
      await WorkersService.deleteWorker(item.id);
      setWorkers((current) => current.filter((worker) => worker.id !== item.id));
      setShowWorkerDeleteSuccessModal(true);
    } catch (error) {
      console.error('Failed to delete worker:', error);
      Alert.alert('Error', 'Failed to delete worker');
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
            ? { ...asset, name: editName, count: Number(editCount) || 0, value: editValue }
            : asset,
        ),
      );
      setShowUpdateModal(false);
      setSuccessModalTitle("Assets Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update asset:', error);
      Alert.alert('Error', 'Failed to update asset');
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
      console.error('Failed to delete asset:', error);
      Alert.alert('Error', 'Failed to delete asset');
    }
  };

  const handleDeleteChemical = async (item: any) => {
    try {
      await ChemicalsService.deleteChemical(item.id);
      setChemicals((current: any[]) => current.filter((c: any) => c.id !== item.id));
    } catch (error) {
      console.error('Failed to delete chemical:', error);
      Alert.alert('Error', 'Failed to delete chemical');
    }
  };

  const handleDeleteMachinery = async (item: MachineryRecord) => {
    try {
      await MachineriesService.deleteMachinery(item.id);
      setMachineries((current) => current.filter((m) => m.id !== item.id));
    } catch (error) {
      console.error('Failed to delete machinery:', error);
      Alert.alert('Error', 'Failed to delete machinery');
    }
  };

  const handleDeleteAttendance = async (item: AttendancesService.AttendanceRecord) => {
    try {
      await AttendancesService.deleteAttendance(item.id);
      setAttendances((current) => current.filter((a) => a.id !== item.id));
    } catch (error) {
      console.error('Failed to delete attendance:', error);
      Alert.alert('Error', 'Failed to delete attendance');
    }
  };

  const openAttendanceEditModal = (item: AttendancesService.AttendanceRecord) => {
    setSelectedAttendance(item);
    setEditAttendanceShift(item.shift);
    setEditAttendanceDate(item.date ? item.date.split('T')[0] : '');
    setEditAttendanceStatus(item.status);
    setShowAttendanceEditModal(true);
  };

  const handleSaveAttendanceEdit = () => {
    if (!selectedAttendance) return;
    setAttendances((current) =>
      current.map((a) =>
        a.id === selectedAttendance.id
          ? { ...a, shift: editAttendanceShift, date: editAttendanceDate, status: editAttendanceStatus }
          : a
      )
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
        setVehicles((current) => current.filter((record) => record.id !== item.id));
      } else if (selectedPersonalTab === "jewelleries") {
        await PersonalAssetsService.deleteJewellery(item.id);
        setJewelleries((current) => current.filter((record) => record.id !== item.id));
      } else {
        await PersonalAssetsService.deleteProperty(item.id);
        setProperties((current) => current.filter((record) => record.id !== item.id));
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
          name: newPersonalName, type: newPersonalType, value: newPersonalValue, plateNo: newPersonalExtra,
        });
        setVehicles((current) => [...current, created]);
      } else if (selectedPersonalTab === "jewelleries") {
        const created = await PersonalAssetsService.createJewellery({
          name: newPersonalName, value: newPersonalValue, weight: newPersonalExtra,
        });
        setJewelleries((current) => [...current, created]);
      } else {
        const created = await PersonalAssetsService.createProperty({
          location: newPersonalName, value: newPersonalValue, area: newPersonalExtra,
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
        const updated = await PersonalAssetsService.updateVehicle(selectedPersonalItem.id, {
          name: newPersonalName, type: newPersonalType, value: newPersonalValue, plateNo: newPersonalExtra,
        });
        setVehicles((current) => current.map((item) => item.id === selectedPersonalItem.id ? updated : item));
      } else if (selectedPersonalTab === "jewelleries") {
        const updated = await PersonalAssetsService.updateJewellery(selectedPersonalItem.id, {
          name: newPersonalName, value: newPersonalValue, weight: newPersonalExtra,
        });
        setJewelleries((current) => current.map((item) => item.id === selectedPersonalItem.id ? updated : item));
      } else {
        const updated = await PersonalAssetsService.updateProperty(selectedPersonalItem.id, {
          location: newPersonalName, value: newPersonalValue, area: newPersonalExtra,
        });
        setProperties((current) => current.map((item) => item.id === selectedPersonalItem.id ? updated : item));
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

  const handlePickSiteLogo = () => {
    Alert.alert("Upload Image", "Choose image source", [
      { text: "Gallery", onPress: () => setSiteLogoName("gallery-image.jpg") },
      { text: "Files", onPress: () => setSiteLogoName("file-image.jpg") },
      { text: "Cancel", style: "cancel" },
    ], { cancelable: true });
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      Alert.alert("Missing Site Name", "Please enter a site name.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/worksites`, {
        method: 'POST',
        headers: {
          ...(await getAuthHeaders()),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newSiteName.trim() })
      });
      if (!response.ok) throw new Error("Failed to add site");
      const addedSite = await response.json();
      setManageSites((current: any) => [...current, addedSite]);
      setWorksites((current: any) => [...current, addedSite]);
      setShowAddSiteModal(false);
      setNewSiteName("");
      setSiteLogoName("");
      setSuccessModalTitle("Site Added Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not add the site.");
    }
  };

  const handleDeleteSite = async (site: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/worksites/${site.id}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete");
      setDeletedSiteName(site.title || site.name);
      setManageSites((current: any) => current.filter((item: any) => item.id !== site.id));
      setWorksites((current: any) => current.filter((item: any) => item.id !== site.id));
      setShowSiteDeletedSuccessModal(true);
    } catch (error) {
      Alert.alert("Error", "Could not delete the site.");
    }
  };"""

admin_cards_block = """
  const adminCards: AdminCard[] = [
    { id: "1", title: "Attendance", value: todayAttendancesCount, icon: "\\u{1F465}", backgroundColor: "#e0e0e0", textColor: "#1f1d21" },
    { id: "2", title: "Machineries", value: filteredMachineries.length, icon: "\\u2699\\uFE0F", backgroundColor: "#f5c6c6", textColor: "#1f1d21" },
    { id: "3", title: "Assets", value: filteredAssets.length, icon: "\\u{1F4E6}", backgroundColor: "#a8d5a8", textColor: "#1f1d21" },
    { id: "4", title: "Chemicals", value: filteredChemicals.length, icon: "\\u{1F9EA}", backgroundColor: "#a8c1f5", textColor: "#1f1d21" },
    { id: "5", title: "Approvals", value: filteredApprovals.length, icon: "\\u2705", backgroundColor: "#f5f5b8", textColor: "#1f1d21" },
    { id: "6", title: "Workers", value: filteredWorkers.length, icon: "\\u{1F477}", backgroundColor: "#c0c0c0", textColor: "#1f1d21" },
    { id: "7", title: "Personal", value: vehicles.length + jewelleries.length + properties.length, icon: "\\u{1F464}", backgroundColor: "#a8d5a8", textColor: "#1f1d21" },
    { id: "8", title: "Manage Site", value: worksites.length, icon: "\\u{1F3E2}", backgroundColor: "#f5d7b3", textColor: "#1f1d21" },
  ];"""

use_effect_and_helpers = """
  const getCardScaleValue = (cardId: string) => {
    if (!cardScaleValues[cardId]) {
      cardScaleValues[cardId] = new Animated.Value(1);
    }
    return cardScaleValues[cardId];
  };

  const onCardHoverEnter = (cardId: string) => {
    Animated.spring(getCardScaleValue(cardId), { toValue: 1.08, useNativeDriver: true }).start();
  };

  const onCardHoverExit = (cardId: string) => {
    Animated.spring(getCardScaleValue(cardId), { toValue: 1, useNativeDriver: true }).start();
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
    loadWorksitesData();
    loadAttendancesData();
    return () => clearInterval(timer);
  }, []);

  const loadAttendancesData = async () => {
    try {
      const data = await AttendancesService.getAttendances();
      setAttendances(data);
    } catch (error) { console.error('Failed to load attendances:', error); }
  };

  const loadWorksitesData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/worksites`, { headers: await getAuthHeaders() });
      const data = await response.json();
      const loadedWorksites = Array.isArray(data) ? data : data.data || [];
      setWorksites(loadedWorksites);
      setManageSites(loadedWorksites);
    } catch (error) { console.error('Failed to load worksites:', error); }
  };

  const loadAssetsData = async () => {
    try {
      const data = await AssetsService.getAssets();
      setAssets(data);
    } catch (error) { console.error('Failed to load assets:', error); }
  };

  const loadChemicalsData = async () => {
    try {
      const data = await ChemicalsService.getChemicals();
      setChemicals(data);
    } catch (error) { console.error('Failed to load chemicals:', error); }
  };

  const loadMachineriesData = async () => {
    try {
      const data = await MachineriesService.getMachineries();
      const mappedData = data.map((item: any) => ({
        id: item.id,
        machine: item.name || item.machine || '',
        status: item.status || '',
        description: item.location || item.description || '',
        worksite_id: item.worksite_id || null,
      }));
      setMachineries(mappedData);
    } catch (error) { console.error('Failed to load machineries:', error); }
  };

  const loadWorkersData = async () => {
    try {
      const data = await WorkersService.getWorkers();
      setWorkers(data);
    } catch (error) { console.error('Failed to load workers:', error); }
  };

  const loadApprovalsData = async () => {
    try {
      const data = await ApprovalsService.getApprovals();
      setApprovals(data);
    } catch (error) { console.error('Failed to load approvals:', error); }
  };

  const loadPersonalAssetsData = async () => {
    try {
      const vehiclesData = await PersonalAssetsService.getVehicles();
      setVehicles(vehiclesData);
      const jewelleriesData = await PersonalAssetsService.getJewelleries();
      setJewelleries(jewelleriesData);
      const propertiesData = await PersonalAssetsService.getProperties();
      setProperties(propertiesData);
    } catch (error) { console.error('Failed to load personal assets:', error); }
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
      setSelectedView("personalAssets");
    } else if (card.title === "Manage Site") {
      setSelectedView("manageSite");
    } else {
      Alert.alert(`${card.title}`, `You clicked on ${card.title}`);
    }
  };

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);"""

personal_helpers = """
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
  };"""

attendance_view = """
  const renderAttendancesView = () => (
    <View style={styles.machineriesContainer}>
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.machineriesHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setAttendanceSearch("");
            setAttendanceShiftFilter("All");
            setAttendanceDateFilter("");
          }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.machineriesTitle}>
          Attendances
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, zIndex: 1 }}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={attendanceSearch}
            onChangeText={setAttendanceSearch}
            placeholder="Search by worker or ID"
            placeholderTextColor="#8a8a8f"
            style={styles.searchInput}
          />
        </View>
        <select
          value={attendanceShiftFilter}
          onChange={(e: any) => setAttendanceShiftFilter(e.target.value)}
          style={{ backgroundColor: 'transparent', color: '#333', border: '1px solid #ccc', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
        >
          <option value="All">All Shifts</option>
          <option value="Morning">Morning</option>
          <option value="Evening">Evening</option>
        </select>
        <input
          type="date"
          value={attendanceDateFilter}
          onChange={(e: any) => setAttendanceDateFilter(e.target.value)}
          style={{ backgroundColor: 'transparent', color: '#333', border: '1px solid #ccc', borderRadius: 8, padding: '8px 12px', fontSize: 14 }}
        />
      </View>

      <ScrollView style={styles.tableScrollContainer} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCard, { minWidth: 700 }]}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ID</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Worker</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Shift</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Marked At</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Actions</Text>
            </View>

            {filteredAttendanceData.map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.tableRow,
                  index !== filteredAttendanceData.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
                ]}
              >
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.id}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.worker?.name || `Worker #${item.worker_id}`}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.date ? item.date.split('T')[0] : ''}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.shift}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.tableCell, { flex: 2 }, item.status === "present" ? styles.statusAvailable : styles.statusFinished]}>
                  {item.status === "present" ? "Present" : "Absent"}
                </Text>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', gap: 6 }]}>
                  <Pressable onPress={() => openAttendanceEditModal(item)} style={[styles.assetActionButtonEdit, { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                    <Text style={styles.assetActionIcon}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteAttendance(item)} style={[styles.assetActionButtonDelete, { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}>
                    <Text style={styles.assetActionIcon}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {filteredAttendanceData.length === 0 && (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No matching attendances found.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );"""

attendance_modal = """
  const renderAttendanceEditModal = () => (
    <Modal visible={showAttendanceEditModal} transparent animationType="fade" onRequestClose={() => setShowAttendanceEditModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Attendance</Text>
            <Pressable onPress={() => setShowAttendanceEditModal(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Date</Text>
            <TextInput value={editAttendanceDate} onChangeText={setEditAttendanceDate} style={styles.formInput} placeholder="YYYY-MM-DD" />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Shift</Text>
            <TextInput value={editAttendanceShift} onChangeText={setEditAttendanceShift} style={styles.formInput} placeholder="Morning / Evening" />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Status</Text>
            <TextInput value={editAttendanceStatus} onChangeText={setEditAttendanceStatus} style={styles.formInput} placeholder="present / absent" />
          </View>
          <Pressable onPress={handleSaveAttendanceEdit} style={styles.updateButton}>
            <Text style={styles.updateButtonText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );"""

admin_profile_modal = """
  const renderAdminProfileModal = () => (
    <View style={styles.personalContainer}>
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.personalHeader}>
        <Pressable onPress={() => setSelectedView("dashboard")} style={styles.backButton}>
          <Text style={styles.backButtonIcon}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.personalTitle}>Admin Profile</ThemedText>
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Name</Text>
        <TextInput value={adminName} onChangeText={(text) => { setAdminName(text); setProfileError(""); }} style={styles.formInput} placeholder="Admin name" />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Email</Text>
        <TextInput value={adminEmail} onChangeText={(text) => { setAdminEmail(text); setProfileError(""); }} style={styles.formInput} placeholder="Email" keyboardType="email-address" />
      </View>
      <View style={styles.formRow}>
        <Text style={styles.formLabel}>Password</Text>
        <TextInput value={adminPassword} onChangeText={(text) => { setAdminPassword(text); setProfileError(""); }} style={styles.formInput} placeholder="New password (leave blank to keep)" secureTextEntry />
      </View>
      {profileError ? (
        <Text style={{ color: 'red', marginBottom: 8, paddingHorizontal: 16 }}>{profileError}</Text>
      ) : null}
      <Pressable onPress={handleUpdateAdminProfile} style={[styles.addSiteButton, { marginTop: 16, marginHorizontal: 16 }]}>
        <Text style={styles.addSiteButtonText}>Save Profile</Text>
      </Pressable>
    </View>
  );"""

# The new UI render section starts at renderMachineriesView (line 713)
# ends right before main return (line 2553)
render_views_new = '\\n'.join(new_lines[712:2553])

render_views_new = render_views_new.replace(
    '''              onPress={() => {
                  setDeletedSiteName(site.title);
                  setManageSites((current) =>
                    current.filter((item) => item.id !== site.id),
                  );
                  setShowSiteDeletedSuccessModal(true);
                }}''',
    '              onPress={() => handleDeleteSite(site)}'
)

render_views_new = render_views_new.replace(
    '<Text style={styles.manageSiteCardLabel}>{site.title}</Text>',
    '<Text style={styles.manageSiteCardLabel}>{site.title || site.name}</Text>'
)

render_views_new = render_views_new.replace(
    'onPress={() => router.push(site.route as any)}',
    'onPress={() => router.push(`/dashboard/${site.id}` as any)}'
)

# Remove local implementations inside render views block
render_views_new = render_views_new.replace(
    '''  const handleAddSite = () => {
    if (!newSiteName.trim()) {
      Alert.alert("Missing Site Name", "Please enter a site name.");
      return;
    }

    const newSite = {
      id: `site-${Date.now()}`,
      title: newSiteName.trim(),
      icon: "\\u{1F3E2}",
      route: "/dashboard",
    };

    setManageSites((current) => [...current, newSite]);
    setShowAddSiteModal(false);
    setNewSiteName("");
    setSiteLogoName("");
    setSuccessModalTitle("Site Added Successfully!");
    setSuccessButtonText("Ok");
    setShowSuccessModal(true);
  };''',
    ''
)

render_views_new = render_views_new.replace(
    '''  const handlePickSiteLogo = () => {
    Alert.alert(
      "Upload Image",
      "Choose image source",
      [
        {
          text: "Gallery",
          onPress: () => setSiteLogoName("gallery-image.jpg"),
        },
        {
          text: "Files",
          onPress: () => setSiteLogoName("file-image.jpg"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };''',
    ''
)

# Main return
main_return = """
  return (
    <ThemedView style={styles.container}>
      {selectedView === "dashboard" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderDashboardView()}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
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
            ? renderPersonalView()
            : selectedView === "manageSite"
            ? renderManageSiteView()
            : null}
        </ScrollView>
      )}
      {renderUpdateModal()}
      {renderPersonalAddModal()}
      {renderPersonalEditModal()}
      {renderAddSiteModal()}
      {renderSiteDeletedModal()}
      {renderSuccessModal()}
      {renderApprovalSuccessModal()}
      {renderRejectReasonModal()}
      {renderRejectSuccessModal()}
      {renderTerminateConfirmModal()}
      {renderTerminateSuccessModal()}
      {renderWorkerDeleteSuccessModal()}
      {renderAttendanceEditModal()}
    </ThemedView>
  );
}"""

styles_from_new = '\\n'.join(new_lines[2591:])

final = '\\n'.join([
    imports_block,
    admin_card_iface,
    component_start,
    inner_interfaces,
    state_vars,
    filtered_data,
    api_handlers,
    admin_cards_block,
    use_effect_and_helpers,
    personal_helpers,
    attendance_view,
    attendance_modal,
    render_views_new,
    admin_profile_modal,
    main_return,
    styles_from_new,
])

output_path = 'C:/xampp1/htdocs/MyFirstProject (1)/MyFirstProject/src/app/admin.tsx'
open(output_path, 'w', encoding='utf-8').write(final)
print(f"Written {len(final)} chars, {final.count(chr(10))} lines to {output_path}")
