'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Loader2, AlertCircle, Sparkles, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import Navigation from '@/components/Navigation';
import PDFPreviewModal from '@/components/PDFPreviewModal';
import InteractivePDFEditor from '@/components/InteractivePDFEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Template {
  id: string;
  name: string;
  pageSize: string;
  fieldCount: number;
  fields: string[];
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />}> 
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [templateDetected, setTemplateDetected] = useState(false);
  const [templateId, setTemplateId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    documentId: string;
    sourceUrl: string;
    filename: string;
    mappedFields: Array<{
      id: string;
      page: number;
      keyText: string;
      confidence: number;
      boundingBox: { Left: number; Top: number; Width: number; Height: number };
    }>;
    warnings?: {
      lowConfidenceCount: number;
      lowConfidenceKeys: Array<{ keyText: string; confidence: number; page: number }>;
    };
  } | null>(null);
  const [nudges, setNudges] = useState<Record<string, { dxRatio: number; dyRatio: number }>>({});
  const [showEditor, setShowEditor] = useState(false);
  const [filledPdfUrl, setFilledPdfUrl] = useState('');
  const [textLayers, setTextLayers] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
    const templateParam = searchParams?.get('template');
    if (templateParam) {
      try {
        // Decode the template parameter to handle URL-encoded values
        const decodedTemplate = decodeURIComponent(templateParam);
        console.log('Template from URL:', { original: templateParam, decoded: decodedTemplate });
        setSelectedTemplate(decodedTemplate);
      } catch (error) {
        console.error('Error decoding template parameter:', error);
        setSelectedTemplate(templateParam);
      }
    }
  }, [searchParams]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates/list');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    setError('');
    setCurrentFile(file);
    setUploading(true);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (selectedTemplate) {
        // Ensure the template ID is properly encoded when sent to the API
        const templateId = encodeURIComponent(selectedTemplate);
        console.log('Using template ID:', { original: selectedTemplate, encoded: templateId });
        formData.append('templateId', templateId);
      }

      const response = await fetch('/api/process-template', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.templateDetected && data.success) {
        setTemplateDetected(true);
        setTemplateId(data.templateId);
        setDownloadUrl(data.downloadUrl);
        setFilledPdfUrl(data.downloadUrl);

        // Convert template fields to text layers for editing
        if (data.textLayers) {
          setTextLayers(data.textLayers);
        }

        setShowEditor(true);
        setToast(`✅ Template detected: ${data.templateId} - Now you can edit the PDF!`);
        setTimeout(() => setToast(null), 4000);
      } else {
        setTemplateDetected(false);
        setShowOptions(true);
      }

      setUploading(false);
      setProcessing(false);
    } catch (err) {
      setError('Failed to process PDF');
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleUseTextract = async () => {
    if (!currentFile) return;

    setShowOptions(false);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', currentFile);

      const response = await fetch('/api/analyze-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setAnalysis({
          documentId: data.documentId,
          sourceUrl: data.sourceUrl,
          filename: data.filename,
          mappedFields: data.mappedFields || [],
          warnings: data.warnings,
        });
        setNudges({});
        setShowPreview(true);

        if (data.warnings?.lowConfidenceCount > 0) {
          setToast('⚠️ Some fields were not auto-detected. Please check the preview.');
          setTimeout(() => setToast(null), 4500);
        }

        setProcessing(false);
      } else {
        setError(data.error || '⚠️ AWS Connection Error: Failed to analyze document layout.');
        setProcessing(false);
      }
    } catch (err) {
      setError('⚠️ AWS Connection Error: Failed to analyze document layout.');
      setProcessing(false);
    }
  };

  const handleMapTemplate = () => {
    router.push('/template-designer');
  };

  const handleConfirmDownload = () => {
    if (templateDetected && downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `filled_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setShowPreview(false);
      setDownloadUrl('');
      setTemplateDetected(false);
      setTemplateId('');
      setCurrentFile(null);
      return;
    }

    if (!analysis) return;

    (async () => {
      try {
        setUploading(true);

        const response = await fetch('/api/sign-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: analysis.documentId,
            nudges,
          }),
        });

        const data = await response.json();

        if (response.ok && data.downloadUrl) {
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = `signed_${analysis.filename}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          setShowPreview(false);
          setAnalysis(null);
          setNudges({});
        } else {
          setError(data.error || 'Failed to generate signed PDF');
        }
      } catch (err) {
        setError('Failed to download PDF');
      } finally {
        setUploading(false);
      }
    })();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-[#D4AF37] mb-4">
              PDF Auto-Fill System
            </h1>
            <p className="text-xl text-gray-300">
              Upload your PDF and let us handle the rest
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-6 bg-red-900/30 border-2 border-red-500 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-300 mb-2">
                      Error Processing PDF
                    </h3>
                    <p className="text-red-200">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-400 hover:text-red-300 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 p-4 bg-[#D4AF37]/20 border border-[#D4AF37] rounded-lg text-[#D4AF37] text-center font-medium"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="bg-slate-800/50 border-slate-700 p-8">
            {/* Template Selection */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Select Template (Optional)
                </label>
                <Button
                  onClick={() => router.push('/templates')}
                  variant="outline"
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
                >
                  View All Templates
                </Button>
              </div>

              <div className="flex gap-3">
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    // Decode the value when selecting from dropdown
                    try {
                      const decodedValue = decodeURIComponent(e.target.value);
                      console.log('Selected template:', { original: e.target.value, decoded: decodedValue });
                      setSelectedTemplate(decodedValue);
                    } catch (error) {
                      console.error('Error decoding template ID:', error);
                      setSelectedTemplate(e.target.value);
                    }
                  }}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-[#D4AF37] transition-colors"
                >
                  <option value="">Auto-detect template or use AI</option>
                  {templates.map((template) => {
                    // Ensure we're using the correct template ID (with spaces if present)
                    const templateId = template.id || template.name;
                    return (
                      <option key={templateId} value={templateId}>
                        {template.name} ({template.fieldCount} fields)
                      </option>
                    );
                  })}
                </select>

                <Button
                  onClick={() => router.push('/template-designer')}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold whitespace-nowrap"
                >
                  + Create Template
                </Button>
              </div>

              {selectedTemplate && (
                <div className="text-sm text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg px-4 py-2">
                  ✓ Template selected: {templates.find(t => t.id === selectedTemplate)?.name}
                </div>
              )}
            </div>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                transition-all duration-300
                ${isDragActive
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                  : 'border-slate-600 hover:border-[#D4AF37] hover:bg-slate-700/50'
                }
              `}
            >
              <input {...getInputProps()} />

              {processing ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Loader2 className="w-16 h-16 text-[#D4AF37] mx-auto animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 border-4 border-[#D4AF37]/30 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xl text-[#D4AF37] font-semibold">
                    {templateDetected ? 'Filling PDF...' : 'Checking for template...'}
                  </p>
                  <div className="h-1 w-48 mx-auto bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-[#D4AF37] animate-pulse" />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">
                    {isDragActive ? 'Drop your PDF here' : 'Upload PDF Document'}
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Drag and drop or click to browse
                  </p>
                  <Button className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 font-semibold px-8 py-3">
                    <FileText className="w-5 h-5 mr-2" />
                    Select PDF
                  </Button>
                </>
              )}
            </div>
          </Card>

          {showOptions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Card className="bg-slate-800/50 border-slate-700 p-6">
                <h3 className="text-xl font-semibold text-[#D4AF37] mb-4">
                  No Template Found
                </h3>
                <p className="text-gray-300 mb-6">
                  This PDF doesn't have a saved template. Choose an option:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleMapTemplate}
                    className="bg-slate-700 hover:bg-slate-600 text-white border border-[#D4AF37] h-auto py-6 flex flex-col items-center gap-3"
                  >
                    <Zap className="w-8 h-8 text-[#D4AF37]" />
                    <div>
                      <div className="font-semibold text-lg">Map Template</div>
                      <div className="text-sm text-gray-400">Create fixed coordinate mapping</div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleUseTextract}
                    className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 h-auto py-6 flex flex-col items-center gap-3"
                  >
                    <Sparkles className="w-8 h-8 text-blue-400" />
                    <div>
                      <div className="font-semibold text-lg">Auto-detect with AI</div>
                      <div className="text-sm text-gray-400">Use AWS Textract (fallback)</div>
                    </div>
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>

      {showEditor && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-semibold text-white">Edit Your PDF</h2>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setFilledPdfUrl('');
                  setTextLayers([]);
                  setCurrentFile(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <InteractivePDFEditor
                pdfUrl={filledPdfUrl}
                initialTextLayers={textLayers}
                onSave={async (updatedLayers) => {
                  try {
                    const response = await fetch('/api/save-edited-pdf', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        pdfUrl: filledPdfUrl,
                        textLayers: updatedLayers,
                        templateId: templateId,
                      }),
                    });

                    const data = await response.json();

                    if (response.ok && data.downloadUrl) {
                      const link = document.createElement('a');
                      link.href = data.downloadUrl;
                      link.download = `edited_${Date.now()}.pdf`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);

                      confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                      });

                      setShowEditor(false);
                      setFilledPdfUrl('');
                      setTextLayers([]);
                      setCurrentFile(null);
                    } else {
                      setError(data.error || 'Failed to save edited PDF');
                    }
                  } catch (err) {
                    setError('Failed to save edited PDF');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showPreview && !showEditor && (
        <PDFPreviewModal
          pdfUrl={templateDetected ? downloadUrl : (analysis?.sourceUrl || '')}
          onClose={() => {
            setShowPreview(false);
            setAnalysis(null);
            setNudges({});
            setDownloadUrl('');
            setTemplateDetected(false);
            setTemplateId('');
            setCurrentFile(null);
          }}
          onConfirm={handleConfirmDownload}
          isProcessing={uploading}
          highlights={analysis?.mappedFields}
          onNudge={(fieldId, delta) => {
            setNudges(prev => ({
              ...prev,
              [fieldId]: delta
            }));
          }}
          templateMode={templateDetected}
          templateId={templateId}
        />
      )}
    </div>
  );
}
