
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
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

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
    setEmailError(null);
    setPasswordError(null);

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
      let isAuthUserFound = false; // Default to not found

      // For invalid-credential, we need to check if the email exists first
      if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        // Check if email exists in Firestore to give accurate error
        try {
          const sanitizedEmail = cleanEmail.replace(/\./g, '_');
          const docRef = doc(db, "ca_admin", sanitizedEmail);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            // Email exists, so it's a password error
            isAuthUserFound = true;
            setPasswordError("Incorrect password.");
          } else {
            // Email doesn't exist in Firestore
            setEmailError("No account found with this email.");
          }
        } catch (checkError) {
          // If check fails, default to password error
          setPasswordError("Incorrect password.");
        }
      } else if (authError.code === 'auth/user-not-found') {
        setEmailError("No account found with this email.");
      } else if (authError.code === 'auth/invalid-email') {
        setEmailError("Invalid email format.");
      } else if (authError.code === 'auth/unauthorized-admin') {
        // Special case where auth worked but DB check failed
        setEmailError("No account found with this email.");
      }

      // 2. Fallback: Check Firestore manually (if Auth failed)
      // This covers the case where the user might rely on Firestore 'credentials' field logic 
      // instead of Firebase Auth (though ideally they should match)
      if (!verified && !emailError && !passwordError) {
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
            } else {
              // User exists but password wrong
              isAuthUserFound = true;
              setPasswordError("Incorrect password.");
            }
          } else {
            // User doesn't exist
            setEmailError("No account found with this email.");
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
      if (!verified && !emailError && !passwordError) {
        if (!isAuthUserFound) {
          setEmailError("No account found with this email.");
        } else {
          setPasswordError("Incorrect password.");
        }
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
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label className="text-muted small fw-bold text-uppercase">Email Address</Form.Label>
              <div className="custom-input-group">
                <FiMail className="input-icon" size={18} />
                <Form.Control
                  type="email"
                  className={`custom-input ${emailError ? 'is-invalid' : ''}`}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {emailError && (
                <div className="d-flex align-items-center mt-2" style={{ color: '#dc3545', fontSize: '0.875rem' }}>
                  <FiAlertCircle size={16} className="me-2 flex-shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="text-muted small fw-bold text-uppercase">Password</Form.Label>
              <div className="custom-input-group">
                <FiLock className="input-icon" size={18} />
                <Form.Control
                  type="password"
                  className={`custom-input ${passwordError ? 'is-invalid' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {passwordError && (
                <div className="d-flex align-items-center mt-2" style={{ color: '#dc3545', fontSize: '0.875rem' }}>
                  <FiAlertCircle size={16} className="me-2 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
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

