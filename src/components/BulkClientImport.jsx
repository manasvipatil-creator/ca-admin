import React, { useState, useCallback } from 'react';
import { Button, Alert, Table, ProgressBar, Badge } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { clientHelpers } from '../utils/firestoreHelpers';
import { useAuth } from '../contexts/AuthContext';

const BulkClientImport = ({ onImportComplete, onClose }) => {
  const { userEmail, getUserClientsRef, getSafeEmail } = useAuth();
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [error, setError] = useState('');

  // Validation function for individual client data
  const validateClientData = (client) => {
    const errors = [];

    // Name validation
    if (!client.name || client.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (client.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (client.name.trim().length > 100) {
      errors.push('Name must be less than 100 characters');
    } else if (!/^[a-zA-Z\s.'-]+$/.test(client.name.trim())) {
      errors.push('Name can only contain letters, spaces, dots, apostrophes, and hyphens');
    }

    // Contact validation
    if (!client.contact || client.contact.toString().trim().length === 0) {
      errors.push('Contact number is required');
    } else {
      const digitsOnly = client.contact.toString().replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        errors.push('Contact number must be exactly 10 digits');
      } else if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
        errors.push('Contact number must start with 6, 7, 8, or 9');
      }
    }

    // PAN validation
    if (!client.pan || client.pan.toString().trim().length === 0) {
      errors.push('PAN number is required');
    } else {
      const sanitizedPAN = client.pan.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(sanitizedPAN)) {
        errors.push('PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)');
      }
    }

    // Email validation
    if (!client.email || client.email.toString().trim().length === 0) {
      errors.push('Email address is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(client.email.toString().trim())) {
        errors.push('Please enter a valid email address');
      } else if (client.email.toString().trim().length > 254) {
        errors.push('Email address is too long');
      }
    }

    return errors;
  };

  // Parse Excel/CSV file
  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          setError('File must contain at least a header row and one data row');
          return;
        }

        // Assume first row is header
        const headers = jsonData[0].map(h => h.toString().toLowerCase().trim());
        const dataRows = jsonData.slice(1);

        // Map common header variations to our expected fields
        const headerMap = {
          name: ['name', 'client name', 'client_name', 'clientname', 'full name', 'fullname'],
          contact: ['contact', 'phone', 'mobile', 'contact number', 'phone number', 'mobile number', 'contact_number', 'phone_number', 'mobile_number'],
          pan: ['pan', 'pan number', 'pan_number', 'pannumber'],
          email: ['email', 'email address', 'email_address', 'emailaddress', 'mail']
        };

        // Find column indices for each field
        const columnIndices = {};
        Object.keys(headerMap).forEach(field => {
          const index = headers.findIndex(header =>
            headerMap[field].some(variation => header.includes(variation))
          );
          columnIndices[field] = index;
        });

        // Check if all required fields are found
        const missingFields = Object.keys(columnIndices).filter(field => columnIndices[field] === -1);
        if (missingFields.length > 0) {
          setError(`Missing required columns: ${missingFields.join(', ')}. Please ensure your file has columns for Name, Contact, PAN, and Email.`);
          return;
        }

        // Parse data rows
        const clients = dataRows
          .filter(row => row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== ''))
          .map((row, index) => {
            const client = {
              name: row[columnIndices.name]?.toString().trim() || '',
              contact: row[columnIndices.contact]?.toString().trim() || '',
              pan: row[columnIndices.pan]?.toString().trim().toUpperCase() || '',
              email: row[columnIndices.email]?.toString().trim().toLowerCase() || ''
            };
            
            const errors = validateClientData(client);
            return { ...client, errors, isValid: errors.length === 0 };
          });

        if (clients.length === 0) {
          setError('No valid data rows found in the file');
          return;
        }

        setParsedData(clients);
        setError('');

      } catch (err) {
        console.error('Error parsing file:', err);
        setError('Error parsing file. Please ensure it\'s a valid Excel (.xlsx) or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      parseFile(file);
    }
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: false
  });

  // Import valid clients
  const handleImport = async () => {
    const validClients = parsedData.filter(client => client.isValid);

    if (validClients.length === 0) {
      setError('No valid clients to import. Please fix the validation errors first.');
      return;
    }

    const clientsRef = getUserClientsRef();
    if (!clientsRef) {
      setError('Unable to determine user path. Please try logging in again.');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const results = { success: [], failed: [] };

    for (let i = 0; i < validClients.length; i++) {
      const client = validClients[i];

      try {
        const firmId = getSafeEmail(userEmail);
        await clientHelpers.createClient(clientsRef, {
          name: client.name,
          contact: client.contact,
          pan: client.pan,
          email: client.email,
          firmId,
          isActive: true
        });

        results.success.push(client.name);
      } catch (error) {
        console.error(`Failed to import client ${client.name}:`, error);
        results.failed.push({ name: client.name, error: error.message });
      }

      setImportProgress(((i + 1) / validClients.length) * 100);
    }

    setImportResults(results);
    setImporting(false);

    if (results.success.length > 0 && onImportComplete) {
      onImportComplete();
    }
  };

  const resetImport = () => {
    setParsedData([]);
    setImportResults(null);
    setImportProgress(0);
    setError('');
  };

  // Generate and download sample Excel file
  const downloadSampleExcel = () => {
    // Sample data with proper format
    const sampleData = [
      ['Name', 'Contact', 'PAN', 'Email'],
      ['John Doe', '9876543210', 'ABCDE1234F', 'john.doe@example.com'],
      ['Jane Smith', '8765432109', 'FGHIJ5678K', 'jane.smith@example.com'],
      ['Robert Brown', '7654321098', 'LMNOP9012Q', 'robert.brown@example.com'],
      ['Alice Johnson', '6543210987', 'RSTUV3456W', 'alice.johnson@example.com'],
      ['Michael Davis', '9123456780', 'XYZAB7890C', 'michael.davis@example.com']
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 20 }, // Name
      { width: 15 }, // Contact
      { width: 15 }, // PAN
      { width: 25 }  // Email
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

    // Generate and download file
    XLSX.writeFile(workbook, 'sample_clients.xlsx');
  };

  const validCount = parsedData.filter(client => client.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="bulk-import-container">
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {!parsedData.length && !importResults && (
        <div>
          <Alert variant="info" className="mb-3">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>📋 File Format Requirements:</strong>
                <ul className="mb-0 mt-2">
                  <li>Excel (.xlsx, .xls) or CSV (.csv) files supported</li>
                  <li>First row should contain headers: Name, Contact, PAN, Email</li>
                  <li>Contact: 10-digit number starting with 6-9</li>
                  <li>PAN: Format ABCDE1234F (5 letters + 4 digits + 1 letter)</li>
                  <li>Email: Valid email address</li>
                </ul>
              </div>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={downloadSampleExcel}
                className="ms-3"
                style={{ minWidth: '160px' }}
              >
                📥 Download Sample Excel
              </Button>
            </div>
          </Alert>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded p-4 text-center ${
              isDragActive ? 'border-primary bg-light' : 'border-secondary'
            }`}
            style={{ cursor: 'pointer', minHeight: '150px' }}
          >
            <input {...getInputProps()} />
            <div className="d-flex flex-column align-items-center justify-content-center h-100">
              <i className="fas fa-cloud-upload-alt fa-3x text-muted mb-3"></i>
              {isDragActive ? (
                <p className="mb-0 text-primary">Drop the file here...</p>
              ) : (
                <div>
                  <p className="mb-2">Import Excel or CSV file here</p>
                  <p className="text-muted mb-0">or click to select file</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {parsedData.length > 0 && !importResults && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <Badge bg="success" className="me-2">{validCount} Valid</Badge>
              <Badge bg="danger" className="me-2">{invalidCount} Invalid</Badge>
              <span className="text-muted">Total: {parsedData.length}</span>
            </div>
            <div>
              <Button variant="outline-secondary" size="sm" onClick={resetImport} className="me-2">
                🔄 Reset
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImport}
                disabled={validCount === 0 || importing}
              >
                {importing ? 'Importing...' : `Import ${validCount} Clients`}
              </Button>
            </div>
          </div>

          {importing && (
            <div className="mb-3">
              <ProgressBar now={importProgress} label={`${Math.round(importProgress)}%`} />
            </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>PAN</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((client, index) => (
                  <tr key={index} className={client.isValid ? '' : 'table-danger'}>
                    <td>{index + 1}</td>
                    <td>{client.name}</td>
                    <td>{client.contact}</td>
                    <td>{client.pan}</td>
                    <td>{client.email}</td>
                    <td>
                      {client.isValid ? (
                        <Badge bg="success">✓ Valid</Badge>
                      ) : (
                        <div>
                          <Badge bg="danger">✗ Invalid</Badge>
                          <div className="small text-danger mt-1">
                            {client.errors.map((error, i) => (
                              <div key={i}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      {importResults && (
        <div>
          <Alert variant={importResults.failed.length === 0 ? 'success' : 'warning'}>
            <h6>Import Complete!</h6>
            <p className="mb-0">
              ✅ Successfully imported: {importResults.success.length} clients<br/>
              {importResults.failed.length > 0 && (
                <>❌ Failed to import: {importResults.failed.length} clients</>
              )}
            </p>
          </Alert>

          {importResults.failed.length > 0 && (
            <Alert variant="danger">
              <h6>Failed Imports:</h6>
              <ul className="mb-0">
                {importResults.failed.map((failed, index) => (
                  <li key={index}>{failed.name}: {failed.error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="text-center">
            <Button variant="primary" onClick={resetImport}>
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkClientImport;
