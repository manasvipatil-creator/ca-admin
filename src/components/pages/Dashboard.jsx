// src/components/pages/Dashboard.js
import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Table, ProgressBar, Spinner } from "react-bootstrap";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { clientHelpers, documentHelpers, firestoreHelpers } from "../../utils/firestoreHelpers";
import {
  FiUsers,
  FiFileText,
  FiCalendar,
  FiUser,
  FiMail,
  FiPhone,
  FiBarChart2,
  FiRefreshCw
} from "react-icons/fi";

const Dashboard = ({ goToClient, goToReports }) => {
  const { userEmail, getUserClientsRef, getClientYearsRef, getYearDocumentsRef } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [allDocuments, setAllDocuments] = useState([]);
  const [cachedTotal, setCachedTotal] = useState(null);
  const [fetchingDocs, setFetchingDocs] = useState(false);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    const clientsRef = getUserClientsRef();
    if (!clientsRef) {
      setLoading(false);
      return;
    }

    console.log("🔗 Setting up Firestore listener for clients in Dashboard");
    const unsubscribe = clientHelpers.subscribeToClients(
      clientsRef,
      (clientsList) => {
        console.log("📊 Dashboard: Received", clientsList.length, "clients from Firestore");

        // Debug: Log client data structure
        clientsList.forEach((client, index) => {
          console.log(`📋 Client ${index + 1} (${client.name}):`, client);
          if (client.documents) {
            console.log(`📄 Documents in ${client.name}:`, Object.keys(client.documents).length);
          }
          // Check for year-based structure
          const yearKeys = Object.keys(client).filter(key => /^\d{4}$/.test(key));
          if (yearKeys.length > 0) {
            console.log(`📅 Year keys in ${client.name}:`, yearKeys);
          }
        });

        setClients(clientsList);
        setLoading(false);
        setLastUpdated(new Date());
      },
      (error) => {
        console.error("❌ Dashboard: Firestore clients listener error:", error);
        setClients([]);
        setLoading(false);
      }
    );

    return () => {
      console.log("🧹 Dashboard: Cleaning up clients listener");
      if (unsubscribe) unsubscribe();
    };
  }, [userEmail, getUserClientsRef]);

  // Fetch all documents for all clients and years
  const fetchAllDocuments = async (clientsList) => {
    if (!clientsList || clientsList.length === 0) {
      setAllDocuments([]);
      return;
    }

    setFetchingDocs(true);
    try {
      const allDocs = [];

      for (const client of clientsList) {
        const clientContact = client.id; // Contact number is used as document ID

        // Get years collection for this client
        const yearsRef = getClientYearsRef(clientContact);
        if (!yearsRef) continue;

        try {
          // Get all years for this client
          const yearsSnapshot = await firestoreHelpers.getCollection(yearsRef);

          for (const yearDoc of yearsSnapshot) {
            const year = yearDoc.id;

            // Get documents for this year
            const documentsRef = getYearDocumentsRef(clientContact, year);
            if (!documentsRef) continue;

            try {
              const documents = await documentHelpers.getDocuments(documentsRef);

              // Add client info to each document
              documents.forEach(doc => {
                allDocs.push({
                  ...doc,
                  clientId: client.id,
                  clientName: client.name,
                  clientContact: clientContact,
                  year: year
                });
              });
            } catch (docError) {
              console.log(`📄 No documents found for ${client.name} - ${year}`);
            }
          }
        } catch (yearError) {
          console.log(`📅 No years found for client ${client.name}`);
        }
      }

      console.log("📊 Total documents fetched:", allDocs.length);
      setAllDocuments(allDocs);
    } catch (error) {
      console.error("❌ Error fetching all documents:", error);
      setAllDocuments([]);
    } finally {
      setFetchingDocs(false);
    }
  };

  // Fetch documents whenever clients change
  useEffect(() => {
    if (clients.length > 0) {
      fetchAllDocuments(clients);
      fetchAllYears(clients); // Also fetch years separately
    }
  }, [clients, getClientYearsRef, getYearDocumentsRef]);

  // Read cached total from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cachedTotalDocuments');
      if (raw !== null) {
        const val = parseInt(raw, 10);
        if (!isNaN(val)) setCachedTotal(val);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Fetch all years from Firestore years subcollection
  const fetchAllYears = async (clientsList) => {
    if (!clientsList || clientsList.length === 0) return;

    try {
      console.log("📅 Fetching years from Firestore subcollections...");

      for (const client of clientsList) {
        const clientContact = client.id; // Contact number is used as document ID

        // Get years collection for this client
        const yearsRef = getClientYearsRef(clientContact);
        if (!yearsRef) continue;

        try {
          // Get all years for this client from subcollection
          const yearsSnapshot = await firestoreHelpers.getCollection(yearsRef);
          console.log(`📅 Found ${yearsSnapshot.length} years in subcollection for ${client.name}`);

          // Update client's years array if it doesn't match subcollection
          if (yearsSnapshot.length > 0) {
            const subcollectionYears = yearsSnapshot.map(yearDoc => yearDoc.id);
            const clientYears = client.years || [];

            // Check if there are years in subcollection not in client.years
            const missingYears = subcollectionYears.filter(year => !clientYears.includes(year));
            if (missingYears.length > 0) {
              console.log(`📅 Found missing years in client.years for ${client.name}:`, missingYears);
              // Note: We don't update the client here, just log for debugging
            }
          }
        } catch (yearError) {
          console.log(`📅 No years subcollection found for client ${client.name}`);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching years:", error);
    }
  };

  // Compute document-based stats using fetched documents
  const docStats = useMemo(() => {
    const byYear = {};
    let total = 0;
    const currentYear = new Date().getFullYear();

    // Use the fetched documents from Firestore
    allDocuments.forEach((doc) => {
      // Skip placeholder documents
      if (doc.fileName === "placeholder.txt" ||
        (doc.docName && doc.docName.includes("Initial Setup")) ||
        (doc.name && doc.name.includes("Initial Setup"))) {
        return;
      }

      const year = String(doc?.year || "Unknown");
      byYear[year] = (byYear[year] || 0) + 1;
      total += 1;
    });

    // Also check clients directly for year-based structure
    clients.forEach((client) => {
      // Check for direct year properties in client (like 2024, 2023, etc.)
      Object.keys(client).forEach((key) => {
        // Check if key is a year (4 digits) or year range (like 2024-25)
        if (/^\d{4}(-\d{2})?$/.test(key)) {
          const yearData = client[key];
          if (yearData && typeof yearData === 'object') {
            // Count documents in this year
            const yearDocuments = yearData.documents || {};
            const realDocs = Object.values(yearDocuments).filter(doc =>
              doc.fileName !== "placeholder.txt" &&
              !(doc.docName || doc.name || "").includes("Initial Setup")
            );

            if (realDocs.length > 0) {
              byYear[key] = (byYear[key] || 0) + realDocs.length;
              total += realDocs.length;
            }
          }
        }
      });

      // IMPORTANT: Check years array property - this is where YearManagement stores years
      if (client.years && Array.isArray(client.years)) {
        client.years.forEach(yearId => {
          // Initialize year with 0 documents if not already counted
          if (!byYear[yearId]) {
            byYear[yearId] = 0;
          }
        });
      }

      // Check client.documents for year information
      if (client.documents) {
        Object.values(client.documents).forEach((doc) => {
          // Skip placeholder documents
          if (doc.fileName === "placeholder.txt" ||
            (doc.docName && doc.docName.includes("Initial Setup")) ||
            (doc.name && doc.name.includes("Initial Setup"))) {
            return;
          }

          const year = String(doc?.year || "Unknown");
          if (!allDocuments.find(d => d.id === doc.id)) { // Avoid double counting
            byYear[year] = (byYear[year] || 0) + 1;
            total += 1;
          }
        });
      }
    });

    const thisYear = byYear[String(currentYear)] || 0;
    const lastYear = byYear[String(currentYear - 1)] || 0;
    return { total, thisYear, lastYear, byYear, currentYear };
  }, [allDocuments, clients]);

  // Persist live total to localStorage whenever it changes
  useEffect(() => {
    try {
      if (typeof docStats !== 'undefined' && docStats.total !== undefined) {
        localStorage.setItem('cachedTotalDocuments', String(docStats.total));
        setCachedTotal(docStats.total);
      }
    } catch (e) {
      // ignore
    }
  }, [docStats && docStats.total]);

  // Recent clients (latest 5 by creation/update time)
  const recentClients = useMemo(() => {
    const clientsWithTime = clients.map(client => ({
      ...client,
      // Use updatedAt or createdAt timestamp, fallback to current time
      lastActivity: client.updatedAt?.seconds || client.createdAt?.seconds || Date.now() / 1000
    }));

    // Sort by last activity (most recent first)
    clientsWithTime.sort((a, b) => b.lastActivity - a.lastActivity);

    return clientsWithTime.slice(0, 5);
  }, [clients]);
  const yearOptions = useMemo(() => {
    const ys = Object.keys(docStats.byYear || {}).filter((y) => y && y !== "Unknown");

    // Custom sort function to handle both individual years and year ranges
    ys.sort((a, b) => {
      // Extract the starting year from year strings
      const getStartYear = (yearStr) => {
        if (/^\d{4}-\d{2}$/.test(yearStr)) {
          // Year range like "2024-25"
          return parseInt(yearStr.split('-')[0]);
        } else if (/^\d{4}$/.test(yearStr)) {
          // Individual year like "2024"
          return parseInt(yearStr);
        }
        return 0; // For any other format
      };

      return getStartYear(b) - getStartYear(a); // Sort descending
    });

    return ys;
  }, [docStats]);

  const selectedYearCount = useMemo(() => {
    if (!selectedYear) return docStats.total;
  }, [docStats, selectedYear]);

  return (
    <div style={{
      background: '#f8f9fa',
      minHeight: '100vh',
      padding: '0'
    }}>
      {/* Header removed per request */}

      <div className="container-fluid" style={{ padding: '32px 40px' }}>
        {/* Clean KPI Cards */}
        <Row className="g-4 mb-4">
          <Col lg={6}>
            <Card style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
              onClick={() => {
                if (typeof goToClient === 'function') {
                  goToClient();
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}>
              <Card.Body style={{ padding: '28px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '10px'
                    }}>
                      Total Clients
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#1e293b',
                      lineHeight: '1'
                    }}>
                      {loading ? <Spinner size="sm" /> : clients.length}
                    </div>
                  </div>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#667eea',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiUsers size={28} color="white" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease'
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#f59e0b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}>
              <Card.Body style={{ padding: '28px' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div style={{
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '10px'
                    }}>
                      Total Documents (Yearwise)
                    </div>
                    <div style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#1e293b',
                      lineHeight: '1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{(fetchingDocs && cachedTotal !== null) ? cachedTotal : docStats.total}</span>
                      {fetchingDocs && (
                        <Spinner animation="border" size="sm" />
                      )}
                    </div>
                  </div>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#f59e0b',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FiFileText size={28} color="white" />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>


        <Row className="g-4">
          {/* Year-wise snapshot */}
          <Col lg={4}>
            <Card style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              background: 'white',
              overflow: 'hidden'
            }}>
              <Card.Header style={{
                background: '#f8f9fa',
                color: '#1e293b',
                borderRadius: '0',
                padding: '20px 28px',
                border: 'none',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h5 className="mb-0 fw-semibold d-flex align-items-center" style={{ fontSize: '1rem' }}>
                  <FiBarChart2 className="me-2" size={20} />
                  Year-wise Snapshot
                </h5>
              </Card.Header>
              <Card.Body style={{ padding: '0' }}>
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{
                      background: 'white'
                    }}>
                      <tr>
                        <th style={{
                          padding: '16px 28px',
                          fontWeight: '600',
                          color: '#64748b',
                          border: 'none',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '0.85rem'
                        }}>
                          <FiCalendar className="me-2" size={15} />
                          YEAR
                        </th>
                        <th style={{
                          padding: '16px 28px',
                          fontWeight: '600',
                          color: '#64748b',
                          textAlign: 'end',
                          border: 'none',
                          borderBottom: '1px solid #e5e7eb',
                          fontSize: '0.85rem'
                        }}>
                          <FiFileText className="me-2" size={15} />
                          RECORDS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(docStats.byYear)
                        .sort((a, b) => {
                          // Extract the starting year from year strings for proper sorting
                          const getStartYear = (yearStr) => {
                            if (/^\d{4}-\d{2}$/.test(yearStr)) {
                              // Year range like "2024-25"
                              return parseInt(yearStr.split('-')[0]);
                            } else if (/^\d{4}$/.test(yearStr)) {
                              // Individual year like "2024"
                              return parseInt(yearStr);
                            }
                            return 0; // For any other format
                          };
                          return getStartYear(b[0]) - getStartYear(a[0]); // Sort descending (newest first)
                        })
                        .slice(0, 5) // Show only 5 most recent years, same as Recent Clients
                        .map(([y, count], index) => (
                          <tr key={y} style={{
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            transition: 'all 0.2s ease'
                          }}
                            onClick={() => {
                              try { localStorage.setItem('reportExportYear', y); } catch { }
                              if (typeof goToReports === 'function') goToReports();
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                            }}>
                            <td style={{
                              padding: '16px 28px',
                              fontWeight: '500',
                              color: '#1e293b',
                              border: 'none',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <span style={{
                                background: '#667eea',
                                color: 'white',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>{y}</span>
                            </td>
                            <td style={{
                              padding: '16px 28px',
                              textAlign: 'end',
                              fontWeight: '700',
                              color: '#1e293b',
                              fontSize: '1.1rem',
                              border: 'none',
                              borderBottom: '1px solid #e5e7eb'
                            }}>{count}</td>
                          </tr>
                        ))}
                      {Object.keys(docStats.byYear).length === 0 && (
                        <tr>
                          <td colSpan={2} style={{
                            padding: '40px 24px',
                            textAlign: 'center',
                            color: '#6c757d',
                            fontSize: '1.1rem',
                            border: 'none'
                          }}>
                            <div>
                              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                                <FiBarChart2 size={48} color="#6c757d" />
                              </div>
                              <div>No data available</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Recent clients */}
          <Col lg={8}>
            <Card style={{
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              background: 'white',
              overflow: 'hidden',
              height: '100%'
            }}>
              <Card.Header style={{
                background: '#f8f9fa',
                color: '#1e293b',
                borderRadius: '0',
                padding: '20px 28px',
                border: 'none',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h5 className="mb-0 fw-semibold d-flex align-items-center" style={{ fontSize: '1rem' }}>
                  <FiUsers className="me-2" size={20} />
                  Recent Clients
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {recentClients.length === 0 ? (
                  <div style={{
                    padding: '40px 24px',
                    textAlign: 'center',
                    color: '#6c757d',
                    fontSize: '1.1rem'
                  }}>
                    <div>
                      <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
                        <FiUsers size={48} color="#6c757d" />
                      </div>
                      <div style={{ fontWeight: '500', marginBottom: '8px' }}>No recent clients</div>
                      <div style={{ fontSize: '0.9rem', color: '#adb5bd' }}>Add your first client to get started</div>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="mb-0">
                      <thead style={{
                        background: 'white'
                      }}>
                        <tr>
                          <th style={{
                            padding: '16px 28px',
                            fontWeight: '600',
                            color: '#64748b',
                            border: 'none',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.85rem'
                          }}>
                            <FiUser className="me-2" size={15} />
                            NAME
                          </th>
                          <th style={{
                            padding: '16px 28px',
                            fontWeight: '600',
                            color: '#64748b',
                            border: 'none',
                            borderBottom: '1px solid #e5e7eb',
                            fontSize: '0.85rem'
                          }}>
                            <FiMail className="me-2" size={15} />
                            CONTACT
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentClients.map((client, i) => (
                          <tr key={client.id || i}
                            style={{
                              backgroundColor: 'white',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (typeof goToClient === 'function') {
                                goToClient(client.id);
                              }
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f8f9fa';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'white';
                            }}>
                            <td style={{
                              padding: '16px 28px',
                              fontWeight: '500',
                              color: '#1e293b',
                              border: 'none',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <div className="d-flex align-items-center">
                                <div style={{
                                  width: '60px',
                                  height: '40px',
                                  background: '#667eea',
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '14px',
                                  fontSize: '0.9rem',
                                  fontWeight: '600',
                                  color: 'white'
                                }}>
                                  {client.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '3px', color: '#1e293b' }}>{client.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    PAN: {client.pan || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{
                              padding: '16px 28px',
                              border: 'none',
                              borderBottom: '1px solid #e5e7eb'
                            }}>
                              <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ marginBottom: '3px', color: '#1e293b' }}>{client.email || 'No email'}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                  {client.contact || 'No contact'}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;
