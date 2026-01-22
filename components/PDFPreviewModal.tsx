'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, RotateCcw, CheckCircle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import dynamic from 'next/dynamic';

const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);

if (typeof window !== 'undefined') {
  import('react-pdf').then((pdfjs) => {
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
  });
}

interface PDFPreviewModalProps {
  pdfUrl: string;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing?: boolean;
  highlights?: Array<{
    id: string;
    page: number;
    keyText: string;
    confidence: number;
    boundingBox: { Left: number; Top: number; Width: number; Height: number };
  }>;
  onNudge?: (fieldId: string, delta: { dxRatio: number; dyRatio: number }) => void;
  templateMode?: boolean;
  templateId?: string;
}

export default function PDFPreviewModal({
  pdfUrl,
  onClose,
  onConfirm,
  isProcessing = false,
  highlights = [],
  onNudge,
  templateMode = false,
  templateId = '',
}: PDFPreviewModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [localNudges, setLocalNudges] = useState<Record<string, { dxRatio: number; dyRatio: number }>>({});
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const fieldsOnCurrentPage = useMemo(() => {
    return highlights.filter((h) => h.page === pageNumber);
  }, [highlights, pageNumber]);

  const selectedField = useMemo(() => {
    if (!selectedFieldId) return null;
    return highlights.find((h) => h.id === selectedFieldId) || null;
  }, [highlights, selectedFieldId]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF load error:', error);
    setLoading(false);
    setError('Failed to load PDF preview');
  }

  function updateCanvasSize() {
    const root = canvasContainerRef.current;
    if (!root) return;
    const canvas = root.querySelector('canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }

  function nudge(fieldId: string, dxPx: number, dyPx: number) {
    if (!canvasSize) return;
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;

    const dxRatio = dxPx / canvasSize.width;
    const dyRatio = dyPx / canvasSize.height;

    setLocalNudges(prev => {
      const current = prev[fieldId] || { dxRatio: 0, dyRatio: 0 };
      const updated = {
        dxRatio: current.dxRatio + dxRatio,
        dyRatio: current.dyRatio + dyRatio
      };
      
      if (onNudge) {
        onNudge(fieldId, updated);
      }
      
      return {
        ...prev,
        [fieldId]: updated
      };
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#0F172A]" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Preview Your Document</h2>
              {templateMode && templateId && (
                <p className="text-sm text-[#D4AF37]">✓ Template: {templateId}</p>
              )}
              {!templateMode && (
                <p className="text-sm text-white/70">AI-detected fields</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

            {/* PDF Viewer */}
            <div className="bg-[#F8FAFC] p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                <div className="flex justify-center">
                {loading && !error && (
                  <div className="flex items-center justify-center py-20">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-12 h-12 border-4 border-[#0F172A] border-t-[#D4AF37] rounded-full"
                    />
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center py-20 text-red-600">
                    <p>{error}</p>
                  </div>
                )}
                {!error && (
                  <div className="relative" ref={canvasContainerRef}>
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={onDocumentLoadError}
                      loading=""
                      className="shadow-lg"
                    >
                      <Page
                        pageNumber={pageNumber}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="border border-[#0F172A]/10"
                        width={800}
                        onRenderSuccess={() => {
                          updateCanvasSize();
                        }}
                      />
                    </Document>

                    {canvasSize && fieldsOnCurrentPage.map((f) => {
                      const dx = (localNudges[f.id]?.dxRatio ?? 0) * canvasSize.width;
                      const dy = (localNudges[f.id]?.dyRatio ?? 0) * canvasSize.height;

                      const left = f.boundingBox.Left * canvasSize.width + dx;
                      const top = f.boundingBox.Top * canvasSize.height + dy;
                      const width = f.boundingBox.Width * canvasSize.width;
                      const height = f.boundingBox.Height * canvasSize.height;
                      const isSelected = f.id === selectedFieldId;

                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFieldId(f.id)}
                          className={
                            "absolute rounded-sm border transition-colors " +
                            (isSelected
                              ? "border-[#D4AF37] bg-[#D4AF37]/25"
                              : "border-yellow-400/60 bg-yellow-200/20 hover:bg-yellow-200/30")
                          }
                          style={{ left, top, width, height }}
                          title={`${f.keyText} (${Math.round(f.confidence)}%)`}
                        />
                      );
                    })}
                  </div>
                )}
                </div>

                <div className="bg-white rounded-lg border border-[#0F172A]/10 p-4 h-fit">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[#0F172A]">Detected fields</div>
                    <div className="text-xs text-[#0F172A]/60">Click a field to jump</div>
                  </div>

                  <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                    {highlights.length === 0 && (
                      <div className="text-sm text-[#0F172A]/60">No fields detected.</div>
                    )}

                    {highlights.map((f) => {
                      const isSelected = f.id === selectedFieldId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setSelectedFieldId(f.id);
                            setPageNumber(f.page);
                          }}
                          className={
                            "w-full text-left rounded-md border px-3 py-2 transition-colors " +
                            (isSelected
                              ? "border-[#D4AF37] bg-[#D4AF37]/10"
                              : "border-[#0F172A]/10 hover:bg-[#0F172A]/5")
                          }
                        >
                          <div className="text-xs text-[#0F172A]/60">Page {f.page}</div>
                          <div className="text-sm font-medium text-[#0F172A]">{f.keyText}</div>
                          <div className={"text-xs " + ((f.confidence ?? 0) < 80 ? "text-red-600" : "text-[#059669]")}
                          >
                            Confidence: {Math.round(f.confidence ?? 0)}%
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t border-[#0F172A]/10 pt-4">
                    <div className="text-sm font-semibold text-[#0F172A] mb-2">Nudge</div>
                    <div className="text-xs text-[#0F172A]/60 mb-3">
                      Move selected field by 5px
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center justify-items-center">
                      <div />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedField || !canvasSize || selectedField.page !== pageNumber}
                        onClick={() => selectedField && nudge(selectedField.id, 0, -5)}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <div />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedField || !canvasSize || selectedField.page !== pageNumber}
                        onClick={() => selectedField && nudge(selectedField.id, -5, 0)}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedField || !canvasSize || selectedField.page !== pageNumber}
                        onClick={() => selectedField && nudge(selectedField.id, 5, 0)}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <div />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!selectedField || !canvasSize || selectedField.page !== pageNumber}
                        onClick={() => selectedField && nudge(selectedField.id, 0, 5)}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <div />
                    </div>

                    {!selectedField && (
                      <div className="mt-2 text-xs text-[#0F172A]/60">Select a field first.</div>
                    )}
                    {selectedField && selectedField.page !== pageNumber && (
                      <div className="mt-2 text-xs text-[#0F172A]/60">Jump to page {selectedField.page} to nudge.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Page Navigation */}
              {numPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-[#0F172A]/70">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-white border-t border-[#0F172A]/10 px-6 py-4 flex items-center justify-between gap-4">
              <div className="text-sm text-[#0F172A]/60">
                {templateMode ? 'Template-filled document ready' : 'Review the filled document carefully before downloading'}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={onConfirm}
                  disabled={isProcessing}
                  className="gap-2 bg-[#D4AF37] hover:bg-[#C19B2F] text-[#0F172A] font-semibold"
                  size="lg"
                >
                  <Download className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Confirm & Download'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
  );
}
