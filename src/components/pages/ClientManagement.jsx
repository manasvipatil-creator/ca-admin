// src/components/pages/ClientManagement.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Form,
  Button,
  Table,
  Card,
  Row,
  Col,
  Modal,
  Pagination,
  Toast,
  ToastContainer,
  Badge,
  Spinner,
} from "react-bootstrap";
import {
  FiUsers,
  FiUserPlus,
  FiDownload,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiCalendar,
  FiFolder,
  FiPhone,
  FiMail,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiToggleLeft,
  FiToggleRight,
  FiUser,
  FiFilter,
  FiMaximize2,
  FiFileText,
  FiImage,
  FiFile,
  FiUploadCloud
} from 'react-icons/fi';
// LoadingBar removed
import BulkClientImport from '../BulkClientImport';
import { db, rtdb } from "../../firebase";
import { doc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { ref, set, remove, onValue, get } from "firebase/database";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from "firebase/storage";
import app from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { clientHelpers, yearsHelpers } from "../../utils/firestoreHelpers";
import { Alert } from 'react-bootstrap';

const UserManagement = ({ goToReports = () => { } }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    userEmail,
    getSafeEmail,
    getUserClientsRef,
    getClientDocRef,
    getUserClientPath,
  } = useAuth();
  const [users, setusers] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    pan: "",
    email: "",
    firmId: getSafeEmail(userEmail),
    // Year will only be added when explicitly set
  });
  const [editIndex, setEditIndex] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [docsUser, setDocsUser] = useState(null);
  const [docForm, setDocForm] = useState({
    documents: [
      {
        docName: "",
        year: "",
        fileName: "",
        file: null,
        localPreviewUrl: "",
      },
    ],
    selectedDocIndex: 0,
  });
  const [editingDocId, setEditingDocId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  // (deleted) legacy centered delete-success modal state removed to avoid duplicate popups
  const [showUpdateSuccessModal, setShowUpdateSuccessModal] = useState(false);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState("");

  // Loading states
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [showYearModal, setShowYearModal] = useState(false);
  const [showAddYearModal, setShowAddYearModal] = useState(false);
  const [newYearForm, setNewYearForm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocuments, setPreviewDocuments] = useState([]);
  const [clientCounts, setClientCounts] = useState({}); // Stores { years: 0, genericDocs: 0, loading: false } keyed by client ID
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteRecordInfo, setDeleteRecordInfo] = useState({ years: 0, documents: 0, total: 0 });

  const [loadingProgress, setLoadingProgress] = useState(0);

  // 🔹 Show Toast Notification
  const showSuccessToast = (message) => {
    console.log("📢 showSuccessToast called with message:", message);
    setToastMessage(message);
    setToastVariant("success");
    setShowToast(true);
    console.log(
      "📢 Toast state updated - showToast:",
      true,
      "variant:",
      "success"
    );
  };

  const showErrorToast = (message) => {
    console.log("📢 showErrorToast called with message:", message);
    setToastMessage(message);
    setToastVariant("danger");
    setShowToast(true);
    console.log(
      "📢 Toast state updated - showToast:",
      true,
      "variant:",
      "danger"
    );
  };

  // Show centered update modal when navigated back with a message in location.state
  useEffect(() => {
    try {
      const navMessage = location && location.state && location.state.message;
      const navType = location && location.state && location.state.type ? location.state.type : 'success';
      if (navMessage) {
        if (navType === 'success') {
          // Show centered modal only (avoid toast duplication)
          setUpdateSuccessMessage(navMessage);
          setShowUpdateSuccessModal(true);
          // auto-hide after 3 seconds
          setTimeout(() => setShowUpdateSuccessModal(false), 3000);
        } else {
          showErrorToast(navMessage);
        }

        // Clear navigation state so message doesn't reappear
        try {
          navigate(location.pathname, { replace: true, state: {} });
        } catch (e) {
          try { window.history.replaceState({}, document.title); } catch (err) { }
        }
      }
    } catch (e) {
      // ignore
    }
  }, [location, navigate]);

  // 🔹 Safe key for RTDB using name and year
  const makeNameKey = (name, year) =>
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[.#$\[\]/]/g, "")
      .replace(/\s+/g, "_") + (year ? `_${year} ` : "");

  // 🔹 Subscribe to users with real-time updates from Firestore
  useEffect(() => {
    if (!userEmail) {
      console.log("🔄 No user email, skipping users listener setup");
      setIsLoadingClients(false);
      return;
    }

    const clientsRef = getUserClientsRef();
    if (!clientsRef) {
      console.log("🔄 No clients reference, skipping users listener setup");
      setIsLoadingClients(false);
      return;
    }

    setIsLoadingClients(true);
    console.log("🔄 Setting up real-time Firestore clients listener...");
    const unsubscribe = clientHelpers.subscribeToClients(
      clientsRef,
      (clientsList) => {
        console.log(
          "📊 Firestore clients data updated:",
          clientsList.length,
          "clients"
        );
        setusers(clientsList);
        setIsLoadingClients(false);

        // Log document counts for debugging
        clientsList.forEach((client) => {
          if (client.documents) {
            const realDocs = Object.values(client.documents).filter(
              (doc) =>
                doc.fileName !== "placeholder.txt" &&
                (doc.docName || doc.name) &&
                !(doc.docName || doc.name).includes("Initial Setup")
            );
            const years = [...new Set(realDocs.map((doc) => doc.year))];
            console.log(
              `📅 ${client.name}: ${years.length} years, ${realDocs.length} documents`
            );
          }
        });
      },
      (error) => {
        console.error("❌ Firestore clients listener error:", error);
        setusers([]);
        setIsLoadingClients(false);
      }
    );

    return () => {
      console.log("🔄 Cleaning up Firestore clients listener");
      if (unsubscribe) unsubscribe();
    };
  }, [userEmail, getUserClientsRef]);

  // 🔹 Deduplicate users (Trust Firestore IDs for uniqueness)
  // We remove the aggressive Name/PAN deduplication which was hiding distinct database records.
  const uniqueusers = React.useMemo(() => users, [users]);

  const filteredusers = React.useMemo(() => uniqueusers.filter((User) => {
    const matchesSearch =
      !searchTerm ||
      User.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      User.contact?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      User.pan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      User.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesYear =
      !filterYear ||
      (User.documents &&
        Object.values(User.documents).some((doc) => doc.year === filterYear));

    return matchesSearch && matchesYear;
  }).sort((a, b) => (a.name || "").localeCompare(b.name || "")), [uniqueusers, searchTerm, filterYear]);

  // Check if search term matches an inactive client's PAN
  const inactiveClientMatch = React.useMemo(() => searchTerm && uniqueusers.find(
    (User) =>
      User.pan?.toLowerCase() === searchTerm.toLowerCase() &&
      User.isActive === false
  ), [searchTerm, uniqueusers]);

  // 🔹 Pagination setup
  const totalItems = filteredusers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageusers = React.useMemo(() => filteredusers.slice(startIndex, endIndex), [filteredusers, startIndex, endIndex]);

  // 🔹 Fetch counts for visible users (pagination optimization)
  useEffect(() => {
    const fetchVisibleCounts = async () => {
      if (pageusers.length === 0) return;

      // Identify which clients need counts (loading or not present)
      // We process all users on the page to ensure counts are always fresh
      const clientsToFetch = pageusers.filter(user => {
        const current = clientCounts[user.id];
        // Prevent duplicate fetches if already loading, otherwise always fetch
        return !current || !current.loading;
      });

      if (clientsToFetch.length === 0) return;

      // Set loading state for these clients
      setClientCounts(prev => {
        const next = { ...prev };
        clientsToFetch.forEach(user => {
          next[user.id] = { ... (next[user.id] || { years: 0, genericDocs: 0 }), loading: true };
        });
        return next;
      });

      // Fetch data in parallel
      const results = await Promise.all(
        clientsToFetch.map(async (user) => {
          try {
            // 1. YEARS count: Trust the 'years' array on the client document (fast & consistent with YearManagement)
            const yearsCount = Array.isArray(user.years) ? user.years.length : 0;

            // 2. DOCS count: Fetch generic documents subcollection
            let genericDocsCount = 0;
            const safeEmail = getSafeEmail(userEmail);

            if (safeEmail && user.id) {
              const clientDocRef = doc(db, 'ca_admin', safeEmail, 'clients', user.id);
              const genericRef = collection(clientDocRef, 'genericDocuments');
              const genericSnap = await getDocs(genericRef);
              genericDocsCount = genericSnap.size;
            }

            console.log(`📊 Counts for ${user.name}: Years=${yearsCount} (from array), Docs=${genericDocsCount}`);

            return {
              id: user.id,
              years: yearsCount,
              genericDocs: genericDocsCount
            };
          } catch (error) {
            console.error(`❌ Error fetching counts for ${user.id}: `, error);
            // Fallback: show 0 if error, but try to keep years from prop if possible
            return {
              id: user.id,
              years: Array.isArray(user.years) ? user.years.length : 0,
              genericDocs: 0,
              error: true
            };
          }
        })
      );

      // Update state
      setClientCounts(prev => {
        const next = { ...prev };
        results.forEach(res => {
          next[res.id] = {
            years: res.years,
            genericDocs: res.genericDocs,
            loading: false
          };
        });
        return next;
      });
    };

    fetchVisibleCounts();
  }, [pageusers, getClientDocRef]); // Re-run when page users change

  // 🔹 Handle edit document from Reports page
  useEffect(() => {
    const editDocId = localStorage.getItem("editDocumentId");
    const editClientId = localStorage.getItem("editClientId");

    if (editDocId && editClientId && users.length > 0) {
      // Find the Client
      const client = users.find((c) => c.id === editClientId);
      if (client && client.documents && client.documents[editDocId]) {
        const doc = client.documents[editDocId];

        // Set up the document form for editing
        setDocForm({
          documents: [
            {
              docName: doc.name || "",
              year: doc.year || "",
              fileName: doc.fileName || "",
              file: null,
              localPreviewUrl: "",
            },
          ],
          selectedDocIndex: 0,
        });

        // Set editing mode
        setEditingDocId(editDocId);

        // Navigate to document management page
        navigate("/admin/documents", {
          state: { client },
        });

        // Clean up localStorage
        localStorage.removeItem("editDocumentId");
        localStorage.removeItem("editClientId");
        localStorage.removeItem("navTo");
      }
    }
  }, [users]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // 🔹 Add or Update User in Firestore
  const handleAddOrUpdate = async () => {
    if (!formData.name || !formData.pan || !userEmail) {
      showErrorToast("❌ Name and PAN are required fields.");
      return;
    }

    const clientsRef = getUserClientsRef();
    if (!clientsRef) {
      console.error("❌ Unable to determine clients reference");
      showErrorToast("❌ Unable to determine user path. Please try again.");
      return;
    }

    setIsSavingClient(true);
    try {
      console.log("💾 Saving Client to Firestore:", formData.name);
      console.log("📋 Client data:", formData);

      if (editIndex !== null) {
        // Update existing client
        const target = users[editIndex];
        const clientDocRef = getClientDocRef(target.id); // target.id is the PAN
        if (!clientDocRef) {
          showErrorToast("❌ Unable to get client reference for update.");
          return;
        }

        await clientHelpers.updateClient(clientDocRef, formData);
        console.log("✏️ Client updated successfully");
        // Use centered success modal instead of a toast for updates
        setUpdateSuccessMessage(`Client "${formData.name}" updated successfully!`);
        setShowUpdateSuccessModal(true);
        setTimeout(() => setShowUpdateSuccessModal(false), 3000);
        setEditIndex(null);
      } else {
        // Create new client
        await clientHelpers.createClient(clientsRef, formData);
        console.log("➕ New Client added to Firestore:", formData.name);
        // Use centered modal instead of a toast for creation
        setUpdateSuccessMessage('Client added successfully!');
        setShowUpdateSuccessModal(true);
        setTimeout(() => setShowUpdateSuccessModal(false), 3000);
      }

      setFormData({
        name: "",
        contact: "",
        pan: "",
        email: "",
        firmId: getSafeEmail(userEmail),
      });
      setShowForm(false);
    } catch (e) {
      console.error("❌ Failed to save Client", e);
      showErrorToast(`❌ Failed to save client: ${e.message} `);
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleEdit = (client) => {
    navigate("/admin/clients/edit", {
      state: { client, editIndex: client.id },
    });
  };

  const handleDelete = async (client) => {
    const target = client;
    if (!target?.id || !userEmail) return;

    // Count total documents and years for this client
    const yearsCount = target?.years?.length || 0;
    const documentsCount = target.documents ? Object.keys(target.documents).length : 0;
    const totalRecords = yearsCount + documentsCount;

    // Set delete target and show custom modal
    setDeleteTarget({ client: target });
    setDeleteRecordInfo({ years: yearsCount, documents: documentsCount, total: totalRecords });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { client: target } = deleteTarget;

    setIsDeletingClient(true);

    // ⚡ OPTIMISTIC UPDATE: Remove from UI immediately
    setusers(prevUsers => prevUsers.filter(user =>
      user.id !== target.id &&
      user.contact !== target.contact &&
      user.pan !== target.pan
    ));
    setShowDeleteModal(false); // Close modal immediately

    // ⚡ INSTANT FEEDBACK: Show success toast immediately
    showSuccessToast("Client \"" + target.name + "\" has been deleted.");

    // Start Loading Spinner
    setLoadingProgress(30);

    try {
      console.log("🗑️ Starting client deletion process for:", target.name);

      const safeEmail = getSafeEmail(userEmail);
      if (!safeEmail) {
        throw new Error("Cannot determine user email path");
      }

      // 1. FIRST DELETE FROM FIRESTORE
      let deletedFromFirestore = false;

      try {
        if (target.id) {
          console.log("🗑️ Attempting to delete client with ID:", target.id);
          const clientDocRef = doc(db, "ca_admin", safeEmail, "clients", target.id);

          await clientHelpers.deleteClient(clientDocRef);
          deletedFromFirestore = true;
          console.log("✅ Deleted from Firestore using direct ID");
        }

        if (!deletedFromFirestore) {
          console.warn("⚠️ Direct deletion failed or no ID. Trying fallback IDs...");
          const possibleIds = [
            target.contact ? target.contact.replace(/\D/g, '') : null,
            target.pan
          ].filter(Boolean);

          for (const docId of possibleIds) {
            if (docId === target.id) continue;
            try {
              const docRef = doc(db, "ca_admin", safeEmail, "clients", docId);
              await clientHelpers.deleteClient(docRef);
              console.log("✅ Deleted with fallback ID:", docId);
              deletedFromFirestore = true;
              break;
            } catch (err) {
              console.log("⚠️ Fallback failed for", docId, ":", err.message);
            }
          }
        }
      } catch (firestoreError) {
        console.error("❌ Firestore error:", firestoreError);
      }

      // ⚡ IMMEDIATE UI UNBLOCK: Hide spinner now that primary DB record is gone.
      // We let Storage and RTDB cleanup continue in the "background" without blocking the user.
      setLoadingProgress(0);

      // 2. DELETE STORAGE FILES
      try {
        const storage = getStorage();
        const deleteStoragePath = async (path) => {
          try {
            const folderRef = storageRef(storage, path);
            const fileList = await listAll(folderRef);
            const deletePromises = fileList.items.map(itemRef =>
              deleteObject(itemRef).catch(err =>
                console.warn("⚠️ Could not delete file " + itemRef.fullPath + ":", err.message)
              )
            );
            for (const subFolderRef of fileList.prefixes) {
              await deleteStoragePath(subFolderRef.fullPath);
            }
            await Promise.all(deletePromises);
            console.log("✅ Deleted storage path:", path);
            return true;
          } catch (error) {
            console.log("ℹ️ Storage path " + path + " not found or empty:", error.message);
            return false;
          }
        };

        const storagePaths = [
          "documents/" + target.name,
          "documents/" + target.contact,
          "documents/" + target.pan,
          safeEmail + "/clients/" + target.contact,
          safeEmail + "/clients/" + target.pan,
          safeEmail + "/clients/" + target.id,
        ].filter(path => path && !path.includes('undefined'));

        for (const path of storagePaths) {
          await deleteStoragePath(path);
        }
      } catch (storageError) {
        console.warn("⚠️ Storage cleanup warning:", storageError);
      }

      // 3. DELETE FROM REALTIME DATABASE (if exists)
      try {
        const userClientPath = getUserClientPath();
        if (userClientPath) {
          const possibleKeys = [
            target.contact,
            target.pan,
            target.id,
            target.name ? target.name.toLowerCase().replace(/\s+/g, '_') : null
          ].filter(Boolean);

          for (const key of possibleKeys) {
            try {
              const rtdbRef = ref(rtdb, userClientPath + "/" + key);
              await remove(rtdbRef);
              console.log("✅ Deleted from RTDB path:", userClientPath + "/" + key);
            } catch (rtdbError) {
              console.log("ℹ️ RTDB path " + key + " not found:", rtdbError.message);
            }
          }
        }
      } catch (rtdbError) {
        console.warn("⚠️ RTDB cleanup warning:", rtdbError);
      }

      // 4. CLEAN UP LOCAL STATE
      setClientCounts(prevCounts => {
        const newCounts = { ...prevCounts };
        delete newCounts[target.id];
        delete newCounts[target.pan];
        return newCounts;
      });

      if (selectedUser?.id === target.id) {
        setShowYearModal(false);
        setSelectedUser(null);
      }
      if (docsUser?.id === target.id) {
        setShowDocs(false);
        setDocsUser(null);
      }
      setShowPreviewModal(false);

      console.log("✅ Client deletion process completed");
    } catch (e) {
      console.error("❌ Critical deletion error:", e);
      let errorMessage = "Failed to delete client";
      if (e.message.includes('permission')) {
        errorMessage = "Permission denied.";
      } else if (e.message.includes('network')) {
        errorMessage = "Network error.";
      }
      showErrorToast("❌ " + errorMessage);
      showErrorToast("❌ " + errorMessage);
      setLoadingProgress(0);
    } finally {
      setIsDeletingClient(false);
      setShowDeleteModal(false);
    }
  };

  //   const confirmDelete = async () => {
  //     if (!deleteTarget) return;

  //     const { client: target } = deleteTarget;
  //     const { total: totalRecords } = deleteRecordInfo;

  //     setIsDeletingClient(true);
  //     setIsDeletingClient(true);
  //     // Modal will remain open while deleting


  //     try {
  //       console.log("🗑️ Starting client deletion process for:", target.name);
  //       console.log("📋 Client data:", {
  //         id: target.id,
  //         contact: target.contact,
  //         pan: target.pan,
  //         name: target.name
  //       });

  //       // Delete from RTDB (old structure) if exists
  //       // Delete from RTDB (old structure) if exists
  //       /* 
  //       try {
  //         const userClientPath = getUserClientPath();
  //         if (userClientPath) {
  //           const clientContact = target.contact || target.id;
  //           const rtdbClientRef = ref(rtdb, `${ userClientPath }/${clientContact}`);
  //           await remove(rtdbClientRef);
  //           console.log("✅ Deleted client data from RTDB");
  //         }
  //       } catch (rtdbError) {
  //         console.warn("⚠️ RTDB cleanup had issues:", rtdbError);
  //       }
  //       */

  //       // Delete all files from Firebase Storage for this client
  //       try {
  //         const storage = getStorage();
  //         const clientName = target.name || target.id;
  //         const clientContact = target.contact || target.id;

  //         // Try to delete from multiple possible storage paths
  //         const possiblePaths = [
  //           `documents/${clientName}`,
  //           `documents/${clientContact}`,
  //           `${getSafeEmail(userEmail)}/clients/${clientContact}`,
  //         ];

  //         for (const path of possiblePaths) {
  //           try {
  //             console.log("🔍 Checking storage path:", path);
  //             const folderRef = storageRef(storage, path);
  //             const fileList = await listAll(folderRef);

  //             // Delete all files in the folder
  //             for (const itemRef of fileList.items) {
  //               try {
  //                 await deleteObject(itemRef);
  //                 console.log("✅ Deleted file:", itemRef.fullPath);
  //               } catch (fileError) {
  //                 console.warn("⚠️ Could not delete file:", itemRef.fullPath, fileError);
  //               }
  //             }

  //             // Recursively delete subfolders
  //             for (const folderRef of fileList.prefixes) {
  //               try {
  //                 const subFileList = await listAll(folderRef);
  //                 for (const itemRef of subFileList.items) {
  //                   try {
  //                     await deleteObject(itemRef);
  //                     console.log("✅ Deleted file:", itemRef.fullPath);
  //                   } catch (fileError) {
  //                     console.warn("⚠️ Could not delete file:", itemRef.fullPath, fileError);
  //                   }
  //                 }
  //               } catch (subFolderError) {
  //                 console.warn("⚠️ Could not access subfolder:", folderRef.fullPath, subFolderError);
  //               }
  //             }

  //             console.log("✅ Cleaned up storage path:", path);
  //           } catch (pathError) {
  //             console.log("ℹ️ Path not found or empty:", path);
  //           }
  //         }
  //       } catch (storageError) {
  //         console.warn("⚠️ Storage cleanup had issues:", storageError);
  //         // Continue with Firestore deletion even if storage cleanup fails
  //       }

  //     try {
  //   // Get the correct client ID - check what identifier you're actually using
  //   const clientId = target.id || target.pan || target.contact;

  //   if (!clientId) {
  //     showErrorToast("❌ Cannot identify client for deletion.");
  //     return;
  //   }

  //   // Method 1: Use your clientHelpers
  //   const clientDocRef = getClientDocRef(clientId);
  //   if (clientDocRef) {
  //     await clientHelpers.deleteClient(clientDocRef);
  //     console.log("✅ Client deleted from Firestore via clientHelpers");
  //   }

  //   // Method 2: Direct Firestore deletion (as fallback)
  //   const safeEmail = getSafeEmail(userEmail);
  //   if (safeEmail) {
  //     // Try multiple possible ID formats
  //     const possibleIds = [
  //       clientId,
  //       target.pan,
  //       target.contact?.replace(/\D/g, ''),
  //       target.name?.toLowerCase().replace(/\s+/g, '_')
  //     ].filter(Boolean);

  //     for (const id of possibleIds) {
  //       try {
  //         const clientDocPath = doc(db, "ca_admin", safeEmail, "clients", id);
  //         await deleteDoc(clientDocPath);
  //         console.log(`✅ Deleted from Firestore path: clients/${id}`);
  //       } catch (err) {
  //         // Document might not exist at this path, continue
  //       }
  //     }
  //   }

  //   // Method 3: Delete from Realtime Database if still used
  //   try {
  //     const userClientPath = getUserClientPath();
  //     if (userClientPath) {
  //       // Try different keys
  //       const possibleKeys = [
  //         target.contact,
  //         target.pan,
  //         target.name?.toLowerCase().replace(/\s+/g, '_')
  //       ].filter(Boolean);

  //       for (const key of possibleKeys) {
  //         try {
  //           const rtdbRef = ref(rtdb, `${userClientPath}/${key}`);
  //           await remove(rtdbRef);
  //           console.log(`✅ Deleted from RTDB: ${key}`);
  //         } catch (rtdbErr) {
  //           // Continue
  //         }
  //       }
  //     }
  //   } catch (rtdbError) {
  //     console.warn("⚠️ RTDB cleanup warning:", rtdbError);
  //   }
  // } catch (firestoreError) {
  //   console.error("❌ Firestore deletion error:", firestoreError);
  //   showErrorToast(`❌ Failed to delete from database: ${firestoreError.message}`);
  //   return;
  // }

  //       await clientHelpers.deleteClient(clientDocRef);

  //       // Force delete the specific document path requested by user to ensure cleanup
  //       // Path: ca_admin/{safeEmail}/clients/{contact}
  //       try {
  //         const safeEmail = getSafeEmail(userEmail);
  //         const contactId = target.contact ? target.contact.replace(/\D/g, '') : target.id;

  //         if (safeEmail && contactId) {
  //           console.log(`🗑️ Force cleanup checking: ca_admin/${safeEmail}/clients/${contactId}`);
  //           const specificDocRef = doc(db, "ca_admin", safeEmail, "clients", contactId);
  //           await deleteDoc(specificDocRef);
  //           console.log("✅ Force cleanup executed for client document");
  //         }
  //       } catch (forceError) {
  //         console.warn("⚠️ Force cleanup warning (might have already been deleted):", forceError);
  //       }

  //       // Clear the deleted client from clientCounts state
  //       setClientCounts(prevCounts => {
  //         const newCounts = { ...prevCounts };
  //         delete newCounts[target.id];
  //         return newCounts;
  //       });

  //       showSuccessToast(`Client "${target.name}" deleted successfully! ${totalRecords} ${totalRecords === 1 ? 'record' : 'records'} removed.`);
  //       console.log("✅ Client deletion completed successfully");
  //     } catch (e) {
  //       console.error("❌ Failed to delete client", e);
  //       showErrorToast(`❌ Failed to delete client: ${e.message}`);
  //     } finally {
  //       setIsDeletingClient(false);
  //       setShowDeleteModal(false); // Close modal only after completion
  //     }
  //   };

  const handleToggleActive = async (client) => {
    const target = client;
    if (!target?.id || !userEmail) return;

    // If isActive is undefined, treat it as true (active)
    const currentStatus = target.isActive !== false;
    const newStatus = !currentStatus;
    const statusText = newStatus ? "active" : "inactive";

    try {
      const clientDocRef = getClientDocRef(target.id);
      if (!clientDocRef) {
        showErrorToast("❌ Unable to get client reference. Please try again.");
        return;
      }

      await clientHelpers.updateClient(clientDocRef, {
        isActive: newStatus
      });

      showSuccessToast(`Client "${target.name}" marked as ${statusText}!`);
      console.log(`✅ Client ${target.name} is now ${statusText}. Firebase updated with isActive: ${newStatus}`);
    } catch (e) {
      console.error("❌ Failed to update client status", e);
      showErrorToast("❌ Failed to update client status. Please try again.");
    }
  };

  const handleNew = () => {
    navigate("/admin/clients/new", {
      state: { client: null, editIndex: null },
    });
  };

  const handleBulkImportComplete = () => {
    setShowBulkImportModal(false);
    showSuccessToast('Bulk import completed successfully!');
  };

  // 🔹 Clean up all placeholder documents from all users
  const cleanupAllPlaceholders = async () => {
    try {
      let totalRemoved = 0;

      for (const User of users) {
        if (User.documents) {
          const updatedDocuments = { ...User.documents };
          let removedCount = 0;

          // Remove all placeholder documents
          Object.keys(updatedDocuments).forEach((docId) => {
            const doc = updatedDocuments[docId];
            if (
              doc.fileName === "placeholder.txt" ||
              (doc.docName && doc.docName.includes("Initial Setup")) ||
              (doc.name && doc.name.includes("Initial Setup"))
            ) {
              delete updatedDocuments[docId];
              removedCount++;
            }
          });

          if (removedCount > 0) {
            // Update Firebase in user-specific structure
            const userClientPath = getUserClientPath();
            if (userClientPath) {
              const UserKey = User.id || User.name;
              await set(
                ref(rtdb, `${userClientPath}/${UserKey}/documents`),
                updatedDocuments
              );
              totalRemoved += removedCount;
              console.log(
                `🧹 Removed ${removedCount} placeholder documents from ${User.name}`
              );
            }
          }
        }
      }

      if (totalRemoved > 0) {
        showSuccessToast(
          `🧹 Removed ${totalRemoved} placeholder documents from all users!`
        );
      } else {
        showSuccessToast("No placeholder documents found to remove.");
      }
    } catch (error) {
      console.error("❌ Failed to cleanup placeholder documents:", error);
      showErrorToast("Failed to cleanup placeholder documents.");
    }
  };

  // 🔹 Clean up duplicate users in Firebase
  const cleanupDuplicates = async () => {
    try {
      const duplicateGroups = {};

      // Group users by name + PAN
      users.forEach((User) => {
        const key = `${User.name?.toLowerCase()}_${User.pan?.toLowerCase()}`;
        if (!duplicateGroups[key]) {
          duplicateGroups[key] = [];
        }
        duplicateGroups[key].push(User);
      });

      // Process groups with duplicates
      for (const [key, group] of Object.entries(duplicateGroups)) {
        if (group.length > 1) {
          console.log(
            `🔄 Found ${group.length} duplicates for: ${group[0].name}`
          );

          // Keep the first User, merge documents, delete others
          const primaryUser = group[0];
          const mergedDocuments = { ...primaryUser.documents };

          // Merge documents from all duplicates
          for (let i = 1; i < group.length; i++) {
            const duplicate = group[i];
            if (duplicate.documents) {
              Object.assign(mergedDocuments, duplicate.documents);
            }

            // Delete duplicate User from Firebase CA Firm structure
            await remove(ref(rtdb, `CA Firm/Admin/Users/${duplicate.id}`));
            console.log(`🗑️ Removed duplicate User: ${duplicate.id}`);
          }

          // Update primary User with merged documents in CA Firm structure
          await set(ref(rtdb, `CA Firm/Admin/Users/${primaryUser.id}`), {
            ...primaryUser,
            documents: mergedDocuments,
          });
          console.log(`✅ Updated primary User: ${primaryUser.id}`);
        }
      }

      console.log("✅ Duplicate cleanup completed");
    } catch (error) {
      console.error("❌ Failed to cleanup duplicates:", error);
    }
  };



  // Reset to page 1 when search/filter changes, but not when users are updated
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterYear, pageSize]);

  // Calculate summary statistics using deduplicated users
  const totalusers = uniqueusers.length;
  const totalDocuments = uniqueusers.reduce((total, User) => {
    return total + (User.documents ? Object.keys(User.documents).length : 0);
  }, 0);

  const documentsByYear = {};
  uniqueusers.forEach((User) => {
    if (User.documents) {
      Object.values(User.documents).forEach((doc) => {
        const year = doc.year || "No Year";
        documentsByYear[year] = (documentsByYear[year] || 0) + 1;
      });
    }
  });

  return (
    <div style={{
      padding: '16px 24px',
      background: '#f1f5f9',
      height: 'calc(100vh - 150px)',
      width: '100%',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {loadingProgress > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 99999,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <Spinner animation="border" variant="primary" role="status" style={{ width: '3rem', height: '3rem', borderWidth: '4px' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <div className="mt-3 fw-bold text-primary">Processing...</div>
        </div>
      )}
      {/* 🔹 Compact Header & Actions Row */}
      <div className="d-flex justify-content-between align-items-center mb-3" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '12px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <div className="d-flex align-items-center gap-3">
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}>
            <FiUsers size={20} color="white" />
          </div>
          <div>
            <h5 className="mb-0" style={{ color: '#0f172a', fontWeight: '700', fontSize: '1.1rem' }}>
              Client Management
            </h5>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Total: <strong>{totalItems}</strong> clients
              </span>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowBulkImportModal(true)}
            variant="outline-secondary"
            style={{
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FiDownload size={14} /> Import
          </Button>
          <Button
            size="sm"
            onClick={handleNew}
            style={{
              background: '#4f46e5',
              borderColor: '#4f46e5',
              fontSize: '0.85rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
            }}
          >
            <FiUserPlus size={14} /> Add Client
          </Button>
        </div>
      </div>

      {/* 🔹 Form (kept mostly same but container tighter) */}
      {showForm && (
        <Card className="mb-3 border-0 shadow-sm" style={{ borderRadius: '8px' }}>
          <Card.Body className="p-3">
            <h6 className="mb-3 text-primary fw-bold" style={{ fontSize: '0.95rem' }}>{editIndex !== null ? 'Edit Client' : 'New Client Details'}</h6>
            <Form>
              <Row className="g-2">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Client Name *</Form.Label>
                    <Form.Control size="sm" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter name" required />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Year *</Form.Label>
                    <Form.Control size="sm" type="number" name="year" value={formData.year} onChange={handleChange} placeholder="2024" />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Contact</Form.Label>
                    <Form.Control size="sm" type="text" name="contact" value={formData.contact} onChange={handleChange} placeholder="Phone" />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">PAN</Form.Label>
                    <Form.Control size="sm" type="text" name="pan" value={formData.pan} onChange={handleChange} placeholder="PAN Number" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted mb-1">Email</Form.Label>
                    <Form.Control size="sm" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <Button size="sm" variant="light" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddOrUpdate} disabled={isSavingClient}>
                  {isSavingClient ? 'Saving...' : (editIndex !== null ? "Update" : "Save")}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {/* 🔹 Compact Search & Filter Bar */}
      <div className="mb-3" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '8px 16px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <FiSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <Form.Control
            type="text"
            size="sm"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '36px', borderRadius: '6px', fontSize: '0.9rem', border: '1px solid #cbd5e1' }}
          />
        </div>

        <div className="d-flex align-items-center gap-3">
          {inactiveClientMatch && (
            <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1 px-2 py-1">
              ⚠️ Found Inactive: {inactiveClientMatch.name}
            </Badge>
          )}

          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Rows:</span>
            <Form.Select
              size="sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) || 10)}
              style={{ width: '70px', fontSize: '0.85rem' }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Form.Select>
          </div>
        </div>
      </div>

      {/* 🔹 Scrollable Table Container */}
      <Card className="border-0 shadow-sm" style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px'
      }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Table hover responsive className="align-middle mb-0" style={{ fontSize: '0.85rem' }}>
            <thead style={{
              background: '#f8fafc',
              borderBottom: '2px solid #e2e8f0',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <tr>
                <th className="py-2 px-3 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black', width: '4%' }}>Sr No.</th>
                <th className="py-2 px-3 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black', width: '20%' }}>Client Name</th>
                <th className="py-2 px-3 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black', width: '15%' }}>Contact Info</th>
                <th className="py-2 px-3 text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black' }}>PAN</th>
                <th className="py-2 px-3 text-center text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black' }}>Status</th>
                <th className="py-2 px-3 text-center text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black' }}>Years</th>
                <th className="py-2 px-3 text-center text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black' }}>Docs</th>
                <th className="py-2 px-3 text-center text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'black', width: '15%' }}>Actions</th>
              </tr>
            </thead >
            <tbody>
              {isLoadingClients ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-5"
                    style={{ color: "#64748b" }}
                  >
                    <div className="d-flex flex-column align-items-center">
                      <div className="spinner-border text-primary mb-2" role="status" style={{ width: "2rem", height: "2rem" }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <div className="small">Loading clients...</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pageusers.map((User, index) => (
                  <tr
                    key={index}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background-color 0.2s ease"
                    }}
                  >
                    <td className="py-2 px-3 text-center" style={{ color: "#64748b", fontWeight: "500" }}>
                      {startIndex + index + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="d-flex align-items-center gap-2">
                        <div style={{ fontWeight: "600", color: "#334155" }}>{User.name}</div>
                        {User.isActive === false && (
                          <Badge bg="secondary" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>Inactive</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.8rem", color: "#475569" }}>
                          <FiPhone size={12} className="text-primary" />
                          <span>{User.contact}</span>
                        </div>
                        {User.email && (
                          <div className="d-flex align-items-center gap-2" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            <FiMail size={12} />
                            <span className="text-truncate" style={{ maxWidth: "150px" }} title={User.email}>{User.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#475569",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        fontFamily: "monospace"
                      }}>
                        {User.pan}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className={`d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill ${User.isActive !== false ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: '0.7rem', fontWeight: '600' }}>
                        {User.isActive !== false ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />}
                        <span>{User.isActive !== false ? "Active" : "Inactive"}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {(() => {
                        const counts = clientCounts[User.id] || { years: 0, genericDocs: 0, loading: true };
                        const count = counts.years;
                        const isLoading = counts.loading;

                        return (
                          <Button
                            variant="white"
                            size="sm"
                            className="border-0 p-1 position-relative"
                            onClick={() => navigate("/admin/years", { state: { client: User } })}
                            disabled={isLoading}
                            style={{ color: count > 0 ? "#4f46e5" : "#cbd5e1" }}
                          >
                            {isLoading ? (
                              <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem' }} />
                            ) : (
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                <FiCalendar size={16} />
                                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{count}</span>
                              </div>
                            )}
                          </Button>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {(() => {
                        const counts = clientCounts[User.id] || { years: 0, genericDocs: 0, loading: true };
                        const genericCount = counts.genericDocs;
                        const isLoading = counts.loading;

                        return (
                          <Button
                            variant="white"
                            size="sm"
                            className="border-0 p-1"
                            onClick={() => navigate("/admin/generic-documents", { state: { client: User } })}
                            disabled={isLoading}
                            style={{ color: genericCount > 0 ? "#059669" : "#cbd5e1" }}
                          >
                            {isLoading ? (
                              <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem' }} />
                            ) : (
                              <div className="d-flex align-items-center justify-content-center gap-1">
                                <FiFolder size={16} />
                                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{genericCount}</span>
                              </div>
                            )}
                          </Button>
                        );
                      })()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="d-flex justify-content-center gap-2">
                        <Button
                          size="sm"
                          variant="light"
                          className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '28px', height: '28px', color: User.isActive !== false ? '#dc2626' : '#16a34a' }}
                          onClick={() => handleToggleActive(User)}
                          title={User.isActive !== false ? "Deactivate" : "Activate"}
                        >
                          {User.isActive !== false ? <FiXCircle size={14} /> : <FiCheckCircle size={14} />}
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '28px', height: '28px', color: '#d97706' }}
                          onClick={() => handleEdit(User)}
                          title="Edit"
                        >
                          <FiEdit2 size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="p-1 rounded-circle d-flex align-items-center justify-content-center"
                          style={{ width: '28px', height: '28px', color: '#ef4444' }}
                          onClick={() => handleDelete(User)}
                          title="Delete"
                        >
                          <FiTrash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {!isLoadingClients && users.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="text-muted d-flex flex-column align-items-center">
                      <FiUsers size={32} className="mb-2 opacity-50" />
                      <h6 className="mb-1">No clients found</h6>
                      <small>Add your first client to get started</small>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>


        {/* 🔹 Pagination Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
            {totalItems > 0
              ? `Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems} clients`
              : "No clients found"}
          </div>

          <Pagination className="mb-0" size="sm" style={{ gap: '4px' }}>
            <Pagination.First
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(1)}
              style={{ borderRadius: '6px' }}
            />
            <Pagination.Prev
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ borderRadius: '6px' }}
            />

            {Array.from({ length: totalPages })
              .slice(0, 7)
              .map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Pagination.Item
                    key={pageNum}
                    active={pageNum === safeCurrentPage}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}

            {totalPages > 7 && <Pagination.Ellipsis disabled />}

            {totalPages > 7 && (
              <Pagination.Item
                active={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                {totalPages}
              </Pagination.Item>
            )}

            <Pagination.Next
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ borderRadius: '6px' }}
            />
            <Pagination.Last
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ borderRadius: '6px' }}
            />
          </Pagination>
        </div>
      </Card>

      {/* 🔹 Documents Modal */}
      <Modal
        show={showDocs}
        onHide={() => {
          setShowDocs(false);
          setFilterYear(""); // Clear year filter when closing modal
          setEditingDocId(null);
        }}
        centered
        size="xl"
        contentClassName="border-0 shadow-lg"
      >
        <Modal.Header closeButton style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '16px 24px' }}>
          <div className="w-100 d-flex flex-column gap-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <Modal.Title style={{ fontWeight: '700', color: '#1e293b', fontSize: '1.25rem' }}>
                  Document Management
                </Modal.Title>
                <div className="mt-1 d-flex align-items-center gap-3 text-muted" style={{ fontSize: '0.9rem' }}>
                  <div className="d-flex align-items-center gap-1">
                    <FiUser size={14} />
                    <span className="fw-semibold text-dark">{docsUser?.name}</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <FiPhone size={14} />
                    <span>{docsUser?.contact}</span>
                  </div>
                  {docsUser?.email && (
                    <div className="d-flex align-items-center gap-1">
                      <FiMail size={14} />
                      <span>{docsUser?.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
              <div className="d-flex align-items-center gap-2">
                {filterYear ? (
                  <Badge bg="warning" text="dark" className="d-flex align-items-center gap-2 px-3 py-2">
                    <span>Filter: {filterYear}</span>
                    <i className="bi bi-x-circle cursor-pointer" onClick={() => setFilterYear("")} style={{ cursor: 'pointer' }} title="Clear filter"></i>
                  </Badge>
                ) : (
                  <span className="text-muted small ms-2">Showing all years</span>
                )}
              </div>
              <div className="d-flex gap-2">
                {filterYear && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setFilterYear("")}
                    className="d-flex align-items-center gap-2"
                  >
                    <FiFilter size={14} /> Clear Filter
                  </Button>
                )}
                <Button
                  variant="success"
                  size="sm"
                  className="d-flex align-items-center gap-2 shadow-sm"
                  onClick={() => {
                    const documentData = docsUser?.documents
                      ? Object.entries(docsUser.documents).map(([id, doc]) => ({
                        id,
                        name: doc.name,
                        year: doc.year,
                        fileName: doc.fileName,
                        fileUrl: doc.fileUrl,
                        fileData: doc.fileData,
                        fileSize: doc.fileSize,
                        fileType: doc.fileType,
                        uploadedAt: doc.uploadedAt || doc.createdAt,
                      }))
                      : [];
                    setPreviewDocuments(documentData);
                    setShowPreviewModal(true);
                  }}
                >
                  <FiDownload size={14} /> Save All PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="d-flex align-items-center gap-2 shadow-sm"
                  onClick={() => {
                    const docs = docsUser?.documents
                      ? Object.entries(docsUser.documents).map(([id, doc]) => ({
                        id,
                        name: doc.name,
                        year: doc.year,
                        fileName: doc.fileName,
                        fileUrl: doc.fileUrl,
                        fileData: doc.fileData,
                        fileSize: doc.fileSize,
                        fileType: doc.fileType,
                        uploadedAt: doc.uploadedAt || doc.createdAt,
                      }))
                      : [];
                    setPreviewDocuments(docs);
                    setShowPreviewModal(true);
                  }}
                >
                  <FiEye size={14} /> Preview All
                </Button>
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body style={{ background: '#f8fafc' }}>
          {/* Add Multiple Documents Form */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h5 className="mb-0 text-dark fw-bold" style={{ fontSize: '1.1rem' }}>
              {editingDocId ? "✏️ Edit Document" : "➕ Add New Documents"}
            </h5>

            {!editingDocId && docForm.documents.length > 1 && (
              <div className="d-flex flex-wrap gap-2">
                {docForm.documents.map((doc, index) => (
                  <Button
                    key={index}
                    variant={index === docForm.selectedDocIndex ? "primary" : "white"}
                    size="sm"
                    onClick={() => setDocForm({ ...docForm, selectedDocIndex: index })}
                    style={{
                      border: '1px solid #e2e8f0',
                      boxShadow: index === docForm.selectedDocIndex ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none',
                      color: index === docForm.selectedDocIndex ? 'white' : '#64748b'
                    }}
                  >
                    📄 Doc {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <Form>
            <Row className="g-4">
              <Col md={5}>
                {/* Current Document Form */}
                <Card className="border-0 shadow-sm mb-3">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0 fw-bold text-primary">
                        📝 Document Details
                      </h6>
                      {!editingDocId && docForm.documents.length > 1 && (
                        <Button
                          variant="light"
                          size="sm"
                          className="text-danger"
                          onClick={() => {
                            const newDocs = docForm.documents.filter((_, i) => i !== docForm.selectedDocIndex);
                            const newIndex = Math.max(0, docForm.selectedDocIndex - 1);
                            setDocForm({ documents: newDocs, selectedDocIndex: newIndex });
                          }}
                        >
                          <FiTrash2 />
                        </Button>
                      )}
                    </div>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold text-secondary">Document Name</Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        value={docForm?.documents?.[docForm?.selectedDocIndex]?.docName || ""}
                        onChange={(e) => {
                          if (!docForm?.documents) return;
                          const newDocs = [...docForm.documents];
                          const currentIndex = docForm.selectedDocIndex || 0;
                          newDocs[currentIndex] = { ...newDocs[currentIndex], docName: e.target.value };
                          setDocForm({ ...docForm, documents: newDocs });
                        }}
                        placeholder="e.g., PAN Card, Aadhar Card"
                        className="bg-light border-0"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold text-secondary">Year</Form.Label>
                      <Form.Select
                        size="sm"
                        value={docForm?.documents?.[docForm?.selectedDocIndex]?.year || ""}
                        onChange={(e) => {
                          if (!docForm?.documents) return;
                          const newDocs = [...docForm.documents];
                          const currentIndex = docForm.selectedDocIndex || 0;
                          newDocs[currentIndex] = { ...newDocs[currentIndex], year: e.target.value };
                          setDocForm({ ...docForm, documents: newDocs });
                        }}
                        className="bg-light border-0"
                      >
                        <option value="">Select Year</option>
                        {(() => {
                          // Logic to generate year options (reused)
                          const UserYears = docsUser?.documents
                            ? [...new Set(Object.values(docsUser.documents).map((doc) => doc?.year).filter((year) => year))].sort((a, b) => b - a)
                            : [];
                          const currentYear = new Date().getFullYear().toString();
                          const nextYear = (new Date().getFullYear() + 1).toString();
                          const allYears = [...new Set([...UserYears, currentYear, nextYear])].sort((a, b) => b - a);
                          return allYears.map((year) => <option key={year} value={year}>{year}</option>);
                        })()}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="small fw-semibold text-secondary">Upload File</Form.Label>
                      <div style={{ position: 'relative' }}>
                        <Form.Control
                          type="file"
                          size="sm"
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            if (!docForm?.documents) return;
                            const file = e.target.files?.[0] || null;
                            const url = file ? URL.createObjectURL(file) : "";
                            const newDocs = [...docForm.documents];
                            const currentIdx = docForm.selectedDocIndex || 0;
                            newDocs[currentIdx] = { ...newDocs[currentIdx], fileName: file?.name || "", file, localPreviewUrl: url };
                            setDocForm({ ...docForm, documents: newDocs });
                          }}
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      {docForm?.documents?.[docForm?.selectedDocIndex]?.fileName && (
                        <div className="small text-success mt-2 d-flex align-items-center gap-1">
                          <FiCheckCircle size={12} />
                          <span>{docForm.documents[docForm.selectedDocIndex].fileName}</span>
                        </div>
                      )}
                    </Form.Group>
                  </Card.Body>
                </Card>

                {/* Documents Summary */}
                {!editingDocId && docForm.documents.length > 1 && (
                  <Card className="border-0 shadow-sm bg-white">
                    <Card.Body className="p-3">
                      <div className="small fw-bold text-secondary mb-2">
                        📋 Summary ({docForm.documents.length} docs)
                      </div>
                      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {docForm.documents.map((doc, index) => (
                          <div key={index} className="d-flex align-items-center gap-2 py-1 border-bottom border-light small">
                            <span className="text-muted">{index + 1}.</span>
                            <span className="fw-medium text-dark">{doc.docName || "Unnamed"}</span>
                            {doc.year && <Badge bg="light" text="dark" className="border">{doc.year}</Badge>}
                          </div>
                        ))}
                      </div>
                    </Card.Body>
                  </Card>
                )}
              </Col>

              <Col md={7}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body className="p-0 d-flex flex-column h-100 bg-white rounded">
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark small">Example Preview</span>
                      {docForm.documents[docForm.selectedDocIndex]?.localPreviewUrl && (
                        <Button
                          variant="white"
                          size="sm"
                          className="text-primary border-0 fw-bold small d-flex align-items-center gap-1 p-0"
                          onClick={() => {
                            // Open full preview logic reuse
                            const currentDoc = docForm.documents[docForm.selectedDocIndex];
                            const previewWindow = window.open("", "_blank", "width=900,height=700");
                            previewWindow.document.write(`<html><body>
                                  <iframe src="${currentDoc.localPreviewUrl}" width="100%" height="100%"></iframe>
                               </body></html>`);
                            previewWindow.document.close();
                          }}
                        >
                          <FiMaximize2 /> Full Screen
                        </Button>
                      )}
                    </div>

                    <div className="flex-grow-1 p-4 d-flex align-items-center justify-content-center bg-light" style={{ minHeight: '350px' }}>
                      {(() => {
                        const currentDoc = docForm.documents[docForm.selectedDocIndex];
                        if (currentDoc?.localPreviewUrl) {
                          if (currentDoc.file?.type?.startsWith("image/")) {
                            return <img src={currentDoc.localPreviewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />;
                          } else if (currentDoc.file?.type === "application/pdf") {
                            return <iframe src={currentDoc.localPreviewUrl} style={{ width: '100%', height: '350px', border: 'none', borderRadius: '8px' }} />;
                          } else {
                            return (
                              <div className="text-center">
                                <div className="mb-3 p-3 bg-white rounded-circle shadow-sm d-inline-block">
                                  <FiFileText size={32} className="text-primary" />
                                </div>
                                <h6 className="mb-1 text-dark">{currentDoc.fileName}</h6>
                                <p className="small text-muted mb-3">Preview not supported for this file type</p>
                                <div className="small text-primary fw-bold">Ready to upload</div>
                              </div>
                            );
                          }
                        } else {
                          return (
                            <div className="text-center text-muted">
                              <div className="mb-3 p-4 bg-white rounded-circle shadow-sm d-inline-block">
                                <FiUploadCloud size={40} className="text-secondary opacity-50" />
                              </div>
                              <h6 className="fw-bold text-secondary mb-1">No file selected</h6>
                              <p className="small mb-0 opacity-75">Upload a document to see preview</p>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Form>


          {/* Saved Documents Display - Always show section */}
          <div className="mt-5">
            <h5 className="mb-3 fw-bold text-dark d-flex align-items-center gap-2">
              📁 Satisfied Documents {filterYear && <Badge bg="warning" text="dark" className="ms-2 small">Year: {filterYear}</Badge>}
            </h5>
            <div className="bg-white rounded border shadow-sm p-0 overflow-hidden">
              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {(() => {
                  const filteredDocs = docsUser?.documents
                    ? Object.entries(docsUser.documents).filter(([_, doc]) => !filterYear || doc.year === filterYear)
                    : [];

                  if (filteredDocs.length === 0) {
                    return (
                      <div className="text-center text-muted py-5">
                        <div className="mb-3 p-3 bg-light rounded-circle d-inline-block">
                          <FiFolder size={32} className="opacity-50" />
                        </div>
                        <h6 className="fw-bold text-secondary">No documents found</h6>
                        <p className="small mb-0 opacity-75">
                          {filterYear ? `No documents found for year ${filterYear}` : "This client has no documents saved yet"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <Row className="g-0">
                      {filteredDocs.map(([key, doc], idx) => (
                        <Col md={6} xl={4} key={key} className="p-2 border-bottom border-end">
                          <div className="d-flex align-items-start gap-3 p-2 h-100 rounded hover-bg-light transition-all">
                            <div className="p-2 rounded bg-light border d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                              {doc.fileType === "application/pdf" ? (
                                <FiFileText className="text-danger" size={24} />
                              ) : doc.fileType?.startsWith("image/") ? (
                                <FiImage className="text-primary" size={24} />
                              ) : (
                                <FiFile className="text-secondary" size={24} />
                              )}
                            </div>
                            <div className="flex-grow-1 min-w-0">
                              <div className="d-flex justify-content-between align-items-start mb-1">
                                <div className="fw-bold text-dark text-truncate" title={doc.name || doc.docName} style={{ maxWidth: '120px' }}>
                                  {doc.name || doc.docName}
                                </div>
                                {doc.year && <Badge bg="light" text="dark" className="border text-muted small">{doc.year}</Badge>}
                              </div>

                              <div className="d-flex align-items-center gap-2 text-muted small mb-2">
                                <span className="text-truncate" style={{ maxWidth: '100px' }}>{doc.fileName}</span>
                                <span>•</span>
                                <span>{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'}</span>
                              </div>

                              <div className="d-flex align-items-center gap-2">
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="p-1 rounded-circle border d-flex align-items-center justify-content-center bg-white text-secondary hover-shadow"
                                  style={{ width: '28px', height: '28px' }}
                                  onClick={() => {
                                    setDocForm({
                                      documents: [{
                                        docName: doc.name || doc.docName || "",
                                        year: doc.year || "",
                                        fileName: doc.fileName || "",
                                        file: null,
                                        localPreviewUrl: doc.fileData || doc.fileUrl || "",
                                      }],
                                      selectedDocIndex: 0
                                    });
                                    setEditingDocId(key);
                                  }}
                                  title="Edit"
                                >
                                  <FiEdit2 size={12} />
                                </Button>
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="p-1 rounded-circle border d-flex align-items-center justify-content-center bg-white text-primary hover-shadow"
                                  style={{ width: '28px', height: '28px' }}
                                  onClick={() => {
                                    const fileUrl = doc.fileData || doc.fileUrl;
                                    if (fileUrl) {
                                      if (doc.fileType === "application/pdf" || doc.fileType?.startsWith("image/")) {
                                        const win = window.open("", "_blank");
                                        win.document.write(`
                                                           <iframe src="${fileUrl}" style="width:100%; height:100%; border:none;"></iframe>
                                                       `);
                                      } else {
                                        const link = document.createElement("a");
                                        link.href = fileUrl;
                                        link.download = doc.fileName || "document";
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }
                                    } else {
                                      showErrorToast("❌ No preview available");
                                    }
                                  }}
                                  title="View / Download"
                                >
                                  <FiDownload size={12} />
                                </Button>
                                <Button
                                  variant="light"
                                  size="sm"
                                  className="p-1 rounded-circle border d-flex align-items-center justify-content-center bg-white text-danger hover-shadow"
                                  style={{ width: '28px', height: '28px' }}
                                  onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this document?")) {
                                      try {
                                        const UserKey = docsUser.id || makeNameKey(docsUser.name);
                                        await remove(ref(rtdb, `clients/${UserKey}/documents/${key}`));

                                        // Refresh logic
                                        const UserRef = ref(rtdb, `clients/${UserKey}`);
                                        onValue(UserRef, (snapshot) => {
                                          if (snapshot.exists()) {
                                            const updatedUser = snapshot.val();
                                            // Update users state
                                            const UserIndex = users.findIndex(c => c.id === UserKey);
                                            if (UserIndex !== -1) {
                                              const newUsers = [...users];
                                              newUsers[UserIndex] = { ...updatedUser, id: UserKey };
                                              setusers(newUsers);
                                            }
                                            // Update current view
                                            setDocsUser({ ...updatedUser, id: UserKey });
                                            if (selectedUser?.id === UserKey) setSelectedUser({ ...updatedUser, id: UserKey });
                                          }
                                        }, { onlyOnce: true });

                                        showSuccessToast("Document deleted successfully");
                                      } catch (e) {
                                        console.error("Delete failed", e);
                                        showErrorToast("Failed to delete document");
                                      }
                                    }
                                  }}
                                  title="Delete"
                                >
                                  <FiTrash2 size={12} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  );
                })()}
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button
            variant="outline-secondary"
            className="px-4"
            onClick={() => {
              setShowDocs(false);
              setEditingDocId(null);
              setFilterYear("");
              setDocForm({
                documents: [{ docName: "", year: "", fileName: "", file: null, localPreviewUrl: "" }],
                selectedDocIndex: 0,
              });
            }}
          >
            Close
          </Button>
          <Button
            variant="primary"
            disabled={!docsUser}
            onClick={async () => {
              console.log(
                "🔄 Save button clicked - Starting document save process..."
              );
              console.log("📋 docsUser:", docsUser?.name);
              console.log("📋 docForm:", docForm);
              console.log("📋 Firebase app:", app);
              console.log("📋 getStorage test:", getStorage);

              if (!docsUser) {
                console.log("❌ No docsUser found, returning...");
                return;
              }

              // Validate documents before saving
              const validDocs = docForm.documents.filter(
                (doc) => doc.docName && doc.file
              );
              console.log("📋 Valid documents found:", validDocs.length);
              console.log("📋 Documents to validate:", docForm.documents);

              if (validDocs.length === 0) {
                console.log("⚠️ No valid documents to save");
                showErrorToast(
                  "⚠️ Please add at least one document with name and file."
                );
                return;
              }

              try {
                if (editingDocId) {
                  // Edit single document
                  const doc = docForm.documents[0];
                  const normYear = String(doc.year || "").trim();
                  const normName = String(doc.docName || "").trim();

                  let payload = {
                    name: normName,
                    year: normYear,
                    fileName: doc.fileName || "",
                  };

                  if (doc.file) {
                    console.log(
                      "📁 File selected for edit, but skipping upload due to CORS configuration"
                    );
                    console.log(
                      "📄 File info:",
                      doc.fileName,
                      "Size:",
                      doc.file.size
                    );
                    // Skip file upload for now due to CORS issues
                    // Convert file to base64 for local storage and preview
                    const reader = new FileReader();
                    const fileData = await new Promise((resolve) => {
                      reader.onload = (e) => resolve(e.target.result);
                      reader.readAsDataURL(doc.file);
                    });

                    payload.fileUrl = "";
                    payload.filePath = "";
                    payload.fileSize = doc.file.size;
                    payload.fileType = doc.file.type;
                    payload.fileData = fileData; // Store base64 data for preview
                    payload.note =
                      "File upload pending - CORS configuration needed";
                  }

                  // Ensure we use the correct User ID (the Firebase key, not array index)
                  const UserKey = docsUser.id || makeNameKey(docsUser.name);
                  console.log("✏️ Updating document for User key:", UserKey);

                  await set(
                    ref(rtdb, `clients/${UserKey}/documents/${editingDocId}`),
                    payload
                  );
                  console.log("✅ Document updated successfully");
                  showSuccessToast("📄 Document updated successfully!");

                  // Update User data to refresh counts in Year Management and main table
                  try {
                    // Fetch updated User data from Firebase using the correct User key
                    const UserRef = ref(rtdb, `clients/${UserKey}`);
                    onValue(
                      UserRef,
                      (snapshot) => {
                        if (snapshot.exists()) {
                          const updatedUser = snapshot.val();

                          // Update the users array with the refreshed data
                          const UserIndex = users.findIndex(
                            (c) => c.id === UserKey
                          );
                          if (UserIndex !== -1) {
                            const updatedusers = [...users];
                            updatedusers[UserIndex] = {
                              ...updatedUser,
                              id: UserKey,
                            };
                            setusers(updatedusers);
                          }

                          // Update selected User for Year Management modal
                          if (selectedUser && selectedUser.id === UserKey) {
                            setSelectedUser({ ...updatedUser, id: UserKey });
                          }

                          // Update docsUser to refresh Saved Documents section
                          if (docsUser && docsUser.id === UserKey) {
                            console.log(
                              "🔄 Updating docsUser after edit with fresh data:",
                              updatedUser
                            );
                            setDocsUser({ ...updatedUser, id: UserKey });
                            console.log(
                              "✅ docsUser updated after edit - Saved Documents section should refresh"
                            );
                          }
                        }
                      },
                      { onlyOnce: true }
                    );
                  } catch (error) {
                    console.error("Failed to refresh User data:", error);
                  }
                } else {
                  // Save multiple documents
                  console.log("💾 Saving multiple documents...");

                  let successCount = 0;
                  let errorCount = 0;

                  for (let i = 0; i < validDocs.length; i++) {
                    const doc = validDocs[i];
                    try {
                      const key = Date.now() + i; // Unique key for each document
                      const normYear = String(doc.year || "").trim();
                      const normName = String(doc.docName || "").trim();

                      let payload = {
                        name: normName,
                        year: normYear,
                        fileName: doc.fileName || "",
                        createdAt: new Date().toISOString(),
                      };

                      console.log("💾 Saving document with payload:", payload);
                      console.log(
                        "📅 Document year:",
                        normYear,
                        "Filter year:",
                        filterYear
                      );

                      if (doc.file) {
                        console.log(
                          "📁 File selected, but skipping upload due to CORS configuration"
                        );
                        console.log(
                          "📄 File info:",
                          doc.fileName,
                          "Size:",
                          doc.file.size
                        );
                        // Skip file upload for now due to CORS issues
                        // Just save the file metadata
                        // Convert file to base64 for local storage and preview
                        const reader = new FileReader();
                        const fileData = await new Promise((resolve) => {
                          reader.onload = (e) => resolve(e.target.result);
                          reader.readAsDataURL(doc.file);
                        });

                        payload.fileUrl = "";
                        payload.filePath = "";
                        payload.fileSize = doc.file.size;
                        payload.fileType = doc.file.type;
                        payload.fileData = fileData; // Store base64 data for preview
                        payload.note =
                          "File stored locally - preview available";
                      }

                      // Ensure we use the correct User ID (the Firebase key, not array index)
                      const UserKey = docsUser.id || makeNameKey(docsUser.name);
                      console.log("💾 Saving document to User key:", UserKey);

                      await set(
                        ref(rtdb, `clients/${UserKey}/documents/${key}`),
                        payload
                      );
                      successCount++;
                    } catch (error) {
                      console.error(
                        "❌ Failed to save document:",
                        doc.docName,
                        error
                      );
                      errorCount++;
                    }
                  }

                  if (successCount > 0) {
                    console.log(
                      `✅ ${successCount} document(s) saved successfully`
                    );
                    console.log("🔔 Showing success toast notification...");

                    // Show success message
                    const message = `🎉 Successfully saved ${successCount} document${successCount > 1 ? "s" : ""
                      }!${errorCount > 0 ? ` ${errorCount} failed.` : ""}`;
                    showSuccessToast(message);

                    // Update User data to refresh counts in Year Management and main table
                    try {
                      const UserKey = docsUser.id || makeNameKey(docsUser.name);

                      // Fetch updated User data from Firebase using the correct User key
                      const UserRef = ref(rtdb, `clients/${UserKey}`);
                      onValue(
                        UserRef,
                        (snapshot) => {
                          if (snapshot.exists()) {
                            const updatedUser = snapshot.val();

                            // Update the users array with the refreshed data
                            const UserIndex = users.findIndex(
                              (c) => c.id === UserKey
                            );
                            if (UserIndex !== -1) {
                              const updatedusers = [...users];
                              updatedusers[UserIndex] = {
                                ...updatedUser,
                                id: UserKey,
                              };
                              setusers(updatedusers);
                            }

                            // Update selected User for Year Management modal
                            if (selectedUser && selectedUser.id === UserKey) {
                              setSelectedUser({ ...updatedUser, id: UserKey });
                            }

                            // Update docsUser to refresh Saved Documents section
                            if (docsUser && docsUser.id === UserKey) {
                              console.log(
                                "🔄 Updating docsUser with fresh data:",
                                updatedUser
                              );
                              setDocsUser({ ...updatedUser, id: UserKey });
                              console.log(
                                "✅ docsUser updated - Saved Documents section should refresh"
                              );
                            }
                          }
                        },
                        { onlyOnce: true }
                      );
                    } catch (error) {
                      console.error("Failed to refresh User data:", error);
                    }
                  } else {
                    console.log("❌ No documents were saved");
                    showErrorToast(
                      "❌ Failed to save any documents. Please try again."
                    );
                    return;
                  }
                }

                // Don't close the modal - just clear the form so user can see saved documents
                setEditingDocId(null);
                setDocForm({
                  documents: [
                    {
                      docName: "",
                      year: "",
                      fileName: "",
                      file: null,
                      localPreviewUrl: "",
                    },
                  ],
                  selectedDocIndex: 0,
                });
              } catch (e) {
                console.error("❌ Failed to save document(s)", e);
                showErrorToast(
                  "❌ Failed to save document(s). Please try again."
                );
              }
            }}
          >
            {editingDocId
              ? "Update Document"
              : `Save ${docForm.documents.filter((doc) => doc.docName && doc.file)
                .length
              } Document${docForm.documents.filter((doc) => doc.docName && doc.file)
                .length !== 1
                ? "s"
                : ""
              }`}
          </Button>
        </Modal.Footer>
      </Modal >

      {/* 🔹 Toast Notifications */}
      <ToastContainer
        className="p-3"
        position="middle-center"
        style={{ zIndex: 9999, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={4000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success" ? "✅ Success" : "❌ Error"}
            </strong>
            <small className="text-muted">just now</small>
          </Toast.Header>
          <Toast.Body
            className={toastVariant === "success" ? "text-white" : "text-white"}
          >
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Update success modal (centered) */}
      <Modal
        show={showUpdateSuccessModal}
        onHide={() => setShowUpdateSuccessModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {updateSuccessMessage && updateSuccessMessage.toLowerCase().includes('add')
              ? '✅ Client Added'
              : updateSuccessMessage && updateSuccessMessage.toLowerCase().includes('update')
                ? '✅ Client Updated'
                : '✅ Success'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ marginBottom: 0 }}>{updateSuccessMessage}</p>
        </Modal.Body>
      </Modal>

      {/* Delete success alert popup (top-centered) */}
      {/* Deleted centered alert removed — toast will be used for success feedback */}

      {/* Year Selection Modal */}
      <Modal
        show={showYearModal}
        onHide={() => setShowYearModal(false)}
        centered
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>📅 Year Management - {selectedUser?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* User Information Card */}
          {selectedUser && (
            <Card className="mb-4 border-primary">
              <Card.Header className="bg-primary text-white">
                <h6 className="mb-0">👤 User Information</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>📝 Name:</strong> {selectedUser.name}
                    </div>
                    <div className="mb-2">
                      <strong>📞 Contact:</strong> {selectedUser.contact}
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-2">
                      <strong>🆔 PAN:</strong> {selectedUser.pan}
                    </div>
                    <div className="mb-2">
                      <strong>📧 Email:</strong> {selectedUser.email}
                    </div>
                  </Col>
                </Row>
                <div className="mt-3">
                  <strong>📊 Total Years:</strong>
                  <Badge bg="info" className="ms-2">
                    {selectedUser.documents
                      ? [
                        ...new Set(
                          Object.values(selectedUser.documents).map(
                            (doc) => doc.year
                          )
                        ),
                      ].length
                      : 0}{" "}
                    Years
                  </Badge>
                </div>
              </Card.Body>
            </Card>
          )}

          {/* Section Header - Same as User Management */}
          <Card className="mb-3">
            <Card.Body className="py-2">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Years</h6>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setNewYearForm("");
                      setShowAddYearModal(true);
                    }}
                  >
                    Add New Year
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={async () => {
                      if (selectedUser && selectedUser.documents) {
                        try {
                          const updatedDocuments = {
                            ...selectedUser.documents,
                          };
                          let removedCount = 0;

                          // Remove all placeholder documents
                          Object.keys(updatedDocuments).forEach((docId) => {
                            const doc = updatedDocuments[docId];
                            if (
                              doc.fileName === "placeholder.txt" ||
                              (doc.docName &&
                                doc.docName.includes("Initial Setup"))
                            ) {
                              delete updatedDocuments[docId];
                              removedCount++;
                            }
                          });

                          if (removedCount > 0) {
                            // Update Firebase
                            const UserKey =
                              selectedUser.id || makeNameKey(selectedUser.name);
                            await set(
                              ref(rtdb, `clients/${UserKey}/documents`),
                              updatedDocuments
                            );

                            showSuccessToast(
                              `Removed ${removedCount} placeholder document(s)!`
                            );
                          } else {
                            showSuccessToast(
                              "No placeholder documents found to remove."
                            );
                          }
                        } catch (error) {
                          console.error(
                            "Error removing placeholder documents:",
                            error
                          );
                          showErrorToast(
                            "Failed to remove placeholder documents."
                          );
                        }
                      }
                    }}
                    title="Remove placeholder documents"
                  >
                    🧹 Clean Placeholders
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Years Table - Same structure as User Management */}
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>User Name</th>
                <th>Contact</th>
                <th>PAN</th>
                <th>Email</th>
                <th>Year</th>
                <th>Documents</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Safety check for selectedUser
                if (!selectedUser) {
                  return (
                    <tr>
                      <td colSpan="7" className="text-center text-muted">
                        <div className="py-3">
                          <div className="mb-2">⚠️ No User selected</div>
                          <small>
                            Please select a User to view year management
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Get the most up-to-date User data from users array
                const currentUser =
                  users.find(
                    (c) =>
                      c &&
                      c.name === selectedUser.name &&
                      c.pan === selectedUser.pan
                  ) || selectedUser;

                // Get all unique years from User's documents (exclude placeholder documents)
                const allYears = currentUser?.documents
                  ? [
                    ...new Set(
                      Object.values(currentUser.documents)
                        .filter(
                          (doc) =>
                            doc.fileName !== "placeholder.txt" &&
                            (doc.docName || doc.name) &&
                            !(doc.docName || doc.name).includes(
                              "Initial Setup"
                            )
                        )
                        .map((doc) => doc?.year)
                        .filter((year) => year)
                    ),
                  ].sort((a, b) => b - a)
                  : [];

                if (allYears.length === 0) {
                  return (
                    <tr>
                      <td colSpan="7" className="text-center text-muted">
                        <div className="py-3">
                          <div className="mb-2">📅 No years found</div>
                          <small>
                            Click "Add New Year" to create your first year
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return allYears.map((year) => {
                  // Get the most up-to-date User data from users array
                  const currentUser =
                    users.find(
                      (c) =>
                        c &&
                        selectedUser &&
                        c.name === selectedUser.name &&
                        c.pan === selectedUser.pan
                    ) || selectedUser;

                  // Filter out placeholder documents and only count real documents
                  const realDocuments = Object.values(
                    currentUser?.documents || {}
                  ).filter(
                    (doc) =>
                      doc &&
                      doc.year === year &&
                      doc.fileName !== "placeholder.txt" &&
                      (doc.docName || doc.name) &&
                      !(doc.docName || doc.name).includes("Initial Setup")
                  );
                  const docCount = realDocuments.length;
                  return (
                    <tr key={year}>
                      <td>{selectedUser.name}</td>
                      <td>{selectedUser.contact}</td>
                      <td>{selectedUser.pan}</td>
                      <td>{selectedUser.email}</td>
                      <td className="text-center">
                        <Badge bg="primary" className="me-2">
                          {year}
                        </Badge>
                        {year === new Date().getFullYear().toString() && <br />}
                        {year === new Date().getFullYear().toString() && (
                          <small className="text-muted">(Current Year)</small>
                        )}
                      </td>
                      <td className="text-center">
                        <Badge
                          bg={docCount > 0 ? "info" : "secondary"}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setDocsUser(selectedUser);
                            setFilterYear(year); // This will filter documents by year in the modal
                            setShowYearModal(false);
                            setShowDocs(true);
                          }}
                          title="Click to add/manage documents"
                        >
                          {docCount} {docCount === 1 ? "Document" : "Documents"}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => {
                              // Edit year functionality - allow user to change the year
                              const newYear = prompt(
                                `Edit year for ${selectedUser.name}:`,
                                year
                              );
                              if (
                                newYear &&
                                newYear !== year &&
                                !isNaN(newYear) &&
                                newYear.length === 4
                              ) {
                                const yearNum = parseInt(newYear);
                                if (yearNum >= 1900 && yearNum <= 2100) {
                                  // Check if new year already exists
                                  const currentUser =
                                    users.find(
                                      (c) =>
                                        c &&
                                        selectedUser &&
                                        c.name === selectedUser.name &&
                                        c.pan === selectedUser.pan
                                    ) || selectedUser;

                                  const existingYears = currentUser?.documents
                                    ? [
                                      ...new Set(
                                        Object.values(currentUser.documents)
                                          .map((doc) => doc?.year)
                                          .filter((y) => y)
                                      ),
                                    ]
                                    : [];

                                  if (
                                    existingYears.includes(newYear.toString())
                                  ) {
                                    alert(
                                      `Year ${newYear} already exists for this User.`
                                    );
                                    return;
                                  }

                                  // Update all documents with the old year to the new year
                                  if (currentUser?.documents) {
                                    const updatedDocuments = {
                                      ...currentUser.documents,
                                    };
                                    Object.keys(updatedDocuments).forEach(
                                      (docId) => {
                                        if (
                                          updatedDocuments[docId].year === year
                                        ) {
                                          updatedDocuments[docId].year =
                                            newYear.toString();
                                        }
                                      }
                                    );

                                    // Update Firebase
                                    const UserKey =
                                      currentUser.id ||
                                      makeNameKey(currentUser.name);
                                    set(
                                      ref(rtdb, `clients/${UserKey}/documents`),
                                      updatedDocuments
                                    )
                                      .then(() => {
                                        showSuccessToast(
                                          `Year updated from ${year} to ${newYear} successfully!`
                                        );
                                      })
                                      .catch((error) => {
                                        console.error(
                                          "Error updating year:",
                                          error
                                        );
                                        showErrorToast(
                                          "Failed to update year. Please try again."
                                        );
                                      });
                                  }
                                } else {
                                  alert(
                                    "Please enter a year between 1900 and 2100"
                                  );
                                }
                              }
                            }}
                            title="Edit this year"
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={async () => {
                              const confirmMessage = `⚠️ Are you sure you want to delete year ${year} and all its documents for ${selectedUser.name}?\n\nThis action cannot be undone.`;
                              if (window.confirm(confirmMessage)) {
                                try {
                                  const currentUser =
                                    users.find(
                                      (c) =>
                                        c &&
                                        selectedUser &&
                                        c.name === selectedUser.name &&
                                        c.pan === selectedUser.pan
                                    ) || selectedUser;

                                  if (currentUser?.documents) {
                                    const updatedDocuments = {
                                      ...currentUser.documents,
                                    };
                                    let deletedCount = 0;

                                    // Remove all documents with this year
                                    Object.keys(updatedDocuments).forEach(
                                      (docId) => {
                                        if (
                                          updatedDocuments[docId].year === year
                                        ) {
                                          delete updatedDocuments[docId];
                                          deletedCount++;
                                        }
                                      }
                                    );

                                    // Update Firebase
                                    const UserKey =
                                      currentUser.id ||
                                      makeNameKey(currentUser.name);
                                    await set(
                                      ref(rtdb, `clients/${UserKey}/documents`),
                                      updatedDocuments
                                    );

                                    showSuccessToast(
                                      `Year ${year} and ${deletedCount} document(s) deleted successfully!`
                                    );

                                    // Close modal if no more years exist
                                    const remainingYears = Object.values(
                                      updatedDocuments
                                    )
                                      .map((doc) => doc.year)
                                      .filter((y) => y);
                                    if (remainingYears.length === 0) {
                                      setShowYearModal(false);
                                    }
                                  }
                                } catch (error) {
                                  console.error("Error deleting year:", error);
                                  showErrorToast(
                                    "Failed to delete year. Please try again."
                                  );
                                }
                              }
                            }}
                            title="Delete this year and all its documents"
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowYearModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add New Year Modal */}
      <Modal
        show={showAddYearModal}
        onHide={() => setShowAddYearModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>📅 Add New Year</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>
                <strong>📅 Enter New Year</strong>
              </Form.Label>
              <Form.Control
                type="number"
                placeholder="e.g., 2022, 2023, 2027"
                value={newYearForm}
                onChange={(e) => setNewYearForm(e.target.value)}
                min="1900"
                max="2100"
                autoFocus
              />
              <Form.Text className="text-muted">
                Enter a 4-digit year (1900-2100)
              </Form.Text>
            </Form.Group>

            {selectedUser && (
              <div className="bg-light p-3 rounded mb-3">
                <h6 className="mb-2">👤 User Information</h6>
                <div>
                  <strong>Name:</strong> {selectedUser.name}
                </div>
                <div>
                  <strong>PAN:</strong> {selectedUser.pan}
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowAddYearModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (
                newYearForm &&
                !isNaN(newYearForm) &&
                newYearForm.length === 4
              ) {
                const year = parseInt(newYearForm);
                if (year >= 1900 && year <= 2100) {
                  try {
                    // First, add a placeholder document for the new year to ensure the year exists in the User's data
                    const UserIndex = users.findIndex(
                      (c) =>
                        c.name === selectedUser.name &&
                        c.pan === selectedUser.pan
                    );
                    if (UserIndex !== -1) {
                      const updatedusers = [...users];
                      const User = updatedusers[UserIndex];

                      // Initialize documents object if it doesn't exist
                      if (!User.documents) {
                        User.documents = {};
                      }

                      // Check if year already exists
                      const yearExists = Object.values(User.documents).some(
                        (doc) => doc.year === newYearForm.toString()
                      );

                      if (!yearExists) {
                        // No need to add placeholder document - just proceed to document creation
                        showSuccessToast(
                          `Year ${newYearForm} ready for documents!`
                        );
                      } else {
                        showErrorToast(
                          `Year ${newYearForm} already exists for this User.`
                        );
                        return;
                      }
                    }

                    // Now open the document form for adding real documents
                    setDocsUser(selectedUser);
                    setDocForm({
                      documents: [
                        {
                          docName: "",
                          year: newYearForm.toString(),
                          fileName: "",
                          file: null,
                          localPreviewUrl: "",
                        },
                      ],
                      selectedDocIndex: 0,
                    });
                    setEditingDocId(null);
                    setShowAddYearModal(false);
                    // Keep Year Management modal open to show the new year
                    // setShowYearModal(false);
                    setShowDocs(true);
                  } catch (error) {
                    console.error("Error adding year:", error);
                    showErrorToast("Failed to add year. Please try again.");
                  }
                } else {
                  alert("Please enter a year between 1900 and 2100");
                }
              } else {
                alert("Please enter a valid 4-digit year");
              }
            }}
            disabled={!newYearForm || newYearForm.length !== 4}
          >
            ➕ Add Year & Create Documents
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Documents Preview Modal */}
      <Modal
        show={showPreviewModal}
        onHide={() => setShowPreviewModal(false)}
        centered
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            📄 All Documents Preview - {docsUser?.name}
            <div className="small text-muted mt-1">
              Total Documents: {previewDocuments.length}
            </div>
          </Modal.Title>
          <div className="d-flex gap-2 mt-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => {
                // Generate proper PDF using HTML to PDF conversion
                const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>User Documents Summary</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }
        .User-info { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .documents-list { margin-top: 20px; }
        .document-item { padding: 8px 0; border-bottom: 1px solid #eee; }
        .footer { margin-top: 30px; text-align: center; color: #666; }
        h1 { color: #007bff; margin: 0; }
        h2 { color: #333; }
        .status { color: #28a745; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📄 User Documents Summary</h1>
        <p>CA Admin System - Document Report</p>
    </div>
    
    <div class="User-info">
        <h2>👤 User Information</h2>
        <p><strong>Name:</strong> ${docsUser?.name}</p>
        <p><strong>Contact:</strong> ${docsUser?.contact}</p>
        <p><strong>Email:</strong> ${docsUser?.email}</p>
        <p><strong>PAN:</strong> ${docsUser?.pan}</p>
    </div>
    
    <div class="documents-list">
        <h2>📋 Documents List (${previewDocuments.length} documents)</h2>
        ${previewDocuments
                    .map(
                      (doc, index) => `
            <div class="document-item">
                <strong>${index + 1}. ${doc.name}</strong><br>
                <small>📅 Year: ${doc.year} | 📎 File: ${doc.fileName || "No file attached"
                        }</small><br>
                <small class="status">${doc.fileUrl && doc.fileUrl !== ""
                          ? "✅ File Available"
                          : doc.fileName && doc.fileName !== ""
                            ? "📎 File Uploaded (Preview not available)"
                            : "⚠️ No File Attached"
                        }</small>
                ${doc.fileUrl && doc.fileUrl !== ""
                          ? `
                    <br><br>
                    <div style="border: 1px solid #ddd; padding: 10px; margin-top: 10px; background-color: #f9f9f9;">
                        <strong>📄 Document Preview:</strong><br>
                        <iframe src="${doc.fileUrl}" width="100%" height="400px" style="border: 1px solid #ccc; margin-top: 5px;"></iframe>
                        <br><small>🔗 File URL: <a href="${doc.fileUrl}" target="_blank">${doc.fileUrl}</a></small>
                    </div>
                `
                          : doc.fileName && doc.fileName !== ""
                            ? `
                    <br><br>
                    <div style="border: 1px solid #ddd; padding: 10px; margin-top: 10px; background-color: #fff3cd;">
                        <strong>📎 File Information:</strong><br>
                        <p>File Name: ${doc.fileName}</p>
                        ${doc.fileSize
                              ? `<p>File Size: ${Math.round(
                                doc.fileSize / 1024
                              )} KB</p>`
                              : ""
                            }
                        ${doc.fileType
                              ? `<p>File Type: ${doc.fileType}</p>`
                              : ""
                            }
                        <p><em>Note: File preview not available due to storage configuration. File has been uploaded successfully.</em></p>
                    </div>
                    <br>
                    <div style="border: 2px dashed #007bff; padding: 20px; margin-top: 10px; background-color: #f8f9ff; text-align: center;">
                        <strong>📄 Document Preview Placeholder</strong><br><br>
                        <div style="background-color: #e9ecef; padding: 40px; border-radius: 5px; margin: 10px 0;">
                            <h3 style="color: #007bff; margin: 0; font-size: 24px;">📋 ${doc.name
                            }</h3>
                            <div style="background-color: #007bff; color: white; padding: 10px; margin: 15px 0; border-radius: 5px;">
                                <h4 style="margin: 0; font-size: 18px;">📎 File: ${doc.fileName
                            }</h4>
                            </div>
                            <p style="color: #6c757d; margin: 10px 0; font-size: 16px;"><strong>Document Type:</strong> ${doc.fileType || "PDF Document"
                            }</p>
                            <p style="color: #6c757d; margin: 10px 0; font-size: 16px;"><strong>Year:</strong> ${doc.year
                            }</p>
                            <div style="border: 1px solid #dee2e6; background-color: white; padding: 20px; margin: 15px 0; min-height: 400px;">
                                ${doc.fileUrl && doc.fileUrl !== ""
                              ? `
                                    <iframe src="${doc.fileUrl}" width="100%" height="400px" style="border: none;"></iframe>
                                `
                              : doc.fileData
                                ? `
                                    <div style="text-align: center; margin-bottom: 15px;">
                                        <strong style="color: #007bff;">📄 Actual Document Preview</strong>
                                    </div>
                                    ${doc.fileType &&
                                  doc.fileType.includes("pdf")
                                  ? `<iframe src="${doc.fileData}" width="100%" height="400px" style="border: none; border-radius: 5px;"></iframe>`
                                  : doc.fileType &&
                                    doc.fileType.startsWith("image/")
                                    ? `<img src="${doc.fileData}" style="max-width: 100%; height: auto; border-radius: 5px; display: block; margin: 0 auto;" alt="Document Preview">`
                                    : `<div style="text-align: center; padding: 30px; background-color: #f8f9fa; border-radius: 5px;">
                                            <h4 style="color: #007bff;">📄 ${doc.name
                                    }</h4>
                                            <p>File Type: ${doc.fileType || "Unknown"
                                    }</p>
                                            <p>File Size: ${doc.fileSize
                                      ? Math.round(
                                        doc.fileSize / 1024
                                      ) + " KB"
                                      : "Unknown"
                                    }</p>
                                            <p style="color: #28a745;">✅ Document content available</p>
                                        </div>`
                                }
                                `
                                : `
                                    <div style="text-align: center; color: #6c757d; padding: 50px;">
                                        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
                                        <p><strong>${doc.name}</strong></p>
                                        <p>Document Content Preview</p>
                                        <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; padding: 30px; margin: 20px 0; border-radius: 8px;">
                                            <h4 style="color: #007bff; margin-bottom: 15px;">📋 ${doc.name
                                }</h4>
                                            <p style="margin: 10px 0;"><strong>📅 Year:</strong> ${doc.year
                                }</p>
                                            <p style="margin: 10px 0;"><strong>📎 File:</strong> ${doc.fileName
                                }</p>
                                            ${doc.fileSize
                                  ? `<p style="margin: 10px 0;"><strong>📏 Size:</strong> ${Math.round(
                                    doc.fileSize / 1024
                                  )} KB</p>`
                                  : ""
                                }
                                            ${doc.fileType
                                  ? `<p style="margin: 10px 0;"><strong>📄 Type:</strong> ${doc.fileType}</p>`
                                  : ""
                                }
                                            <div style="margin-top: 20px; padding: 15px; background-color: white; border-radius: 5px; border: 1px solid #dee2e6;">
                                                <p style="margin: 0; color: #28a745; font-weight: bold;">✅ Document Successfully Uploaded</p>
                                                <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 14px;">File content available in system</p>
                                            </div>
                                        </div>
                                        <p style="color: #6c757d; font-style: italic;">Document preview will be available once storage configuration is complete</p>
                                    </div>
                                `
                            }
                            </div>
                        </div>
                        <p style="color: #007bff; margin: 10px 0;"><strong>✅ File Successfully Uploaded</strong></p>
                        <p style="color: #6c757d; font-size: 12px;"><em>This is a preview placeholder. The actual document has been saved to the system.</em></p>
                    </div>
                `
                            : ""
                        }
            </div>
        `
                    )
                    .join("")}
    </div>
    
    <div class="footer">
        <p>Generated on: ${new Date().toLocaleDateString(
                      "en-IN"
                    )} at ${new Date().toLocaleTimeString("en-IN")}</p>
        <p>Total Documents: ${previewDocuments.length}</p>
        <p>CA Admin System © 2025</p>
    </div>
</body>
</html>
                `;

                // Create a new window for PDF generation
                const printWindow = window.open("", "_blank");
                printWindow.document.write(htmlContent);
                printWindow.document.close();

                // Wait for content to load, then print
                setTimeout(() => {
                  printWindow.focus();
                  printWindow.print();

                  // Close the window after printing
                  setTimeout(() => {
                    printWindow.close();
                  }, 1000);
                }, 500);

                showSuccessToast(
                  `PDF summary generated for ${previewDocuments.length} documents!`
                );
              }}
            >
              📥 Download PDF Summary
            </Button>
            <Button
              variant="info"
              size="sm"
              onClick={() => {
                // Download all individual documents (check both fileUrl and fileData)
                const docsWithFiles = previewDocuments.filter(
                  (doc) =>
                    (doc.fileUrl && doc.fileUrl !== "") ||
                    (doc.fileData && doc.fileData !== "")
                );

                if (docsWithFiles.length > 0) {
                  docsWithFiles.forEach((doc, index) => {
                    setTimeout(() => {
                      const link = document.createElement("a");
                      // Use fileData if fileUrl is not available
                      link.href = doc.fileUrl || doc.fileData;
                      link.download = doc.fileName || `${doc.name}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }, index * 500); // Stagger downloads
                  });
                  showSuccessToast(
                    `Downloading ${docsWithFiles.length} documents...`
                  );
                } else {
                  showErrorToast(
                    "⚠️ No files available for download. Files may not have been uploaded properly."
                  );
                }
              }}
            >
              📥 Download All Files
            </Button>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            {previewDocuments.map((doc, index) => (
              <div key={doc.id} className="col-md-6 col-lg-4">
                <Card className="h-100 border-primary">
                  <Card.Header className="bg-primary text-white py-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="fw-bold">Document #{index + 1}</small>
                      <small>📅 {doc.year}</small>
                    </div>
                  </Card.Header>
                  <Card.Body className="d-flex flex-column">
                    <div className="flex-grow-1">
                      <h6 className="text-primary mb-2">{doc.name}</h6>
                      {doc.fileName && (
                        <div className="text-muted small mb-2">
                          📎 {doc.fileName}
                        </div>
                      )}
                      {doc.fileUrl && doc.fileUrl !== "" ? (
                        <div className="text-success small mb-2">
                          ✅ File Available
                        </div>
                      ) : doc.fileData ? (
                        <div className="text-success small mb-2">
                          ✅ File Available (Preview Ready)
                        </div>
                      ) : doc.fileName && doc.fileName !== "" ? (
                        <div className="text-info small mb-2">
                          📎 File Uploaded (Preview not available)
                        </div>
                      ) : (
                        <div className="text-warning small mb-2">
                          ⚠️ No File Attached
                        </div>
                      )}
                    </div>

                    <div className="d-flex flex-column gap-2 mt-3">
                      {doc.fileUrl && doc.fileUrl !== "" ? (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                          className="w-100"
                        >
                          👁️ Preview
                        </Button>
                      ) : doc.fileData ? (
                        <Button
                          variant="info"
                          size="sm"
                          onClick={() => {
                            // Create preview window with actual file data
                            const previewWindow = window.open(
                              "",
                              "_blank",
                              "width=900,height=700"
                            );
                            previewWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Document Preview - ${doc.name}</title>
                                <style>
                                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f9fa; }
                                  .header { text-align: center; background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                                  .preview-container { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                                  .document-info { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                                  .close-btn { position: fixed; top: 20px; right: 20px; background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; z-index: 1000; }
                                </style>
                              </head>
                              <body>
                                <button class="close-btn" onclick="window.close()">✕ Close</button>
                                <div class="header">
                                  <h2 style="margin: 0; color: #007bff;">📄 ${doc.name
                              }</h2>
                                  <p style="margin: 5px 0; color: #6c757d;">Document Preview</p>
                                </div>
                                <div class="document-info">
                                  <strong>📎 File:</strong> ${doc.fileName} | 
                                  <strong>📅 Year:</strong> ${doc.year} | 
                                  <strong>📏 Size:</strong> ${doc.fileSize
                                ? Math.round(doc.fileSize / 1024) + " KB"
                                : "Unknown"
                              }
                                </div>
                                <div class="preview-container">
                                  ${doc.fileType && doc.fileType.includes("pdf")
                                ? `<iframe src="${doc.fileData}" width="100%" height="600px" style="border: none; border-radius: 5px;"></iframe>`
                                : doc.fileType &&
                                  doc.fileType.startsWith("image/")
                                  ? `<img src="${doc.fileData}" style="max-width: 100%; height: auto; border-radius: 5px;" alt="Document Preview">`
                                  : `<div style="text-align: center; padding: 50px; color: #6c757d;">
                                      <h3>📄 Document Preview</h3>
                                      <p>File type: ${doc.fileType || "Unknown"
                                  }</p>
                                      <p>This file type cannot be previewed directly in the browser.</p>
                                      <a href="${doc.fileData}" download="${doc.fileName
                                  }" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">📥 Download File</a>
                                    </div>`
                              }
                                </div>
                              </body>
                              </html>
                            `);
                            previewWindow.document.close();
                          }}
                          className="w-100"
                        >
                          👁️ Preview Document
                        </Button>
                      ) : doc.fileName && doc.fileName !== "" ? (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => {
                            // Show actual document preview like the first button
                            const previewWindow = window.open(
                              "",
                              "_blank",
                              "width=900,height=700"
                            );
                            previewWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Document Preview - ${doc.name}</title>
                                <style>
                                  body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f8f9fa; }
                                  .header { text-align: center; background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                                  .preview-container { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
                                  .close-btn { position: fixed; top: 20px; right: 20px; background: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; z-index: 1000; }
                                </style>
                              </head>
                              <body>
                                <button class="close-btn" onclick="window.close()">✕ Close</button>
                                <div class="header">
                                  <h2 style="margin: 0; color: #007bff;">📄 ${doc.name
                              }</h2>
                                  <p style="margin: 5px 0; color: #6c757d;">Document Preview</p>
                                </div>
                                <div class="preview-container">
                                  ${doc.fileData &&
                                doc.fileData.includes(
                                  "data:application/pdf"
                                )
                                ? `<iframe src="${doc.fileData}" width="100%" height="600px" style="border: none; border-radius: 5px;"></iframe>`
                                : doc.fileData &&
                                  doc.fileData.includes("data:image/")
                                  ? `<img src="${doc.fileData}" style="max-width: 100%; height: auto; border-radius: 5px;" alt="Document Preview">`
                                  : `<div style="padding: 50px; color: #6c757d;">
                                      <h3>📄 ${doc.name}</h3>
                                      <p>File: ${doc.fileName}</p>
                                      <p>Year: ${doc.year}</p>
                                      <p>File preview is not available due to storage configuration.</p>
                                      <p>The document has been successfully uploaded and is stored in the system.</p>
                                      ${doc.fileData
                                    ? `<a href="${doc.fileData}" download="${doc.fileName}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">📥 Download File</a>`
                                    : ""
                                  }
                                    </div>`
                              }
                                </div>
                              </body>
                            `);
                            previewWindow.document.close();
                          }}
                          className="w-100"
                        >
                          👁️ Preview Document
                        </Button>
                      ) : null}

                      {doc.fileUrl && doc.fileUrl !== "" ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = doc.fileUrl;
                            link.download = doc.fileName || `${doc.name}.pdf`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            showSuccessToast(`Downloaded: ${doc.name}`);
                          }}
                          className="w-100"
                        >
                          📥 Download
                        </Button>
                      ) : doc.fileName && doc.fileName !== "" ? (
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => {
                            alert(
                              `📎 File: ${doc.fileName}\n📏 Size: ${doc.fileSize
                                ? Math.round(doc.fileSize / 1024) + " KB"
                                : "Unknown"
                              }\n📄 Type: ${doc.fileType || "Unknown"
                              }\n\n⚠️ Download not available due to storage configuration.\nFile has been uploaded successfully to the system.`
                            );
                          }}
                          className="w-100"
                        >
                          📥 File Details
                        </Button>
                      ) : null}
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => {
                          setDocForm({
                            documents: [
                              {
                                docName: doc.name || "",
                                year: doc.year || "",
                                fileName: doc.fileName || "",
                                file: null,
                                localPreviewUrl: "",
                              },
                            ],
                            selectedDocIndex: 0,
                          });
                          setEditingDocId(doc.id);
                          setShowPreviewModal(false);
                        }}
                        className="w-100"
                      >
                        ✏️ Edit
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            ))}
          </div>

          {previewDocuments.length === 0 && (
            <div className="text-center text-muted py-5">
              <h5>📄 No Documents Found</h5>
              <p>This User has no documents to preview.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowPreviewModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal
        show={showBulkImportModal}
        onHide={() => setShowBulkImportModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>📊 Bulk Import Clients from Excel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BulkClientImport
            onImportComplete={handleBulkImportComplete}
            onClose={() => setShowBulkImportModal(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
        backdrop="static"
      >
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0',
          }}
          className="border-0"
        >
          <Modal.Title style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
            <FiTrash2 size={22} />
            <span>Confirm Deletion</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '30px', background: '#f8fafc' }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
            }}>
              <FiTrash2 size={32} color="#f59e0b" />
            </div>
            <p style={{ color: '#64748b', fontWeight: '500', marginBottom: '8px', fontSize: '0.95rem' }}>
              Are you sure you want to delete client
            </p>
            <h4 style={{ color: '#1e293b', fontWeight: '700', marginBottom: '0', fontSize: '1.3rem' }}>
              "{deleteTarget?.client?.name}"?
            </h4>
          </div>

          <div style={{
            borderRadius: '12px',
            background: 'white',
            border: '2px solid #e0e7ff',
            padding: '20px',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '15px', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📊</span>
              {deleteRecordInfo.total} {deleteRecordInfo.total === 1 ? 'record' : 'records'} will be deleted:
            </div>
            <div style={{ fontSize: '0.9rem', color: '#64748b', paddingLeft: '28px' }}>
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiCalendar size={16} color="#6366f1" />
                <span><strong style={{ color: '#1e293b' }}>{deleteRecordInfo.years}</strong> {deleteRecordInfo.years === 1 ? 'year' : 'years'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiFolder size={16} color="#6366f1" />
                <span><strong style={{ color: '#1e293b' }}>{deleteRecordInfo.documents}</strong> {deleteRecordInfo.documents === 1 ? 'document' : 'documents'}</span>
              </div>
            </div>
          </div>

          <div style={{
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span style={{ color: '#991b1b', fontSize: '0.9rem', fontWeight: '500' }}>
              <strong>Warning:</strong> This action cannot be undone.
            </span>
          </div>
        </Modal.Body>
        <Modal.Footer style={{ border: 'none', padding: '20px 30px', background: '#f8fafc' }}>
          <Button
            variant="light"
            onClick={() => setShowDeleteModal(false)}
            style={{
              borderRadius: '10px',
              padding: '10px 24px',
              fontWeight: '600',
              border: '2px solid #e5e7eb',
              background: 'white',
              color: '#64748b',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.background = '#f8fafc';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = 'white';
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={isDeletingClient}
            style={{
              borderRadius: '10px',
              padding: '10px 24px',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              color: 'white',
              transition: 'all 0.2s ease',
              opacity: isDeletingClient ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isDeletingClient) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
            }}
          >
            {isDeletingClient ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Deleting...
              </>
            ) : (
              <>
                <FiTrash2 size={16} style={{ marginRight: '8px' }} />
                Delete Client
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div >
  );
};

export default UserManagement;
