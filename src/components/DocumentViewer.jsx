import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from 'react-bootstrap';
import { storage } from '../firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import './DocumentViewer.css';

// Import react-pdf styles (correct paths for v10)
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - use CDN for react-pdf v10
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Helper function to detect Firebase Storage URLs
const isFirebaseUrl = (url = "") =>
  url.startsWith("https://firebasestorage.googleapis.com/");

const DocumentViewer = ({ fileUrl, fileData, fileType, fileName, storagePath, forceInlinePreview = false }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  // Fetch download URL from Firebase Storage (signed URLs bypass CORS)
  useEffect(() => {
    const fetchFileUrl = async () => {
      console.log("🔄 fetchFileUrl called with:", {
        hasFileData: !!fileData,
        hasStoragePath: !!storagePath,
        hasFileUrl: !!fileUrl,
        fileUrl: fileUrl
      });

      // If we have fileData (base64), use it directly
      if (fileData) {
        console.log("✅ Using fileData directly (base64)");
        setBlobUrl(fileData);
        return;
      }

      // If we have storagePath, get download URL using Firebase SDK
      if (storagePath) {
        setIsLoadingPdf(true);
        try {
          console.log("📥 Getting download URL from Firebase Storage using storagePath:", storagePath);
          const fileRef = storageRef(storage, storagePath);

          // Get a signed download URL with auth token (bypasses CORS!)
          const downloadUrl = await getDownloadURL(fileRef);
          console.log("✅ Got signed download URL from storagePath");

          setBlobUrl(downloadUrl);
          setIsLoadingPdf(false);
        } catch (error) {
          console.error("❌ Failed to get download URL from storagePath:", error);
          setPdfError("Failed to load file. Please try downloading instead.");
          setIsLoadingPdf(false);
        }
      } else if (fileUrl) {
        setIsLoadingPdf(true);

        try {
          console.log("🔍 Processing fileUrl:", fileUrl);

          // Firebase Storage URL pattern: 
          // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
          if (fileUrl.includes('firebasestorage.googleapis.com')) {
            console.log("🔥 Detected Firebase Storage URL");

            // Check if URL already has a token (signed URL)
            if (fileUrl.includes('token=')) {
              console.log("✅ URL already has auth token, using directly");
              setBlobUrl(fileUrl);
              setIsLoadingPdf(false);
              return;
            }

            // If no token, try to get a fresh signed URL from storage path
            console.log("🔑 No token found, extracting path to get signed URL...");
            const urlParts = fileUrl.split('/o/')[1];
            if (urlParts) {
              const encodedPath = urlParts.split('?')[0];
              const decodedPath = decodeURIComponent(encodedPath);

              console.log("📍 Extracted storage path:", decodedPath);

              // Use Firebase SDK to get signed download URL
              const fileRef = storageRef(storage, decodedPath);
              const downloadUrl = await getDownloadURL(fileRef);
              console.log("✅ Got signed download URL from extracted path");

              setBlobUrl(downloadUrl);
              setIsLoadingPdf(false);
              return;
            }
          }

          // For non-Firebase URLs, use directly
          console.log("🌐 Using non-Firebase URL directly");
          setBlobUrl(fileUrl);
          setIsLoadingPdf(false);
        } catch (error) {
          console.error("❌ Failed to process URL:", error);
          console.error("❌ Error details:", {
            message: error.message,
            name: error.name
          });

          // Fallback - try using the original URL
          console.warn("⚠️ Fallback: using original fileUrl");
          setBlobUrl(fileUrl);
          setPdfError(null); // Clear error and try anyway
          setIsLoadingPdf(false);
        }
      } else {
        console.warn("⚠️ No file source available (no fileData, storagePath, or fileUrl)");
        setPdfError("No file source available");
      }
    };

    fetchFileUrl();

    // Cleanup blob URL on unmount
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [fileUrl, fileData, storagePath]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfError(null);
    console.log("✅ PDF loaded successfully, pages:", numPages);
  };

  const onDocumentLoadError = (error) => {
    console.error("❌ PDF load error:", error);
    setPdfError(error.message || "Failed to load PDF");
  };

  const goToPrevPage = () => {
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2.0));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  // Determine file source - use blobUrl which contains the signed URL
  const fileSrc = blobUrl;

  // Log what we're using for the PDF
  useEffect(() => {
    if (fileSrc) {
      console.log("📄 Using fileSrc for PDF:", fileSrc);
      console.log("📄 fileSrc type:", typeof fileSrc);
      console.log("📄 fileSrc starts with blob:", fileSrc.startsWith('blob:'));
      console.log("📄 fileSrc starts with http:", fileSrc.startsWith('http'));
    }
  }, [fileSrc]);

  // 🔥 Handle Firebase URLs without base64 - open in new tab to bypass CORS/CSP
  // BUT if forceInlinePreview is true, skip this and let it fallback to iframe
  if (!fileData && fileSrc && isFirebaseUrl(fileSrc) && !forceInlinePreview) {
    console.log("🌍 Firebase URL detected without base64, opening in new tab:", fileSrc);

    // Only open once (avoid re-renders opening multiple tabs)
    if (!window.__lastOpenedPdf || window.__lastOpenedPdf !== fileSrc) {
      window.__lastOpenedPdf = fileSrc;
      window.open(fileSrc, "_blank", "noopener,noreferrer");
    }

    return (
      <div style={{ padding: 16 }}>
        <div className="alert alert-info">
          <h5>📄 Document Opened in New Tab</h5>
          <p>
            This document is opened in a new tab because inline preview is blocked by
            browser security (CORS/CSP).
          </p>
          <p className="mb-0">
            If it didn't open automatically,{" "}
            <a href={fileSrc} target="_blank" rel="noopener noreferrer" className="alert-link">
              click here to open the PDF
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // Check if it's an image
  const isImage = fileType?.startsWith('image/') ||
    fileName?.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i) ||
    (fileData && fileData.startsWith('data:image/'));

  // Check if it's a PDF
  const isPdf = fileType?.includes('pdf') ||
    fileName?.endsWith('.pdf') ||
    (fileData && fileData.startsWith('data:application/pdf'));

  if (isImage) {
    if (isLoadingPdf) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Loading image...</span>
          </div>
          <div className="small text-muted">Loading image from storage...</div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <img
          src={fileSrc}
          alt={fileName}
          style={{
            maxWidth: '100%',
            maxHeight: '600px',
            objectFit: 'contain',
            borderRadius: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          onError={(e) => {
            console.error("❌ Image failed to load");
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
        <div style={{ display: 'none' }} className="alert alert-warning mt-3">
          ⚠️ Unable to display image. The file may be corrupted or the URL may be invalid.
        </div>
      </div>
    );
  }

  if (isPdf) {
    // If there's a PDF error, show iframe instead (works with Firebase signed URLs)
    if (pdfError && blobUrl) {
      console.log("⚠️ PDF.js failed, using iframe fallback for:", blobUrl);
      return (
        <div className="pdf-viewer-container">
          <div className="alert alert-info mb-3">
            <strong>ℹ️ Using alternate PDF viewer</strong>
            <div className="small mt-1">The PDF is displayed using your browser's built-in viewer.</div>
          </div>

          {/* PDF in iframe - works with Firebase signed URLs without CORS */}
          <div style={{
            width: '100%',
            height: '600px',
            border: '1px solid #dee2e6',
            borderRadius: '5px',
            overflow: 'hidden'
          }}>
            <iframe
              src={blobUrl}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              title={fileName}
            />
          </div>

          <div className="mt-3 text-center">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                window.open(blobUrl, '_blank');
              }}
            >
              📥 Open in New Tab
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="pdf-viewer-container">
        {isLoadingPdf ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-2" role="status">
              <span className="visually-hidden">Loading PDF...</span>
            </div>
            <div className="small text-muted">Fetching PDF from storage...</div>
          </div>
        ) : pdfError ? (
          <div className="alert alert-danger">
            <strong>❌ Error loading PDF:</strong> {pdfError}
            <div className="mt-2">
              <small>Try downloading the file instead.</small>
            </div>
            {(blobUrl || fileUrl) && (
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = blobUrl || fileUrl;
                    link.download = fileName;
                    link.target = '_blank';
                    link.click();
                  }}
                >
                  📥 Download PDF
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* PDF Controls */}
            <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded">
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                >
                  🔍−
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={zoomIn}
                  disabled={scale >= 2.0}
                >
                  🔍+
                </Button>
                <span className="align-self-center small text-muted">
                  {Math.round(scale * 100)}%
                </span>
              </div>

              {numPages && (
                <div className="d-flex gap-2 align-items-center">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                  >
                    ← Prev
                  </Button>
                  <span className="small">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </div>

            {/* PDF Document */}
            <div className="pdf-document-wrapper" style={{
              maxHeight: '500px',
              overflow: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '5px',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <Document
                file={fileSrc}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                options={{
                  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                  cMapPacked: true,
                  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
                }}
                loading={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-2" role="status">
                      <span className="visually-hidden">Loading PDF...</span>
                    </div>
                    <div className="small text-muted">Loading PDF...</div>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            </div>
          </>
        )}
      </div>
    );
  }

  // For other file types
  return (
    <div className="text-center p-4">
      <div className="mb-3">
        <div style={{ fontSize: '4rem', color: '#6c757d' }}>📄</div>
      </div>
      <div className="mb-2">
        <strong>File:</strong> {fileName}
      </div>
      <div className="small text-muted mb-3">
        {fileType || 'Unknown file type'}
      </div>
      <div className="small text-warning">
        <em>Preview not available for this file type</em>
      </div>
      {fileSrc && (
        <div className="mt-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const link = document.createElement('a');
              link.href = fileSrc;
              link.download = fileName;
              link.click();
            }}
          >
            📥 Download File
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
