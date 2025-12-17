
// src/components/pages/Login.js
import React, { useState } from "react";
import { Card, Form, Button, Alert, Spinner } from "react-bootstrap";
import { auth, rtdb, db } from "../../firebase";
import { ref, get } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FiMail, FiLock, FiAlertCircle } from "react-icons/fi";
import "./Login.css";

const Login = ({ onSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verifyAdmin = (data, emailIn, passwordIn) => {
    if (!data) return false;
    const normalize = (s) => String(s || "").trim().toLowerCase();

    // Support either a single admin object { email, password }
    // or a map of admins { adminId: { email, password }, ... }
    if (data.email && data.password) {
      return (
        normalize(data.email) === normalize(emailIn) && String(data.password) === String(passwordIn)
      );
    }
    if (typeof data === "object") {
      return Object.values(data).some(
        (u) => normalize(u?.email) === normalize(emailIn) && String(u?.password) === String(passwordIn)
      );
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanEmail = email.trim();
    let verified = false;

    try {
      // 1. Try Firebase Authentication first
      console.log("🔐 Attempting Firebase Authentication login...");
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      console.log("✅ Firebase Authentication successful:", user.email);

      // 1.1 STRICT AUTHORIZATION CHECK
      let isAuthorized = false;
      const sanitizedEmail = user.email.replace(/\./g, '_');

      // Check Firestore
      try {
        const adminDocRef = doc(db, "ca_admin", sanitizedEmail);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          isAuthorized = true;
        }
      } catch (err) {
        console.warn("Firestore check error", err);
      }

      // Check Legacy RTDB if not in Firestore
      if (!isAuthorized) {
        try {
          const snap = await get(ref(rtdb, "admin"));
          if (verifyAdmin(snap.val(), user.email, password)) {
            isAuthorized = true;
          }
        } catch (rtdbErr) {
          console.warn("RTDB check error", rtdbErr);
        }
      }

      if (!isAuthorized) {
        console.warn("⛔ User authenticated but NOT in admin database. Rejecting.");
        await signOut(auth);
        throw { code: 'auth/unauthorized-admin' };
      }

      localStorage.setItem("auth", "true");
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId", user.uid);

      console.log("🎯 Redirecting to dashboard after successful login");
      if (typeof onSuccess === "function") onSuccess();
      verified = true;

    } catch (authError) {
      console.log("❌ Firebase Authentication failed:", authError.code || authError.message);

      // DETERMINE SPECIFIC ERROR MESSAGE
      let authErrorMessage = "Invalid email or password.";
      let isAuthUserFound = true; // Assume found unless proven otherwise

      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        authErrorMessage = "Incorrect password.";
      } else if (authError.code === 'auth/user-not-found') {
        authErrorMessage = "No account found with this email.";
        isAuthUserFound = false;
      } else if (authError.code === 'auth/invalid-email') {
        authErrorMessage = "Invalid email format.";
        isAuthUserFound = false;
      } else if (authError.code === 'auth/unauthorized-admin') {
        // Special case where auth worked but DB check failed
        authErrorMessage = "No account found with this email.";
        isAuthUserFound = false;
      }

      // 2. Fallback: Check Firestore manually (if Auth failed)
      // This covers the case where the user might rely on Firestore 'credentials' field logic 
      // instead of Firebase Auth (though ideally they should match)
      if (!verified) {
        try {
          console.log("🔄 Trying Firestore 'ca_admin' manual verification...");
          const sanitizedEmail = cleanEmail.replace(/\./g, '_');
          const docRef = doc(db, "ca_admin", sanitizedEmail);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.credentials &&
              String(data.credentials.password) === String(password) &&
              String(data.credentials.email).toLowerCase() === cleanEmail.toLowerCase()) {

              console.log("✅ Firestore manual verification successful");
              localStorage.setItem("auth", "true");
              localStorage.setItem("userEmail", cleanEmail);
              if (typeof onSuccess === "function") onSuccess();
              verified = true;
              return; // success
            } else if (docSnap.exists()) {
              // User exists but password wrong
              // If we are here, it means Auth failed AND Firestore password check failed
              // So we can confidently say "Incorrect password" if we found the user
              isAuthUserFound = true;
              authErrorMessage = "Incorrect password.";
            }
          }
        } catch (firestoreError) {
          console.error("❌ Firestore check failed:", firestoreError);
        }
      }

      // 3. Fallback: Check Legacy RTDB
      if (!verified) {
        try {
          console.log("🔄 Trying RTDB verification as fallback...");
          const snap = await get(ref(rtdb, "admin"));
          // We can't easily distinguish wrong password vs no user here without modifying verifyAdmin
          // But usually verifyAdmin returns boolean.
          const ok = verifyAdmin(snap.val(), cleanEmail, password);
          if (ok) {
            console.log("✅ Database verification successful");
            localStorage.setItem("auth", "true");
            localStorage.setItem("userEmail", cleanEmail);
            if (typeof onSuccess === "function") onSuccess();
            verified = true;
            return;
          }
        } catch (dbError) {
          console.error("❌ Database verification also failed:", dbError.message);
        }
      }

      // FINAL ERROR DISPLAY
      // If we are here, strict auth failed, manually firestore failed, and RTDB failed.
      if (!isAuthUserFound) {
        setError("No account found with this email.");
      } else {
        setError(authErrorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card">
        <div className="login-header">
          <div className="logo-container">
            {/* Try to use the logo, fallback to text if missing */}
            <img
              src="/calogo.jpg"
              alt="CA Admin Logo"
              className="app-logo"
              onError={(e) => { e.target.onerror = null; e.target.src = "/ca.jpeg"; }}
            />
          </div>
          <h4 className="login-title">Admin Portal</h4>
          <p className="login-subtitle">Sign in to manage your dashboard</p>
        </div>

        <div className="login-body">
          {error && (
            <Alert variant="danger" className="d-flex align-items-center mb-4" style={{ borderRadius: '10px', fontSize: '0.9rem' }}>
              <FiAlertCircle size={20} className="me-2 flex-shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="text-muted small fw-bold text-uppercase">Email Address</Form.Label>
              <div className="custom-input-group">
                <FiMail className="input-icon" size={18} />
                <Form.Control
                  type="email"
                  className="custom-input"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="text-muted small fw-bold text-uppercase">Password</Form.Label>
              <div className="custom-input-group">
                <FiLock className="input-icon" size={18} />
                <Form.Control
                  type="password"
                  className="custom-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </Form.Group>

            <Button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="login-footer">
              &copy; {new Date().getFullYear()} CA Admin Panel. All rights reserved.
            </div>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default Login;

