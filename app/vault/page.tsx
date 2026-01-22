'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Clock, FileText, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Document {
  id: string;
  filename: string;
  createdAt: string;
  expiresAt: string;
  size: number;
}

export default function VaultPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/vault');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/vault/${id}`, { method: 'DELETE' });
      setDocuments(documents.filter(doc => doc.id !== id));
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-[#0F172A] mb-4">Document Vault</h1>
          <p className="text-lg text-[#0F172A]/60">
            Temporary storage for processed documents (auto-deleted after 3 hours)
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Clock className="w-12 h-12 text-[#0F172A]/40" />
            </motion.div>
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="py-20">
              <CardContent className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-[#0F172A]/5 rounded-full flex items-center justify-center">
                  <FileText className="w-10 h-10 text-[#0F172A]/40" />
                </div>
                <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No Documents Yet</h3>
                <p className="text-[#0F172A]/60">
                  Upload and process a PDF to see it here
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <AnimatePresence>
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-12 h-12 bg-[#0F172A] rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-[#D4AF37]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[#0F172A] truncate">
                              {doc.filename}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-[#0F172A]/60">
                              <span>{formatFileSize(doc.size)}</span>
                              <span>•</span>
                              <span>{new Date(doc.createdAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#059669]/10 rounded-full">
                            <Clock className="w-4 h-4 text-[#059669]" />
                            <span className="text-sm font-medium text-[#059669]">
                              {getTimeRemaining(doc.expiresAt)}
                            </span>
                          </div>

                          <Button
                            variant="accent"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/temp-docs/${doc.id}/${doc.filename}`;
                              link.download = doc.filename;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[#0F172A]/80">
                  <strong>Security Notice:</strong> All documents are automatically deleted after 3 hours
                  for security purposes. Download important files immediately.
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
