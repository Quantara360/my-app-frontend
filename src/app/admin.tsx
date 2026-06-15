import { ThemedText } from "@/components/themed-text";
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
  const [selectedSite, setSelectedSite] = useState("Site Selection");
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const router = useRouter();
  const { signOut, user, updateUser } = useAuth();
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

  const handleUpdateAdminProfile = async () => {
    try {
      setProfileError("");
      // API call to update profile
      const headers = await getAuthHeaders();
      console.log("[Profile] Saving with headers:", headers);
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
      console.log("[Profile] Response:", response.status, data);

      if (!response.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0];
          const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          throw new Error(errorMessage as string);
        }
        throw new Error(data.message || "Failed to update profile");
      }

      // data.user comes from backend response
      await updateUser(data.user);
      // Also update local form state directly to reflect immediately
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


  // Create animated values for each card
  const cardScaleValues = React.useRef<{ [key: string]: Animated.Value }>(
    {},
  ).current;

  interface MachineryRecord {
    id: string | number;
    machine: string;
    status: string;
    description: string;
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
  }

  const initialManageSites = [
    {
      id: "cleanit",
      title: "CleanIt",
      icon: "🧼",
      route: "/dashboard/cleanit",
    },
    {
      id: "amil",
      title: "AMIL",
      icon: "🏢",
      route: "/dashboard/amil",
    },
  ];

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
  const [machinerySearch, setMachinerySearch] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [chemicalSearch, setChemicalSearch] = useState("");
  const [approvalSearch, setApprovalSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceShiftFilter, setAttendanceShiftFilter] = useState("All");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("");
  const [attendances, setAttendances] = useState<AttendancesService.AttendanceRecord[]>([]);
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
  const [selectedPersonalTab, setSelectedPersonalTab] = useState<
    "vehicles" | "jewelleries" | "properties"
  >("vehicles");
  const [selectedPersonalItem, setSelectedPersonalItem] = useState<
    VehicleRecord | JewelleryRecord | PropertyRecord | null
  >(null);
  const [newPersonalName, setNewPersonalName] = useState("");
  const [newPersonalType, setNewPersonalType] = useState("");
  const [newPersonalValue, setNewPersonalValue] = useState("");
  const [newPersonalExtra, setNewPersonalExtra] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [siteLogoName, setSiteLogoName] = useState("");
  const [deletedSiteName, setDeletedSiteName] = useState("");
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [manageSites, setManageSites] = useState<Worksite[]>([]);
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

  const [machineries, setMachineries] = useState<MachineryRecord[]>([]);

  const initialAssetData: AssetRecord[] = [];
  const [assets, setAssets] = useState<AssetRecord[]>(initialAssetData);
  type ChemicalRecord = {
    id: string | number;
    name: string;
    quantity: number;
    status: string;
    worksite_id?: number | null;
  };

  const initialChemicalData: ChemicalRecord[] = [
    { id: "1", name: "Quaternary", quantity: 100, status: "Available" },
    { id: "2", name: "Ammonium", quantity: 0, status: "Finished" },
    { id: "3", name: "Harpic", quantity: 65, status: "Available" },
    { id: "4", name: "Chlorine compounds", quantity: 77, status: "Available" },
    { id: "5", name: "Lysol", quantity: 18, status: "Available" },
    { id: "6", name: "Lab reagents", quantity: 65, status: "Available" },
    { id: "7", name: "Alcohols", quantity: 0, status: "Finished" },
    { id: "8", name: "Phenolics", quantity: 56, status: "Available" },
    { id: "9", name: "Peracetic Acid", quantity: 8, status: "Available" },
    { id: "10", name: "Hypochlorite", quantity: 11, status: "Available" },
  ];
  const [chemicals, setChemicals] = useState<ChemicalRecord[]>(initialChemicalData);

  const initialApprovalData: ApprovalRecord[] = [
    {
      id: "1",
      description: "Chemical",
      amount: "Rs 18,520",
      date: "02/06/26",
      holder: "Udayanga",
    },
    {
      id: "2",
      description: "Travelling",
      amount: "Rs 1,200",
      date: "18/03/26",
      holder: "Thisara",
    },
    {
      id: "3",
      description: "Foods",
      amount: "Rs 950",
      date: "31/04/26",
      holder: "Munusinghe",
    },
    {
      id: "4",
      description: "Meals",
      amount: "Rs 450,000",
      date: "14/02/26",
      holder: "HR",
    },
    {
      id: "5",
      description: "Water bill",
      amount: "Rs 18,000",
      date: "12/03/26",
      holder: "HR",
    },
    {
      id: "6",
      description: "Electricity bill",
      amount: "Rs 48,000",
      date: "12/03/26",
      holder: "HR",
    },
    {
      id: "7",
      description: "Telephone bill",
      amount: "Rs 1598",
      date: "12/03/26",
      holder: "HR",
    },
    {
      id: "8",
      description: "A/C Repair",
      amount: "Rs 28,000",
      date: "19/11/25",
      holder: "Amod",
    },
    {
      id: "9",
      description: "Fuel",
      amount: "Rs 12,000",
      date: "02/02/26",
      holder: "Shehan",
    },
    {
      id: "10",
      description: "Repairs",
      amount: "Rs 460",
      date: "02/03/26",
      holder: "Namod",
    },
  ];
  const [workers, setWorkers] = useState<WorkerRecord[]>([
    { id: "1", name: "Sarath", site: "Apeksha", type: "Generator" },
    { id: "2", name: "Oveen", site: "Apeksha", type: "Generator" },
    { id: "3", name: "Fernando", site: "Apeksha", type: "Generator" },
    { id: "4", name: "Marc", site: "Apeksha", type: "Generator" },
    { id: "5", name: "Maleesha", site: "Apeksha", type: "Generator" },
    { id: "6", name: "Vinuja", site: "Apeksha", type: "Supervisor" },
    { id: "7", name: "Damsith", site: "Apeksha", type: "Generator" },
    { id: "8", name: "Hirushan", site: "Apeksha", type: "Supervisor" },
    { id: "9", name: "Mahinda", site: "Apeksha", type: "Generator" },
    { id: "10", name: "Namal", site: "Apeksha", type: "Generator" },
  ]);

  const [approvals, setApprovals] =
    useState<ApprovalRecord[]>(initialApprovalData);

  const initialVehicleData: VehicleRecord[] = [
    {
      id: "1",
      name: "KDH",
      type: "Van",
      value: "Rs. 12.5Mn",
      plateNo: "PL-2218",
    },
    {
      id: "2",
      name: "KDH",
      type: "Lorry",
      value: "Rs. 11.2Mn",
      plateNo: "NB-8963",
    },
    {
      id: "3",
      name: "Cooper",
      type: "Car",
      value: "Rs. 18.5Mn",
      plateNo: "CBB-3324",
    },
    {
      id: "4",
      name: "KDH",
      type: "Van",
      value: "Rs. 10.5Mn",
      plateNo: "PB-5647",
    },
    {
      id: "5",
      name: "KDH",
      type: "Van",
      value: "Rs. 21.5Mn",
      plateNo: "PL-8964",
    },
    {
      id: "6",
      name: "KDH",
      type: "Lorry",
      value: "Rs. 12.5Mn",
      plateNo: "ND-5741",
    },
    {
      id: "7",
      name: "Vogue",
      type: "SUV",
      value: "Rs. 58.5Mn",
      plateNo: "CBB-4589",
    },
    {
      id: "8",
      name: "KDH",
      type: "Lorry",
      value: "Rs. 11.3Mn",
      plateNo: "301-2245",
    },
    {
      id: "9",
      name: "KDH",
      type: "Canter",
      value: "Rs. 10.8Mn",
      plateNo: "NL-7854",
    },
    {
      id: "10",
      name: "KDH",
      type: "Van",
      value: "Rs. 16.3Mn",
      plateNo: "PB-5748",
    },
  ];

  const initialJewelleryData: JewelleryRecord[] = [
    { id: "1", name: "Chain", value: "Rs. 1.5Mn", weight: "5 Pounds" },
    { id: "2", name: "Bracelet", value: "Rs. 1.2Mn", weight: "4 Pounds" },
    { id: "3", name: "Chain", value: "Rs. 1.6Mn", weight: "8 Pounds" },
    { id: "4", name: "Rings", value: "Rs. 10.5Mn", weight: "30 Pounds" },
    { id: "5", name: "Chain", value: "Rs. 2.5Mn", weight: "20 Pounds" },
    { id: "6", name: "Bracelet", value: "Rs. 8.7Mn", weight: "5 Pounds" },
    { id: "7", name: "Bracelet", value: "Rs. 6.5Mn", weight: "3 Pounds" },
    { id: "8", name: "Earrings", value: "Rs. 8.9Mn", weight: "2 Pounds" },
    { id: "9", name: "Bracelet", value: "Rs. 5.2Mn", weight: "2 Pounds" },
    { id: "10", name: "Ring", value: "Rs. 0.3Mn", weight: "1 Pounds" },
  ];

  const initialPropertyData: PropertyRecord[] = [
    { id: "1", location: "Colombo", value: "Rs. 16.0Mn", area: "12 Perches" },
    { id: "2", location: "Kandy", value: "Rs. 14.2Mn", area: "10 Perches" },
    { id: "3", location: "Negombo", value: "Rs. 12.5Mn", area: "15 Perches" },
    { id: "4", location: "Matale", value: "Rs. 10.5Mn", area: "5 Perches" },
    { id: "5", location: "Kahuwala", value: "Rs. 26.5Mn", area: "20 Perches" },
    { id: "6", location: "Moratuwa", value: "Rs. 10.5Mn", area: "17 Perches" },
    { id: "7", location: "Nawela", value: "Rs. 10.5Mn", area: "25 Perches" },
    { id: "8", location: "Colombo", value: "Rs. 86.5Mn", area: "18 Perches" },
    {
      id: "9",
      location: "Marine Drive",
      value: "Rs. 78.9Mn",
      area: "25 Perches",
    },
    { id: "10", location: "Negombo", value: "Rs. 25.3Mn", area: "16 Perches" },
  ];

  const [vehicles, setVehicles] = useState<VehicleRecord[]>(initialVehicleData);
  const [jewelleries, setJewelleries] =
    useState<JewelleryRecord[]>(initialJewelleryData);
  const [properties, setProperties] =
    useState<PropertyRecord[]>(initialPropertyData);

  const filteredMachineries = selectedSiteId ? machineries.filter((m: any) => m.worksite_id === selectedSiteId) : machineries;
  const filteredAssets = selectedSiteId ? assets.filter((a: any) => a.worksite_id === selectedSiteId) : assets;
  const filteredChemicals = selectedSiteId ? chemicals.filter((c: any) => c.worksite_id === selectedSiteId) : chemicals;
  const filteredApprovals = selectedSiteId ? approvals.filter((a: any) => a.worksite_id === selectedSiteId) : approvals;
  const filteredWorkers = selectedSiteId ? workers.filter((w: any) => w.worksite_id === selectedSiteId) : workers;
  const filteredAttendances = selectedSiteId ? attendances.filter((a: any) => a.worksite_id === selectedSiteId) : attendances;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendancesCount = filteredAttendances.filter(a => a.date && a.date.startsWith(todayStr)).length;

  const filteredAttendanceData = filteredAttendances.filter((item) => {
    const searchMatch = attendanceSearch.trim() === "" ||
      item.worker?.name.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      String(item.id).includes(attendanceSearch);
      
    const shiftMatch = attendanceShiftFilter === "All" || item.shift === attendanceShiftFilter;
    
    // Add date filter logic if a date is selected
    const dateMatch = attendanceDateFilter === "" || (item.date && item.date.startsWith(attendanceDateFilter));

    return searchMatch && shiftMatch && dateMatch;
  });

  const filteredWorkerData = filteredWorkers.filter((item) => {
    const query = workerSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(item.id).includes(query) ||
      item.name.toLowerCase().includes(query) ||
      item.site.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query)
    );
  });

  const filteredMachineryData = filteredMachineries.filter((item) => {
    const query = machinerySearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return (
      String(item.id).includes(query) ||
      item.machine.toLowerCase().includes(query) ||
      item.status.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  const filteredAssetData = filteredAssets.filter((item) => {
    const query = assetSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
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
    if (!selectedWorkerForTermination) {
      return;
    }

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
    if (!selectedAsset) {
      return;
    }

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



  const adminCards: AdminCard[] = [
    {
      id: "1",
      title: "Attendance",
      value: todayAttendancesCount,
      icon: "👥",
      backgroundColor: "#e0e0e0",
      textColor: "#1f1d21",
    },
    {
      id: "2",
      title: "Machineries",
      value: filteredMachineries.length,
      icon: "⚙️",
      backgroundColor: "#f5c6c6",
      textColor: "#1f1d21",
    },
    {
      id: "3",
      title: "Assets",
      value: filteredAssets.length,
      icon: "📦",
      backgroundColor: "#a8d5a8",
      textColor: "#1f1d21",
    },
    {
      id: "4",
      title: "Chemicals",
      value: filteredChemicals.length,
      icon: "🧪",
      backgroundColor: "#a8c1f5",
      textColor: "#1f1d21",
    },
    {
      id: "5",
      title: "Approvals",
      value: filteredApprovals.length,
      icon: "✅",
      backgroundColor: "#f5f5b8",
      textColor: "#1f1d21",
    },
    {
      id: "6",
      title: "Workers",
      value: filteredWorkers.length,
      icon: "👷",
      backgroundColor: "#c0c0c0",
      textColor: "#1f1d21",
    },
    {
      id: "7",
      title: "Personal",
      value: vehicles.length + jewelleries.length + properties.length,
      icon: "👤",
      backgroundColor: "#a8d5a8",
      textColor: "#1f1d21",
    },
    {
      id: "8",
      title: "Manage Site",
      value: worksites.length,
      icon: "🏢",
      backgroundColor: "#f5d7b3",
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
    
    // Load data from APIs
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
    } catch (error) {
      console.error('Failed to load attendances:', error);
    }
  };

  const loadWorksitesData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/worksites`, {
        headers: await getAuthHeaders(),
      });
      const data = await response.json();
      const loadedWorksites = Array.isArray(data) ? data : data.data || [];
      setWorksites(loadedWorksites);
      setManageSites(loadedWorksites);
    } catch (error) {
      console.error('Failed to load worksites:', error);
    }
  };

  const loadAssetsData = async () => {
    try {
      const data = await AssetsService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    }
  };

  const loadChemicalsData = async () => {
    try {
      const data = await ChemicalsService.getChemicals();
      setChemicals(data);
    } catch (error) {
      console.error('Failed to load chemicals:', error);
    }
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
    } catch (error) {
      console.error('Failed to load machineries:', error);
    }
  };

  const loadWorkersData = async () => {
    try {
      const data = await WorkersService.getWorkers();
      setWorkers(data);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  };

  const loadApprovalsData = async () => {
    try {
      const data = await ApprovalsService.getApprovals();
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
    }
  };

  const loadPersonalAssetsData = async () => {
    try {
      const vehiclesData = await PersonalAssetsService.getVehicles();
      setVehicles(vehiclesData);
      
      const jewelleriesData = await PersonalAssetsService.getJewelleries();
      setJewelleries(jewelleriesData);
      
      const propertiesData = await PersonalAssetsService.getProperties();
      setProperties(propertiesData);
    } catch (error) {
      console.error('Failed to load personal assets:', error);
    }
  };

  const updateDateTime = () => {
    const now = new Date();

    // Format time
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours.toString().padStart(2, "0")}.${minutes} ${ampm}`;

    // Format date
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

  const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.machineriesTitle}>
          Attendances
        </ThemedText>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15, zIndex: 1 }}>
        <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, flexGrow: 1, minWidth: 200, marginBottom: 0 }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={attendanceSearch}
            onChangeText={setAttendanceSearch}
            placeholder="Search by worker or ID"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        <View style={{
          backgroundColor: theme.backgroundElement,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}>
          <select
            value={attendanceShiftFilter}
            onChange={(e) => setAttendanceShiftFilter(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              colorScheme: theme.dark ? 'dark' : 'light',
            }}
          >
            <option value="All" style={{ color: theme.text, backgroundColor: theme.backgroundElement }}>All Shifts</option>
            <option value="Morning" style={{ color: theme.text, backgroundColor: theme.backgroundElement }}>Morning</option>
            <option value="Evening" style={{ color: theme.text, backgroundColor: theme.backgroundElement }}>Evening</option>
          </select>
        </View>

        <View style={{
          backgroundColor: theme.backgroundElement,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.border,
          justifyContent: 'center',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}>
          <input
            type="date"
            value={attendanceDateFilter}
            onChange={(e) => setAttendanceDateFilter(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              color: theme.text,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              colorScheme: theme.dark ? 'dark' : 'light',
            }}
          />
        </View>
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={[styles.tableCard, { minWidth: 600, backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.tableRow, styles.tableHeaderRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.tableHeaderCell, { flex: 1, color: theme.text }]}>ID</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.text }]}>Worker</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.text }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.text }]}>Shift</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.text }]}>Marked At</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2, color: theme.text }]}>Status</Text>
          </View>

          {filteredAttendanceData.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index !== filteredAttendanceData.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.tableCell, { flex: 1, color: theme.textSecondary }]}>
                {item.id}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, color: theme.textSecondary }]}>
                {item.worker?.name || `Worker #${item.worker_id}`}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, color: theme.textSecondary }]}>
                {item.date ? item.date.split('T')[0] : ''}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, color: theme.textSecondary }]}>
                {item.shift}
              </Text>
              <Text style={[styles.tableCell, { flex: 2, color: theme.textSecondary }]}>
                {new Date(item.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { flex: 2 },
                  item.status === "present" ? styles.statusAvailable : styles.statusFinished,
                ]}
              >
                {item.status === "present" ? "Present" : "Absent"}
              </Text>
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
  );

  const renderMachineriesView = () => (
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
            setMachinerySearch("");
          }}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.machineriesTitle}>
          Machineries
        </ThemedText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={machinerySearch}
          onChangeText={setMachinerySearch}
          placeholder="Search"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
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
    <>
      {/* Header with greeting */}
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
        <Pressable 
          style={styles.signOutButton}
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Site Selection and Time/Date Row */}
      <View style={styles.siteTimeRow}>
        <View style={styles.siteSelectionContainer}>
          <Pressable
            style={[styles.siteDropdown, { backgroundColor: theme.backgroundElement }]}
            onPress={() => setShowSiteDropdown(!showSiteDropdown)}
          >
            <Text style={[styles.siteDropdownText, { color: theme.text }]}>{selectedSite}</Text>
            <Text style={[styles.dropdownIcon, { color: theme.text }]}>▼</Text>
          </Pressable>
          {showSiteDropdown && (
            <View style={[styles.dropdownMenu, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                style={styles.siteOption}
                onPress={() => {
                  setSelectedSite("All Sites");
                  setSelectedSiteId(null);
                  setShowSiteDropdown(false);
                }}
              >
                <Text style={[styles.siteOptionText, { color: theme.text }]}>All Sites</Text>
              </Pressable>
              {worksites.map((site) => (
                <Pressable
                  key={site.id}
                  style={styles.siteOption}
                  onPress={() => {
                    setSelectedSite(site.name);
                    setSelectedSiteId(site.id);
                    setShowSiteDropdown(false);
                  }}
                >
                  <Text style={[styles.siteOptionText, { color: theme.text }]}>{site.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.timeSection}>
          <Text style={[styles.timeText, { color: theme.text }]}>{currentTime}</Text>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>{currentDate}</Text>
        </View>
      </View>

      {/* Cards Grid */}
      <View style={[styles.cardsContainer, { backgroundColor: theme.background }]}> 
        <View style={styles.cardsRow}>
          {adminCards.slice(0, 2).map((card) => {
            const scaleValue = getCardScaleValue(card.id);
            return (
              <AnimatedPressable
                key={card.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {card.title}
                </ThemedText>
                {card.value !== "" && (
                  <Text style={[styles.cardValue, { color: theme.text }]}>{card.value}</Text>
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
                  { backgroundColor: theme.backgroundElement },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {card.title}
                </ThemedText>
                {card.value !== "" && (
                  <Text style={[styles.cardValue, { color: theme.text }]}>{card.value}</Text>
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
                  { backgroundColor: theme.backgroundElement },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {card.title}
                </ThemedText>
                {card.value !== "" && (
                  <Text style={[styles.cardValue, { color: theme.text }]}>{card.value}</Text>
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
                  { backgroundColor: theme.backgroundElement },
                  { transform: [{ scale: scaleValue }] },
                ]}
                onPress={() => handleCardPress(card)}
              >
                <Text style={styles.cardIcon}>{card.icon}</Text>
                <ThemedText type="smallBold" style={styles.cardTitle}>
                  {card.title}
                </ThemedText>
                {card.value !== "" && (
                  <Text style={[styles.cardValue, { color: theme.text }]}>{card.value}</Text>
                )}
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Petacash & Accounts - Full Width Card */}
        {(() => {
          const scaleValue = getCardScaleValue("petacash");
          return (
            <AnimatedPressable
              key="petacash"
              style={[
                styles.fullWidthCard,
                { backgroundColor: theme.backgroundElement, transform: [{ scale: scaleValue }] },
              ]}
              onPress={() =>
                Alert.alert(
                  "Petacash & Accounts",
                  "You clicked on Petacash & Accounts",
                )
              }
            >
              <Text style={styles.cardIcon}>💰</Text>
              <ThemedText type="smallBold" style={[styles.fullWidthCardTitle, { color: theme.text }] }>
                Peticash & Accounts
              </ThemedText>
            </AnimatedPressable>
          );
        })()}
      </View>
    </>
  );

  const renderManageSiteView = () => (
    <View style={styles.manageSiteContainer}>
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>

      <View style={styles.manageSiteHeader}>
        <Pressable
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
          onPress={() => setSelectedView("dashboard")}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.manageSiteTitle}>
          Manage Site
        </ThemedText>
      </View>

      <View style={styles.manageSiteCardsContainer}>
        {manageSites.map((site: any) => (
          <Pressable
            key={site.id}
            style={[styles.manageSiteCard, { backgroundColor: theme.backgroundElement }]}
            onPress={() => router.push(`/dashboard/${site.id}` as any)}
          >
            <View style={styles.manageSiteCardTopRow}>
              <View style={styles.manageSiteLogoWrapper}>
                <Text style={styles.manageSiteLogoIcon}>🏢</Text>
              </View>
              <Pressable
                style={styles.manageSiteDeleteButton}
                onPress={async () => {
                  try {
                    const response = await fetch(`${API_BASE_URL}/worksites/${site.id}`, {
                      method: 'DELETE',
                      headers: await getAuthHeaders(),
                    });
                    if (!response.ok) throw new Error("Failed to delete");
                    setDeletedSiteName(site.name);
                    setManageSites((current) =>
                      current.filter((item) => item.id !== site.id),
                    );
                    setWorksites((current) =>
                      current.filter((item) => item.id !== site.id),
                    );
                    setShowSiteDeletedSuccessModal(true);
                  } catch (error) {
                    Alert.alert("Error", "Could not delete the site.");
                  }
                }}
              >
                <Text style={styles.manageSiteDeleteIcon}>🗑️</Text>
              </Pressable>
            </View>
            <Text style={[styles.manageSiteCardLabel, { color: theme.text }]}>{site.name}</Text>
          </Pressable>
        ))}

        <Pressable
          style={[styles.manageSiteCard, styles.manageSiteAddCard, { backgroundColor: theme.backgroundElement }]}
          onPress={() => setShowAddSiteModal(true)}
        >
          <Text style={[styles.manageSiteAddIcon, { color: theme.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );

  const handlePickSiteLogo = () => {
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
      
      setManageSites((current) => [...current, addedSite]);
      setWorksites((current) => [...current, addedSite]);
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

  const renderAddSiteModal = () => (
    <Modal
      visible={showAddSiteModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddSiteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Site</Text>
            <Pressable
              onPress={() => setShowAddSiteModal(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Site Name</Text>
            <TextInput
              value={newSiteName}
              onChangeText={setNewSiteName}
              placeholder="Enter site name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable onPress={handlePickSiteLogo} style={styles.logoUploadButton}>
              <Text style={[styles.logoUploadText, { color: theme.text }]}>
                {siteLogoName || "Upload"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={handleAddSite} style={styles.addSiteButton}>
            <Text style={styles.addSiteButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderSiteDeletedModal = () => (
    <Modal
      visible={showSiteDeletedSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSiteDeletedSuccessModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard}>
          <View style={styles.deleteSuccessIconWrapper}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Site Deleted Successfully!</Text>
          <Pressable
            onPress={() => setShowSiteDeletedSuccessModal(false)}
            style={styles.successButton}
          >
            <Text style={styles.successButtonText}>Ok</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  const renderAssetsView = () => (
    <View style={styles.assetsContainer}>
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.assetsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setAssetSearch("");
          }}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.assetsTitle}>
          Assets
        </ThemedText>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={assetSearch}
          onChangeText={setAssetSearch}
          placeholder="Search"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        style={styles.assetsTableVerticalScroll}
        showsVerticalScrollIndicator={true}
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

  const handleSavePersonalEdit = async () => {
    if (!selectedPersonalItem) return;

    try {
      if (selectedPersonalTab === "vehicles") {
        await PersonalAssetsService.updateVehicle(selectedPersonalItem.id, {
          name: newPersonalName,
          type: newPersonalType,
          value: newPersonalValue,
          plateNo: newPersonalExtra,
        });
        setVehicles((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id
              ? {
                  id: item.id,
                  name: newPersonalName || item.name,
                  type: newPersonalType || item.type,
                  value: newPersonalValue || item.value,
                  plateNo: newPersonalExtra || item.plateNo,
                }
              : item,
          ),
        );
      } else if (selectedPersonalTab === "jewelleries") {
        await PersonalAssetsService.updateJewellery(selectedPersonalItem.id, {
          name: newPersonalName,
          value: newPersonalValue,
          weight: newPersonalExtra,
        });
        setJewelleries((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id
              ? {
                  id: item.id,
                  name: newPersonalName || item.name,
                  value: newPersonalValue || item.value,
                  weight: newPersonalExtra || item.weight,
                }
              : item,
          ),
        );
      } else {
        await PersonalAssetsService.updateProperty(selectedPersonalItem.id, {
          location: newPersonalName,
          value: newPersonalValue,
          area: newPersonalExtra,
        });
        setProperties((current) =>
          current.map((item) =>
            item.id === selectedPersonalItem.id
              ? {
                  id: item.id,
                  location: newPersonalName || item.location,
                  value: newPersonalValue || item.value,
                  area: newPersonalExtra || item.area,
                }
              : item,
          ),
        );
      }

      resetPersonalForm();
      setShowPersonalEditModal(false);
      setSuccessModalTitle("Record Updated Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to update record:', error);
      Alert.alert('Error', 'Failed to update record');
    }
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
      console.error('Failed to delete record:', error);
      Alert.alert('Error', 'Failed to delete record');
    }
  };

  const handleAddPersonalItem = async () => {
    if (!newPersonalValue.trim() || !newPersonalName.trim()) {
      Alert.alert("Missing fields", "Please complete the required fields.");
      return;
    }

    try {
      if (selectedPersonalTab === "vehicles") {
        const vehicle = await PersonalAssetsService.createVehicle({
          name: newPersonalName,
          type: newPersonalType,
          value: newPersonalValue,
          plateNo: newPersonalExtra,
        });
        setVehicles((current) => [...current, vehicle]);
      } else if (selectedPersonalTab === "jewelleries") {
        const jewellery = await PersonalAssetsService.createJewellery({
          name: newPersonalName,
          value: newPersonalValue,
          weight: newPersonalExtra,
        });
        setJewelleries((current) => [...current, jewellery]);
      } else {
        const property = await PersonalAssetsService.createProperty({
          location: newPersonalName,
          value: newPersonalValue,
          area: newPersonalExtra,
        });
        setProperties((current) => [...current, property]);
      }

      resetPersonalForm();
      setShowAddPersonalModal(false);
      setSuccessModalTitle("Record Added Successfully!");
      setSuccessButtonText("Ok");
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Failed to add record:', error);
      Alert.alert('Error', 'Failed to add record');
    }
  };

  const renderPersonalView = () => {
    return (
      <View style={styles.personalContainer}>
        <View style={[styles.headerSection, styles.greetingContainer]}>
          <ThemedText type="subtitle" style={styles.greeting}>
            Hii {user?.name || "Admin"}, Welcome!
          </ThemedText>
        </View>

        <View style={styles.personalHeader}>
          <Pressable
            onPress={() => setSelectedView("dashboard")}
            style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
          >
            <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
          </Pressable>
          <ThemedText type="subtitle" style={styles.personalTitle}>
            Admin Profile
          </ThemedText>
        </View>

        <View style={[styles.tableCard, { marginTop: 16, backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Name</Text>
            <TextInput
              value={adminName}
              onChangeText={(text) => { setAdminName(text); setProfileError(""); }}
              placeholder="Enter name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={[styles.formLabel, { color: theme.text }]}>Email</Text>
            <TextInput
              value={adminEmail}
              onChangeText={(text) => { setAdminEmail(text); setProfileError(""); }}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          <View style={[styles.formRow, { marginBottom: 16 }]}>
            <Text style={[styles.formLabel, { color: theme.text }]}>New Password (Optional)</Text>
            <TextInput
              value={adminPassword}
              onChangeText={(text) => { setAdminPassword(text); setProfileError(""); }}
              placeholder="Enter new password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>
          {profileError ? (
            <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 8, marginTop: -8 }}>
              {profileError}
            </Text>
          ) : null}
          <Pressable onPress={handleUpdateAdminProfile} style={[styles.addSiteButton, { marginTop: 16 }]}>
            <Text style={styles.addSiteButtonText}>Save Changes</Text>
          </Pressable>
        </View>
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
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          {selectedPersonalTab === "vehicles" ? (
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Type</Text>
              <TextInput
                value={newPersonalType}
                onChangeText={setNewPersonalType}
                placeholder="Enter type"
                placeholderTextColor={theme.textSecondary}
                style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>{getPersonalExtraLabel()}</Text>
            <TextInput
              value={newPersonalExtra}
              onChangeText={setNewPersonalExtra}
              placeholder={`Enter ${getPersonalExtraLabel().toLowerCase()}`}
              placeholderTextColor={theme.textSecondary}
              style={[styles.formInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
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
            <Text style={[styles.formLabel, { color: theme.text }]}>Name</Text>
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
            style={[styles.rejectInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            placeholder="Enter reason..."
            placeholderTextColor={theme.textSecondary}
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
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.chemicalsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setChemicalSearch("");
          }}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.chemicalsTitle}>
          Chemicals
        </ThemedText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={chemicalSearch}
          onChangeText={setChemicalSearch}
          placeholder="Search Here"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
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
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.approvalsHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setApprovalSearch("");
          }}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.approvalsTitle}>
          Approvals
        </ThemedText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={approvalSearch}
          onChangeText={setApprovalSearch}
          placeholder="Search Here"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
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
                  {item.status?.toLowerCase() !== 'approved' && (
                  <Pressable
                    onPress={() => handleApproveApproval(item)}
                    style={[styles.actionButton, styles.approveButton]}
                  >
                    <Text style={styles.approveButtonText}>✓</Text>
                  </Pressable>
                  )}
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
    </View>
  );

  const renderWorkersView = () => (
    <View style={styles.workersContainer}>
      <View style={[styles.headerSection, styles.greetingContainer]}>
        <ThemedText type="subtitle" style={styles.greeting}>
          Hii {user?.name || "Admin"}, Welcome!
        </ThemedText>
      </View>
      <View style={styles.workersHeader}>
        <Pressable
          onPress={() => {
            setSelectedView("dashboard");
            setWorkerSearch("");
          }}
          style={[styles.backButton, { backgroundColor: theme.backgroundElement }]}
        >
          <Text style={[styles.backButtonIcon, { color: theme.text }]}>‹</Text>
        </Pressable>
        <ThemedText type="subtitle" style={styles.workersTitle}>
          Workers
        </ThemedText>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={workerSearch}
          onChangeText={setWorkerSearch}
          placeholder="Search Here"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <ScrollView
        style={styles.tableScrollContainer}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
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
                Status
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderCell,
                  styles.workerCellActions,
                ]}
              >
                Actions
              </Text>
            </View>

            {filteredWorkerData.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.workerCellID]}>
                  {item.id}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellName]}>
                  {item.name}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellSite]}>
                  {item.site}
                </Text>
                <Text style={[styles.tableCell, styles.workerCellType]}>
                  {item.status || item.type || item.role}
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

  return (
    <ThemedView style={styles.container}>
      {selectedView === "dashboard" ? (
        renderDashboardView()
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  headerSection: {
    marginBottom: Spacing.three,
    marginTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "600",
  },
  greetingContainer: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  siteTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.three,
    gap: Spacing.two,
    zIndex: 100,
  },
  siteSelectionContainer: {
    flex: 1,
    position: "relative",
  },
  siteDropdown: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  siteDropdownText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownIcon: {
    fontSize: 10,
  },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 200,
    zIndex: 9999,
  },
  siteOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  siteOptionText: {
    fontSize: 13,
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  workersTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  tableScrollContainer: {
    flex: 1,
    maxHeight: 500,
  },
  machineriesHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  assetsHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  chemicalsHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonIcon: {
    fontSize: 24,
    fontWeight: "600",
  },
  machineriesTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  assetsTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  chemicalsTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  personalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  personalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  machineriesSubtitle: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    color: "#8a8a8f",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1f1d21",
    padding: 0,
    minHeight: 22,
  },
  tableCard: {
    backgroundColor: "#ffffff",
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
    color: "#1f1d21",
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
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.four,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
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
    color: "#111",
  },
  modalClose: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    fontSize: 16,
    color: "#333",
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.three,
  },
  formLabel: {
    fontSize: 14,
    color: "#1f1d21",
    fontWeight: "600",
    flex: 0.35,
  },
  formInput: {
    flex: 0.65,
    backgroundColor: "#f2f2f6",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    color: "#1f1d21",
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
    backgroundColor: "#f2f2f6",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  logoUploadText: {
    color: "#1f1d21",
    fontSize: 14,
  },
  successModalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
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
    color: "#1f1d21",
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
    color: "#8a8a8f",
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
    color: "#333",
  },
  timeSection: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f1d21",
  },
  dateText: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  cardsContainer: {
    gap: Spacing.two,
    flex: 1,
    justifyContent: "space-between",
  },
  manageSiteContainer: {
    flex: 1,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  manageSiteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.four,
    position: "relative",
  },
  manageSiteTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  manageSiteCardsContainer: {
    gap: Spacing.four,
    alignItems: "center",
    paddingTop: Spacing.two,
  },
  manageSiteCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
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
    color: "#1f1d21",
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
    backgroundColor: "#ffffff",
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
    color: "#1f1d21",
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
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
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
    color: "#1f1d21",
  },
  approvalsContainer: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
    flex: 1,
  },
  approvalsHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.two,
    position: "relative",
  },
  approvalsTitle: {
    fontSize: 22,
    fontWeight: "700",
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
    backgroundColor: "#fff",
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
    color: "#1f1d21",
    fontSize: 14,
  },
  confirmModalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
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
    backgroundColor: "#ffffff",
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
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#d0d0d4",
    minHeight: 48,
  },
  assetsTableCell: {
    fontSize: 13,
    color: "#1f1d21",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  assetsTableHeaderCell: {
    fontWeight: "700",
    color: "#4f4f53",
    backgroundColor: "#f5f5f5",
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
    top: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
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
    backgroundColor: "#ffffff",
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
    minWidth: 120,
    paddingHorizontal: 8,
  },
  personalCellActions: {
    minWidth: 80,
    maxWidth: 90,
    paddingHorizontal: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.one,
  },
});
