import { useState, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Badge,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Toast,
  ToastContainer,
  Pagination,
} from "react-bootstrap";
import { useAuth } from "../../contexts/AuthContext";
import { notificationHelpers } from "../../utils/firestoreHelpers";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage, functions, auth } from "../../firebase";
import {
  FiBell,
  FiSend,
  FiTrash2,
  FiImage,
  FiMessageSquare,
  FiCalendar,
  FiEye,
  FiEdit2
} from 'react-icons/fi';
// Removed httpsCallable import - using HTTP requests instead

const NotificationManagement = () => {
  const {
    getUserNotificationsRef,
    getNotificationDocRef,
    userEmail,
    authenticated,
  } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    image: null,
    priority: "medium",
  });
  const [loading, setLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [pushStatus, setPushStatus] = useState("");
  const [showPushStatus, setShowPushStatus] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // show 10 notifications per page

  // Toast notification helpers
  const showSuccessToast = (message) => {
    setToastMessage(message);
    setToastVariant("success");
    setShowToast(true);
  };

  const showErrorToast = (message) => {
    setToastMessage(message);
    setToastVariant("danger");
    setShowToast(true);
  };

  // Load notifications on component mount
  useEffect(() => {
    if (authenticated && userEmail) {
      loadNotifications();

      // Set up real-time subscription
      const notificationsRef = getUserNotificationsRef();

      if (notificationsRef) {
        const unsubscribe = notificationHelpers.subscribeToNotifications(
          notificationsRef,
          (notificationsList) => {
            setNotifications(notificationsList);
            setNotificationsLoading(false);
          },
          (error) => {
            console.error("Error subscribing to notifications:", error);
            setError("Failed to load notifications");
            setNotificationsLoading(false);
          }
        );

        return () => unsubscribe();
      } else {
        setNotificationsLoading(false);
      }
    } else {
      setNotificationsLoading(false);
    }
  }, [authenticated, userEmail]);

  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const notificationsRef = getUserNotificationsRef();

      if (notificationsRef) {
        const notificationsList = await notificationHelpers.getNotifications(
          notificationsRef
        );
        setNotifications(notificationsList);
      } else {
        setError("User not authenticated");
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setError("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleAddNotification = () => {
    setFormData({
      title: "",
      message: "",
      image: null,
      priority: "medium",
    });
    setShowAddModal(true);
  };

  const handleViewNotification = (notification) => {
    setSelectedNotification(notification);
    setShowViewModal(true);
  };

  const handleEditNotification = (notification) => {
    setSelectedNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      image: null,
      priority: notification.priority || "medium",
    });
    setTitleError("");
    setError("");
    setShowEditModal(true);
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) {
      return;
    }

    try {
      setLoading(true);

      // Find the notification to get image path
      const notification = notifications.find(n => n.id === id);

      // Delete image from storage if it exists
      if (notification && notification.imagePath) {
        try {
          console.log("🗑️ Deleting image from storage:", notification.imagePath);
          const imageRef = ref(storage, notification.imagePath);
          const { deleteObject } = await import("firebase/storage");
          await deleteObject(imageRef);
          console.log("✅ Image deleted from storage successfully");
        } catch (storageError) {
          console.warn("⚠️ Failed to delete image from storage:", storageError);
          // Continue with notification deletion even if image deletion fails
        }
      }

      // Delete notification from Firestore
      const notificationDocRef = getNotificationDocRef(id);
      if (notificationDocRef) {
        await notificationHelpers.deleteNotification(notificationDocRef);
        setError("");
        showSuccessToast("✅ Notification deleted successfully!");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      setError("Failed to delete notification");
      showErrorToast("❌ Failed to delete notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotification = async (e) => {
    e.preventDefault();

    // Validate title
    const titleValidationError = validateTitle(formData.title);
    if (titleValidationError) {
      setTitleError(titleValidationError);
      setError(titleValidationError);
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      let imageData = null;
      if (formData.image) {
        imageData = await uploadImage(formData.image);
      }

      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        ...(imageData && imageData),
      };

      const notificationDocRef = getNotificationDocRef(selectedNotification.id);
      if (notificationDocRef) {
        await notificationHelpers.updateNotification(
          notificationDocRef,
          notificationData
        );
      }

      showSuccessToast("✅ Notification updated successfully!");
      setShowEditModal(false);
      setSelectedNotification(null);
      setFormData({
        title: "",
        message: "",
        image: null,
        priority: "medium",
      });
      setError("");
      setTitleError("");
    } catch (error) {
      console.error("❌ Error updating notification:", error);
      setError("Failed to update notification: " + error.message);
      showErrorToast("❌ Failed to update notification. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (imageFile) => {
    if (!imageFile) return null;

    try {
      const timestamp = Date.now();
      const fileName = `notification_${timestamp}_${imageFile.name}`;
      const storageRef = ref(storage, `notifications/${fileName}`);

      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      return {
        imageUrl: downloadURL,
        imagePath: snapshot.ref.fullPath,
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  };

  const validateTitle = (title) => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return "Title is required";
    }

    // Check if title contains only numbers
    if (/^[0-9]+$/.test(trimmedTitle)) {
      return "Title cannot contain only numbers. Please include letters.";
    }

    // Check if title contains at least one letter
    if (!/[a-zA-Z]/.test(trimmedTitle)) {
      return "Title must contain at least one letter";
    }

    if (trimmedTitle.length < 3) {
      return "Title must be at least 3 characters long";
    }

    if (trimmedTitle.length > 100) {
      return "Title must be less than 100 characters";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate title
    const titleValidationError = validateTitle(formData.title);
    if (titleValidationError) {
      setTitleError(titleValidationError);
      setError(titleValidationError);
      return;
    }

    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setPushStatus("");

      let imageData = null;
      if (formData.image) {
        imageData = await uploadImage(formData.image);
      }

      const notificationData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        ...(imageData && imageData), // Only spread if imageData exists
      };

      const notificationsRef = getUserNotificationsRef();

      // Create new notification
      if (notificationsRef) {
        await notificationHelpers.createNotification(
          notificationsRef,
          notificationData
        );
      } else {
        setError("User not authenticated - cannot create notification");
        return;
      }
      setShowAddModal(false);

      // --- CALL THE CLOUD FUNCTION ---
      try {
        setPushStatus("Sending push notification to clients...");
        setShowPushStatus(true);

        // Debug: Check authentication
        console.log("🔐 Authenticated:", authenticated);
        console.log("📧 User Email:", userEmail);

        // Verify Firebase Auth user exists
        const currentUser = auth.currentUser;
        console.log("👤 Firebase Auth User:", currentUser);

        if (!currentUser) {
          throw new Error("You must be logged in with Firebase Authentication to send notifications. Please log out and log back in.");
        }

        // Get fresh auth token
        const token = await currentUser.getIdToken(true);
        console.log("🎫 Auth Token exists:", !!token);
        console.log("🎫 Token preview:", token.substring(0, 20) + "...");

        // Prepare payload with optional image
        // IMPORTANT: Sanitize email to match Firestore path (dots -> underscores)
        const sanitizedEmail = userEmail.replace(/\./g, "_");

        const payload = {
          title: notificationData.title,
          body: notificationData.message,
          caFirmId: sanitizedEmail,  // Send sanitized email
        };

        console.log("📤 Sending payload:", payload);
        console.log("📧 Original email:", userEmail, "→ Sanitized:", sanitizedEmail);

        // Add imageUrl if available
        if (notificationData.imageUrl) {
          payload.imageUrl = notificationData.imageUrl;
        }

        console.log("🚀 Calling function...");

        // Use the currentUser already defined above (no need to redeclare)

        // Make HTTP request to the Cloud Function
        // Dynamically get project ID from auth app options
        const projectId = auth.app.options.projectId;
        const functionUrl = `https://us-central1-cadirect-fea91.cloudfunctions.net/sendAdminBroadcast`;

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: payload,
            auth: {
              uid: currentUser.uid,
              token: {
                email: currentUser.email
              }
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("❌ HTTP Error RAW Response:", errorData);
          throw new Error(errorData.message || (errorData.error && errorData.error.message) || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("📥 Function response:", result);

        // Check if the function call was successful
        if (result.success === false) {
          // Handle specific case of no tokens found
          if (result.message && result.message.includes("no clients with notification tokens")) {
            console.warn("⚠️ Push skipped: No tokens found.");
            setPushStatus("⚠️ Notification saved, but no clients have push notification tokens registered.");
            showSuccessToast("✅ Notification saved (No devices to push to)");
            return; // Exit normally, do not throw error
          } else {
            throw new Error(result.message);
          }
        }

        setPushStatus(result.message); // Display the success message from the function
        showSuccessToast("✅ Notification sent successfully!");
        console.log("✅ Push notification sent:", result.message);

        // Log if there were any failures
        if (result.failureCount > 0) {
          console.warn(`⚠️ ${result.failureCount} clients did not receive the notification`);
        }
      } catch (pushError) {
        console.error("❌ Error sending push notification:", pushError.message || pushError);
        if (pushError.code) console.error("❌ Error code:", pushError.code);
        if (pushError.details) console.error("❌ Error details:", pushError.details);

        setPushStatus(`Push notification failed: ${pushError.message}`);
        // Do not block the UI cleanup since the notification itself was saved in Firestore earlier
      }

      // Reset form
      setFormData({
        title: "",
        message: "",
        image: null,
        priority: "medium",
      });
      setError("");
      setTitleError("");
    } catch (error) {
      console.error("❌ Error saving notification:", error);
      setError("Failed to save notification: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      high: "danger",
      medium: "warning",
      low: "info",
    };
    return <Badge bg={variants[priority]}>{priority.toUpperCase()}</Badge>;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    // Handle Firestore timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh' }}>
      <h3 className="mb-3" style={{ color: '#1e293b', fontWeight: '700', fontSize: '1.75rem' }}>
        <FiBell className="me-2" />
        Notification Management
      </h3>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Push Status Alert */}
      {showPushStatus && pushStatus && (
        <Alert
          variant={pushStatus.includes("failed") || pushStatus.includes("error") ? "warning" : "success"}
          dismissible
          onClose={() => {
            setShowPushStatus(false);
            setPushStatus("");
          }}
        >
          {pushStatus}
        </Alert>
      )}

      {/* Instructions */}
      <div
        className="alert mb-3"
        style={{
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          background: "white",
          padding: "16px 20px"
        }}
      >
        <div className="d-flex align-items-center">
          <div style={{ fontSize: "1.5rem", marginRight: "12px", color: '#667eea' }}>💡</div>
          <div style={{ color: '#64748b' }}>
            <strong style={{ color: '#1e293b' }}>Manage Notifications:</strong> Create and manage
            system notifications with title, message, and images.
          </div>
        </div>
      </div>

      {/* Section Header */}
      <Card className="mb-3" style={{
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <Card.Body className="py-3 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0" style={{ color: '#1e293b', fontWeight: '600' }}>Notifications</h5>
              <small style={{ color: '#64748b' }}>
                Manage system notifications and announcements
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button
                onClick={handleAddNotification}
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#10b981';
                }}
              >
                <FiSend size={16} />
                <span>Send Notification</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Notifications Table */}
      <div className="table-responsive" style={{
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        background: 'white',
        overflow: 'hidden'
      }}>
        <Table
          hover
          className="mb-0"
        >
          <thead
            style={{
              background: 'white',
            }}
          >
            <tr>
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  border: "none",
                  borderBottom: '1px solid #e5e7eb',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  width: '20%'
                }}
              >
                📋 TITLE
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  border: "none",
                  borderBottom: '1px solid #e5e7eb',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  width: '35%'
                }}
              >
                💬 MESSAGE
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  border: "none",
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: "center",
                  color: '#64748b',
                  textTransform: 'uppercase',
                  width: '15%'
                }}
              >
                🖼️ IMAGE
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  border: "none",
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: "center",
                  color: '#64748b',
                  textTransform: 'uppercase',
                  width: '15%'
                }}
              >
                📅 CREATED
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  border: "none",
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: "center",
                  color: '#64748b',
                  textTransform: 'uppercase',
                  width: '15%'
                }}
              >
                ⚡ ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {/** Render only notifications for current page */}
            {(() => {
              const totalPages = Math.max(1, Math.ceil(notifications.length / pageSize));
              // Ensure current page is within bounds
              if (currentPage > totalPages) setCurrentPage(totalPages);
              const start = (currentPage - 1) * pageSize;
              const pagedNotifications = notifications.slice(start, start + pageSize);
              return pagedNotifications.map((notification, index) => (
                <tr
                  key={notification.id}
                  style={{
                    backgroundColor: "white",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8f9fa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="fw-bold" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                      {notification.title}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="text-truncate" title={notification.message} style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {notification.message}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {notification.imageUrl ? (
                      <Badge style={{
                        background: '#3b82f6',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        📷 {notification.fileName || "Image"}
                      </Badge>
                    ) : (
                      <Badge style={{
                        background: '#94a3b8',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>No Image</Badge>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <small style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {formatDate(notification.createdAt)}
                    </small>
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      border: "none",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div className="d-flex gap-1 justify-content-center align-items-center" style={{ flexWrap: 'nowrap' }}>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewNotification(notification);
                        }}
                        style={{
                          borderRadius: "8px",
                          width: "36px",
                          height: "36px",
                          padding: "0",
                          border: "none",
                          background: "#eff6ff",
                          color: "#3b82f6",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title="View notification"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#3b82f6";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#eff6ff";
                          e.currentTarget.style.color = "#3b82f6";
                        }}
                      >
                        <FiEye size={18} />
                      </Button>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        style={{
                          borderRadius: "8px",
                          width: "36px",
                          height: "36px",
                          padding: "0",
                          border: "none",
                          background: "#fee2e2",
                          color: "#ef4444",
                          transition: "all 0.2s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title="Delete notification"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#ef4444";
                          e.currentTarget.style.color = "white";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#fee2e2";
                          e.currentTarget.style.color = "#ef4444";
                        }}
                      >
                        <FiTrash2 size={18} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ));
            })()}
            {notifications.length === 0 && !notificationsLoading && (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#6c757d",
                    fontSize: "1.1rem",
                    border: "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                      🔔
                    </div>
                    <div style={{ fontWeight: "500", marginBottom: "8px" }}>
                      No notifications found
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "#adb5bd" }}>
                      Click "Send Notification" to get started
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {notificationsLoading && (
              <tr>
                <td
                  colSpan="6"
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#6c757d",
                    fontSize: "1.1rem",
                    border: "none",
                  }}
                >
                  <div>
                    <div
                      className="spinner-border text-primary mb-3"
                      role="status"
                    >
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <div>Loading notifications...</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
        {/* Pagination controls */}
        {notifications.length > pageSize && (
          <div className="p-3 d-flex justify-content-end">
            <Pagination className="mb-0">
              <Pagination.Prev
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              />
              {Array.from({ length: Math.ceil(notifications.length / pageSize) }).map((_, i) => (
                <Pagination.Item
                  key={i}
                  active={i + 1 === currentPage}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Pagination.Item>
              ))}
              <Pagination.Next
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(notifications.length / pageSize), p + 1))}
                disabled={currentPage === Math.ceil(notifications.length / pageSize)}
              />
            </Pagination>
          </div>
        )}
      </div>

      {/* Add Notification Modal */}
      <Modal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>📤 Send Notification to Clients</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>📋 Title *</strong>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter notification title (e.g., 'Tax Reminder')"
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData({ ...formData, title: newTitle });
                      // Clear error when user starts typing
                      if (titleError) {
                        const validationError = validateTitle(newTitle);
                        setTitleError(validationError);
                        if (!validationError) {
                          setError("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const validationError = validateTitle(e.target.value);
                      setTitleError(validationError);
                    }}
                    isInvalid={!!titleError}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {titleError}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Title must contain letters, not just numbers (min 3 characters)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>💬 Message *</strong>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Enter notification message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>🖼️ Image</strong>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.files[0] })
                    }
                  />
                  <Form.Text className="text-muted">
                    Upload an image for the notification (optional)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.title || !formData.message || loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Sending Notification...
              </>
            ) : (
              "📤 Send Notification"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Notification Modal */}
      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: 'white',
          border: 'none'
        }}>
          <Modal.Title>👁️ View Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '30px', background: '#f8fafc' }}>
          {selectedNotification && (
            <>
              <div className="mb-4">
                <h6 style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>📋 Title</h6>
                <p style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: '600', marginBottom: '0' }}>
                  {selectedNotification.title}
                </p>
              </div>

              <div className="mb-4">
                <h6 style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>💬 Message</h6>
                <p style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '0' }}>
                  {selectedNotification.message}
                </p>
              </div>

              {selectedNotification.imageUrl && (
                <div className="mb-4">
                  <h6 style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>🖼️ Image</h6>
                  <img
                    src={selectedNotification.imageUrl}
                    alt="Notification"
                    style={{
                      width: '100%',
                      maxHeight: '400px',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}
                  />
                  {selectedNotification.fileName && (
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '8px', marginBottom: '0' }}>
                      📎 {selectedNotification.fileName}
                    </p>
                  )}
                </div>
              )}

              <div className="mb-3">
                <h6 style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>📅 Created</h6>
                <p style={{ color: '#1e293b', fontSize: '0.9rem', marginBottom: '0' }}>
                  {formatDate(selectedNotification.createdAt)}
                </p>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ border: 'none', background: '#f8fafc' }}>
          <Button
            variant="secondary"
            onClick={() => setShowViewModal(false)}
            style={{
              borderRadius: '8px',
              padding: '8px 20px'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Notification Modal */}
      <Modal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setSelectedNotification(null);
          setFormData({
            title: "",
            message: "",
            image: null,
            priority: "medium",
          });
          setError("");
          setTitleError("");
        }}
        centered
        size="lg"
      >
        <Modal.Header closeButton style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          border: 'none'
        }}>
          <Modal.Title>✏️ Edit Notification</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleUpdateNotification}>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>📋 Title *</strong>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter notification title (e.g., 'Tax Reminder')"
                    value={formData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setFormData({ ...formData, title: newTitle });
                      if (titleError) {
                        const validationError = validateTitle(newTitle);
                        setTitleError(validationError);
                        if (!validationError) {
                          setError("");
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const validationError = validateTitle(e.target.value);
                      setTitleError(validationError);
                    }}
                    isInvalid={!!titleError}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {titleError}
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    Title must contain letters, not just numbers (min 3 characters)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>💬 Message *</strong>
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Enter notification message"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <strong>🖼️ New Image (Optional)</strong>
                  </Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({ ...formData, image: e.target.files[0] })
                    }
                  />
                  <Form.Text className="text-muted">
                    Upload a new image to replace the existing one (optional)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditModal(false);
              setSelectedNotification(null);
              setFormData({
                title: "",
                message: "",
                image: null,
                priority: "medium",
              });
              setError("");
              setTitleError("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleUpdateNotification}
            disabled={!formData.title || !formData.message || loading}
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Updating...
              </>
            ) : (
              "💾 Update Notification"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notification */}
      <ToastContainer
        position="middle-center"
        className="p-3"
        style={{ zIndex: 9999, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      >
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success" ? "✅ Success" : "❌ Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

    </div>
  );
};

export default NotificationManagement;
