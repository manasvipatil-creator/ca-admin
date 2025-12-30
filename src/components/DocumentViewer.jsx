import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button, Table, Spinner, ButtonGroup, Alert } from 'react-bootstrap';
import { storage } from '../firebase';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import './DocumentViewer.css';

// Import react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DocumentViewer = ({ fileUrl, fileData, fileType, fileName, storagePath }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [officeContent, setOfficeContent] = useState(null);
  const [officeType, setOfficeType] = useState(null);
  const [viewerType, setViewerType] = useState('google');

  const isDocx = fileName?.toLowerCase().endsWith('.docx');
  const isOldDoc = fileName?.toLowerCase().endsWith('.doc');
  const isWord = isDocx || isOldDoc;
  const isExcel = fileName?.match(/\.(xls|xlsx)$/i) || fileType?.includes('sheet');
  const isPdf = fileType?.includes('pdf') || fileName?.toLowerCase().endsWith('.pdf');
  const isImage = fileType?.startsWith('image/') || fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);

  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      setPdfError(null);
      setOfficeContent(null);

      try {
        let currentUrl = fileUrl;
        if (storagePath) {
          const fileRef = storageRef(storage, storagePath);
          currentUrl = await getDownloadURL(fileRef);
        }
        setBlobUrl(currentUrl || fileData);

        // Direct rendering for modern Office files (DOCX/XLSX)
        if ((currentUrl || fileData) && (isDocx || isExcel)) {
          try {
            const source = currentUrl || fileData;
            const response = await fetch(source);
            if (!response.ok) throw new Error("CORS");
            const arrayBuffer = await response.arrayBuffer();

            if (isDocx) {
              const result = await mammoth.convertToHtml({ arrayBuffer });
              setOfficeContent(result.value);
              setOfficeType('word');
              setViewerType('direct');
            } else if (isExcel) {
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              setOfficeContent(jsonData);
              setOfficeType('excel');
              setViewerType('direct');
            }
          } catch (err) {
            setViewerType('google');
          }
        }
      } catch (error) {
        setPdfError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [fileUrl, fileData, storagePath, fileName, isDocx, isExcel]);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted small">Opening Document...</p>
      </div>
    );
  }

  // --- RENDERING ---

  if (isWord || isExcel) {
    if (viewerType === 'direct' && officeContent) {
      return (
        <div className="bg-white p-4 border rounded shadow-sm overflow-auto" style={{ maxHeight: '75vh' }}>
          {officeType === 'word' ? (
            <div dangerouslySetInnerHTML={{ __html: officeContent }} style={{ fontFamily: 'serif', color: '#111', lineHeight: '1.6' }} />
          ) : (
            <Table striped bordered hover size="sm" className="mb-0">
              <tbody>
                {officeContent.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j} style={{ whiteSpace: 'nowrap' }}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      );
    }

    // ONLINE VIEWERS - Use high-compatibility URLs
    const encodedUrl = encodeURIComponent(blobUrl || '');
    const googleUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    const microsoftUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`;
    const iframeSrc = viewerType === 'google' ? googleUrl : microsoftUrl;

    return (
      <div className="office-viewer">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center">
            <span className="small text-muted fw-bold me-2">Preview Mode:</span>
            <ButtonGroup size="sm">
              <Button variant={viewerType === 'google' ? "primary" : "outline-secondary"} onClick={() => setViewerType('google')}>Google</Button>
              <Button variant={viewerType === 'microsoft' ? "primary" : "outline-secondary"} onClick={() => setViewerType('microsoft')}>Microsoft</Button>
            </ButtonGroup>
          </div>
          <Button variant="outline-primary" size="sm" onClick={() => window.open(blobUrl, '_blank')}>
            View in Full Browser
          </Button>
        </div>

        <div style={{ width: '100%', height: '60vh', borderRadius: '10px', overflow: 'hidden', border: '1px solid #dee2e6', background: '#fff' }}>
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title={fileName}
            key={viewerType}
          />
        </div>

        <Alert variant="info" className="mt-3 p-2 small text-center border-0 shadow-sm">
          If the preview above is blank, click <strong>"View in Full Browser"</strong> to see the document content.
        </Alert>

        <div className="text-center mt-3">
          <Button variant="success" size="sm" className="px-5 shadow-sm" onClick={() => window.open(blobUrl, '_blank')}>
            Download Original File
          </Button>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="text-center p-3 bg-white border rounded">
        <img src={blobUrl} alt={fileName} style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '4px' }} />
      </div>
    );
  }

  if (isPdf) {
    if (pdfError && pdfError !== "native") {
      return <iframe src={blobUrl} width="100%" height="600px" style={{ border: 'none', borderRadius: '8px' }} title={fileName} />;
    }
    return (
      <div className="pdf-viewer">
        <div className="d-flex justify-content-between align-items-center mb-2 p-2 bg-secondary text-white rounded shadow-sm">
          <div className="small fw-bold">Page {pageNumber} of {numPages || '?'}</div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="light" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Previous</Button>
            <Button size="sm" variant="light" onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))} disabled={pageNumber >= (numPages || 1)}>Next</Button>
          </div>
        </div>
        <div className="p-2 bg-dark rounded overflow-auto d-flex justify-content-center shadow-lg" style={{ maxHeight: '60vh' }}>
          <Document file={blobUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} onLoadError={(e) => setPdfError(e.message)}>
            <Page pageNumber={pageNumber} scale={1.2} />
          </Document>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-5 border rounded bg-light">
      <div style={{ fontSize: '4rem', opacity: 0.1 }}>📄</div>
      <h6 className="mt-3 font-weight-bold text-dark">{fileName}</h6>
      <p className="small text-muted mb-4">No online preview available for this file type.</p>
      <Button variant="primary" className="shadow-sm" onClick={() => window.open(blobUrl, '_blank')}>Download File</Button>
    </div>
  );
};

export default DocumentViewer;
