// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/AdminPanel.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./components/pages/Login";
import LandingPage from "./components/pages/LandingPage";
import PrivacyPolicy from "./components/pages/PrivacyPolicy";
import Dashboard from "./components/pages/Dashboard";
import ClientManagement from "./components/pages/ClientManagement";
import ClientForm from "./components/pages/ClientForm";
import DocumentManagement from "./components/pages/DocumentManagement";
import GenericDocumentManagement from "./components/pages/GenericDocumentManagement";
import YearManagement from "./components/pages/YearManagement";
import BannerManagement from "./components/pages/BannerManagement";
import NotificationManagement from "./components/pages/NotificationManagement";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

function AppContent() {
  const { authenticated, loading } = useAuth();

  const handleLoginSuccess = () => {
    // Authentication state is updated by AuthContext or localStorage
    // Force a reload or redirect to dashboard to ensure state is consistent
    window.location.href = '/admin/dashboard';
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase Authentication
      await signOut(auth);
      console.log("🔐 Firebase sign out successful");
    } catch (error) {
      console.error("❌ Firebase sign out error:", error);
    }

    // Clear localStorage and context
    localStorage.removeItem("auth");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");

    // Clear any stored navigation state and redirect to home
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={!authenticated ? <LandingPage /> : <Navigate to="/admin/dashboard" replace />}
      />
      <Route
        path="/login"
        element={!authenticated ? <Login onSuccess={handleLoginSuccess} /> : <Navigate to="/admin/dashboard" replace />}
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          authenticated ? (
            <Layout onLogout={handleLogout}>
              <Routes>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/edit" element={<ClientForm />} />
                <Route path="documents" element={<DocumentManagement />} />
                <Route path="generic-documents" element={<GenericDocumentManagement />} />
                <Route path="years" element={<YearManagement />} />
                <Route path="banners" element={<BannerManagement />} />
                <Route path="notifications" element={<NotificationManagement />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
