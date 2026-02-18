// src/components/Layout.js
import React from "react";
import { Container, Row, Col, Nav, Navbar } from "react-bootstrap";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FiHome, FiUsers, FiImage, FiBell, FiLogOut, FiUser } from 'react-icons/fi';

const Layout = ({ onLogout, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userEmail } = useAuth();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Function to capitalize first letter of the username
  const getCapitalizedUsername = (email) => {
    if (!email) return 'Admin';
    const username = email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh'
    }}>
      {/* Sidebar - Fixed */}
      <div style={{
        width: '250px',
        background: 'linear-gradient(180deg, #2c3e50 0%, #34495e 100%)',
        minHeight: '100vh',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto',
        boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div className="p-4">
          <div className="text-center mb-4">
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto 16px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img
                src="/ca.jpeg"
                alt="CA Admin"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/80?text=CA";
                }}
              />
            </div>
            <h4 style={{
              color: 'white',
              fontWeight: '700',
              fontSize: '1.3rem',
              marginBottom: '4px',
              letterSpacing: '0.5px'
            }}>CA Admin</h4>
            <p style={{
              color: '#bdc3c7',
              fontSize: '0.85rem',
              margin: '0'
            }}>Management Panel</p>
            {userEmail && (
              <div style={{
                marginTop: '12px',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '0.8rem',
                color: '#ecf0f1',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                wordBreak: 'break-word'
              }}>
                <FiUser size={14} /> {userEmail}
              </div>
            )}
          </div>

          <Nav className="flex-column" style={{ marginTop: '20px' }}>
            <Nav.Link
              onClick={() => navigate("/admin/dashboard")}
              className="sidebar-nav-link"
              style={{
                color: 'white',
                cursor: 'pointer',
                padding: '12px 16px',
                margin: '4px 0',
                borderRadius: '10px',
                background: isActive("/admin/dashboard")
                  ? 'linear-gradient(45deg, #667eea, #764ba2)'
                  : 'transparent',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                boxShadow: isActive("/admin/dashboard")
                  ? '0 4px 15px rgba(102, 126, 234, 0.3)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/dashboard")) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/dashboard")) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <FiHome size={18} />
              <span>Dashboard</span>
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate("/admin/clients")}
              className="sidebar-nav-link"
              style={{
                color: 'white',
                cursor: 'pointer',
                padding: '12px 16px',
                margin: '4px 0',
                borderRadius: '10px',
                background: isActive("/admin/clients")
                  ? 'linear-gradient(45deg, #667eea, #764ba2)'
                  : 'transparent',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                boxShadow: isActive("/admin/clients")
                  ? '0 4px 15px rgba(102, 126, 234, 0.3)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/clients")) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/clients")) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <FiUsers size={18} />
              <span>Client Management</span>
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate("/admin/banners")}
              className="sidebar-nav-link"
              style={{
                color: 'white',
                cursor: 'pointer',
                padding: '12px 16px',
                margin: '4px 0',
                borderRadius: '10px',
                background: isActive("/admin/banners")
                  ? 'linear-gradient(45deg, #667eea, #764ba2)'
                  : 'transparent',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                boxShadow: isActive("/admin/banners")
                  ? '0 4px 15px rgba(102, 126, 234, 0.3)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/banners")) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/banners")) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <FiImage size={18} />
              <span>Banner Management</span>
            </Nav.Link>
            <Nav.Link
              onClick={() => navigate("/admin/notifications")}
              className="sidebar-nav-link"
              style={{
                color: 'white',
                cursor: 'pointer',
                padding: '12px 16px',
                margin: '4px 0',
                borderRadius: '10px',
                background: isActive("/admin/notifications")
                  ? 'linear-gradient(45deg, #667eea, #764ba2)'
                  : 'transparent',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                boxShadow: isActive("/admin/notifications")
                  ? '0 4px 15px rgba(102, 126, 234, 0.3)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (!isActive("/admin/notifications")) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive("/admin/notifications")) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <FiBell size={18} />
              <span>Notifications</span>
            </Nav.Link>
          </Nav>
        </div>
      </div>

      {/* Main Content Area - With left margin to account for fixed sidebar */}
      <div style={{
        marginLeft: '250px',
        width: 'calc(100% - 250px)',
        minHeight: '100vh'
      }}>
        <Container fluid>
          <Row>
            <Col md={12}>
              {/* Header */}
              <div style={{
                position: 'fixed',
                top: 0,
                left: '250px',
                right: 0,
                zIndex: 900,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                padding: '20px 32px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                borderBottom: '1px solid rgba(0,0,0,0.05)'
              }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 style={{
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontWeight: '700',
                      marginBottom: '4px',
                      fontSize: '1.8rem'
                    }}>
                      Welcome, {getCapitalizedUsername(userEmail)}
                    </h2>
                    <p style={{
                      color: '#64748b',
                      marginBottom: '0',
                      fontSize: '0.95rem'
                    }}>
                      Your personal CA Firm dashboard
                    </p>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.3rem',
                      fontWeight: '700',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                    }}>
                      {getCapitalizedUsername(userEmail).charAt(0)}
                    </div>
                    <button
                      style={{
                        background: 'linear-gradient(45deg, #ff6b6b, #ee5a52)',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px 20px',
                        color: 'white',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onClick={() => {
                        if (typeof onLogout === "function") onLogout();
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.2)';
                      }}
                    >
                      <FiLogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div style={{ padding: '10px 30px 30px 30px', marginTop: '115px' }}>
                {children}
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  );
};

export default Layout;
