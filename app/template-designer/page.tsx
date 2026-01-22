'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';

const CanvasTemplateDesigner = dynamic(() => import('@/components/CanvasTemplateDesigner'), {
    ssr: false,
    loading: () => <div className="h-screen flex items-center justify-center text-[#D4AF37]">Loading Designer...</div>
});
import { Card } from '@/components/ui/card';

export default function TemplateDesignerCanvas() {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState('');
    const [showDesigner, setShowDesigner] = useState(false);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [detecting, setDetecting] = useState(false);
    const [initialFields, setInitialFields] = useState<any[]>([]);
    const [initialTemplateId, setInitialTemplateId] = useState('');

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file');
            return;
        }

        setPdfFile(file);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        setError('');
        setDetecting(true);

        try {
            // Try to detect template
            const formData = new FormData();
            formData.append('pdf', file);
            const detectRes = await fetch('/api/templates/detect', {
                method: 'POST',
                body: formData
            });
            const { templateId } = await detectRes.json();

            if (templateId) {
                console.log('Template detected:', templateId);
                setInitialTemplateId(templateId);

                // Load existing mapping
                const loadRes = await fetch(`/api/templates/load?templateId=${encodeURIComponent(templateId)}`);
                if (loadRes.ok) {
                    const mapping = await loadRes.json();

                    // Convert Record<string, FieldMapping[]> back to TemplateField[]
                    // We need x,y in pixels but we only have ratios. 
                    // CanvasDesigner will have to handle converting ratios back to pixels once it loads the PDF.
                    // Or we can just pass the ratios and have it calculate.
                    const fields: any[] = [];
                    Object.entries(mapping.fields).forEach(([name, mappings]: [string, any]) => {
                        const mArray = Array.isArray(mappings) ? mappings : [mappings];
                        mArray.forEach((m: any, idx: number) => {
                            fields.push({
                                id: `field-${Date.now()}-${name}-${idx}`,
                                name,
                                ...m,
                                color: m.color, // Load color
                                isCustom: m.isCustom, // Load isCustom flag
                                customValue: m.customValue, // Load custom value
                                // We don't have x, y yet, designer will calculate from ratios
                                isFromMapping: true
                            });
                        });
                    });
                    setInitialFields(fields);
                }
            } else {
                setInitialTemplateId('');
                setInitialFields([]);
            }
        } catch (e) {
            console.error('Detection error:', e);
        } finally {
            setDetecting(false);
            setShowDesigner(true);
        }
    };

    const handleSaveTemplate = async (fields: any[], templateId: string) => {
        setSaving(true);
        setError('');

        try {
            // Prepare template data
            const templateData: {
                templateId: string;
                pageSize: string;
                fields: Record<string, any[]>;
            } = {
                templateId,
                pageSize: 'A4',
                fields: {}
            };

            // Group fields by name (some fields may appear on multiple pages)
            fields.forEach(field => {
                const fieldMapping = {
                    page: field.page,
                    xRatio: field.xRatio,
                    yRatio: field.yRatio,
                    type: field.type,
                    ...(field.options && { options: field.options }),
                    ...(field.widthRatio && { widthRatio: field.widthRatio }),
                    ...(field.heightRatio && { heightRatio: field.heightRatio }),
                    ...(field.color && { color: field.color }),
                    ...(field.isCustom && { isCustom: field.isCustom }),
                    ...(field.customValue && { customValue: field.customValue })
                };

                if (!templateData.fields[field.name]) {
                    templateData.fields[field.name] = [];
                }

                // Check for exact duplicates (same page, x, y) to prevent double rendering
                const isDuplicate = templateData.fields[field.name].some(existing =>
                    existing.page === fieldMapping.page &&
                    Math.abs(existing.xRatio - fieldMapping.xRatio) < 0.001 &&
                    Math.abs(existing.yRatio - fieldMapping.yRatio) < 0.001
                );

                if (!isDuplicate) {
                    templateData.fields[field.name].push(fieldMapping);
                }
            });

            // Save template via API
            const response = await fetch('/api/templates/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(templateData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setShowDesigner(false);
                    setPdfFile(null);
                    setPdfUrl('');
                }, 3000);
            } else {
                setError(data.error || 'Failed to save template');
            }
        } catch (err) {
            setError('Failed to save template');
        } finally {
            setSaving(false);
        }
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
                {!showDesigner ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="text-center mb-12">
                            <h1 className="text-5xl font-bold text-[#D4AF37] mb-4">
                                Visual Template Designer
                            </h1>
                            <p className="text-xl text-gray-300">
                                Create PDF templates with perfect accuracy using drag-and-drop
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg text-red-200">
                                {error}
                            </div>
                        )}

                        <Card className="bg-slate-800/50 border-slate-700 p-8">
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

                                <Upload className="w-16 h-16 text-[#D4AF37] mx-auto mb-4" />
                                <h3 className="text-2xl font-semibold text-white mb-2">
                                    {isDragActive ? 'Drop your PDF here' : 'Upload PDF to Design Template'}
                                </h3>
                                <p className="text-gray-400 mb-6">
                                    Drag and drop or click to browse
                                </p>
                                <Button className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 font-semibold px-8 py-3">
                                    <FileText className="w-5 h-5 mr-2" />
                                    Select PDF
                                </Button>
                            </div>

                            <div className="mt-8 p-6 bg-slate-700/50 rounded-lg">
                                <h3 className="text-lg font-semibold text-white mb-4">How it works:</h3>
                                <ol className="space-y-3 text-gray-300">
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                        <span>Upload your PDF template</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                        <span>Enter a template ID (e.g., "SBD 4")</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                        <span>Select field type and click on the PDF to place fields</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                                        <span>Drag fields to adjust positions with pixel-perfect accuracy</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="flex-shrink-0 w-6 h-6 bg-[#D4AF37] text-slate-900 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                                        <span>Save template - it will be available for auto-fill immediately</span>
                                    </li>
                                </ol>
                            </div>
                        </Card>
                    </motion.div>
                ) : (
                    <div className="h-[calc(100vh-8rem)]">
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 p-4 bg-green-900/30 border-2 border-green-500 rounded-lg text-green-200 flex items-center gap-3"
                            >
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-semibold">Template saved successfully!</span>
                            </motion.div>
                        )}

                        {error && (
                            <div className="mb-4 p-4 bg-red-900/30 border-2 border-red-500 rounded-lg text-red-200">
                                {error}
                            </div>
                        )}

                        <CanvasTemplateDesigner
                            pdfUrl={pdfUrl}
                            onSave={handleSaveTemplate}
                            initialFields={initialFields}
                            initialTemplateId={initialTemplateId}
                        />
                    </div>
                )}

                {detecting && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-[#D4AF37] font-semibold">Detecting template...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
