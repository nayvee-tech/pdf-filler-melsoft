'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import companyProfileData from '@/data/company_profile.json';

// Type safe access to company profile
const profileData = companyProfileData as any;

// Only set worker on client side
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

const SCALE = 1.5;

type FieldType = 'text' | 'checkbox' | 'date' | 'select' | 'radio' | 'signature';

interface TemplateField {
    id: string;
    name: string;
    type: FieldType;
    page: number;
    x: number;
    y: number;
    xRatio: number;
    yRatio: number;
    options?: string[];
    width?: number;
    height?: number;
    widthRatio?: number;
    heightRatio?: number;
    color?: string; // Add color support
    isCustom?: boolean; // Flag for custom fields
    customValue?: string; // Default value for custom fields
}

interface CanvasTemplateDesignerProps {
    pdfUrl: string;
    onSave?: (fields: TemplateField[], templateId: string) => void;
    initialFields?: any[];
    initialTemplateId?: string;
}

export default function CanvasTemplateDesigner({
    pdfUrl,
    onSave,
    initialFields = [],
    initialTemplateId = ''
}: CanvasTemplateDesignerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [templateId, setTemplateId] = useState(initialTemplateId);
    const [selectedField, setSelectedField] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [pageWidth, setPageWidth] = useState(0);
    const [pageHeight, setPageHeight] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isClient, setIsClient] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pageX: number, pageY: number } | null>(null);
    const [profileData, setProfileData] = useState<Record<string, string>>({});

    // UI States
    const [isSaving, setIsSaving] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Update templateId when initialTemplateId changes (e.g. after detection)
    useEffect(() => {
        if (initialTemplateId) setTemplateId(initialTemplateId);
    }, [initialTemplateId]);

    // Handle initial fields conversion when page dimensions are available
    useEffect(() => {
        if (initialFields && initialFields.length > 0 && pageWidth > 0 && pageHeight > 0) {
            const mappedFields = initialFields.map(f => {
                const x = f.xRatio * pageWidth * SCALE;
                const y = (1 - f.yRatio) * pageHeight * SCALE;
                return {
                    ...f,
                    x,
                    y,
                    width: f.widthRatio ? f.widthRatio * pageWidth * SCALE : (f.type === 'signature' ? 150 : (f.type === 'checkbox' ? 20 : undefined)),
                    height: f.heightRatio ? f.heightRatio * pageHeight * SCALE : (f.type === 'signature' ? 50 : (f.type === 'checkbox' ? 20 : undefined)),
                };
            });
            setFields(mappedFields);
        }
    }, [initialFields, pageWidth, pageHeight]);

    useEffect(() => {
        setIsClient(true);
        // Fetch profile data for preview
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/profile');
                if (response.ok) {
                    const data = await response.json();
                    const profile = data.companyProfile;
                    const today = new Date();
                    const day = today.getDate();
                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
                    const todayFormatted = `${day} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

                    setProfileData({
                        todayDate: todayFormatted,
                        currentDate: todayFormatted,
                        date: todayFormatted,
                        tick: '✓',
                        checkmark: '✓',
                        dash: '—',
                        cancel: '—',
                        cross: '✗',
                        legalName: profile.basic.legalName,
                        bidderName: profile.basic.legalName,
                        companyName: profile.basic.legalName,
                        registrationNumber: profile.basic.registrationNumber,
                        companyType: profile.basic.companyType,
                        vatNumber: profile.basic.vatNumber,
                        taxPin: profile.basic.taxPin,
                        csdNumber: profile.basic.csdNumber,
                        physicalAddress: profile.contact.physicalAddress,
                        postalAddress: profile.contact.postalAddress,
                        address: profile.contact.physicalAddress,
                        telephone: profile.contact.telephone,
                        phone: profile.contact.telephone,
                        cellphone: profile.contact.cellphone,
                        fax: profile.contact.fax,
                        email: profile.contact.email,
                    });
                }
            } catch (e) {
                console.error('Failed to fetch profile for designer preview', e);
            }
        };
        fetchProfile();
    }, []);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const onPageLoadSuccess = (page: any) => {
        const { width, height } = page.getViewport({ scale: 1.0 });
        setPageWidth(width);
        setPageHeight(height);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;

        const rect = containerRef.current.querySelector('.react-pdf__Page')?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setContextMenu({ x, y, pageX: e.clientX, pageY: e.clientY });
    };

    const addFieldAtPos = (name: string, type: FieldType = 'text', isCustomField: boolean = false) => {
        if (!contextMenu) return;

        const { x, y } = contextMenu;
        const xRatio = x / (pageWidth * SCALE);
        const yRatio = 1 - (y / (pageHeight * SCALE));

        const newField: TemplateField = {
            id: `field-${Date.now()}`,
            name,
            type,
            page: currentPage - 1,
            x,
            y,
            xRatio,
            yRatio,
            width: type === 'signature' ? 150 : type === 'checkbox' ? 20 : undefined,
            height: type === 'signature' ? 50 : type === 'checkbox' ? 20 : undefined,
            color: '#000000', // Default black
            isCustom: isCustomField || name === 'Custom Text',
            customValue: (isCustomField || name === 'Custom Text') ? 'Enter text...' : undefined
        };

        setFields([...fields, newField]);
        setSelectedField(newField.id);
        setContextMenu(null);
    };

    const handleMouseDown = (e: React.MouseEvent, fieldId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const field = fields.find(f => f.id === fieldId);
        if (!field || !containerRef.current) return;

        const rect = containerRef.current.querySelector('.react-pdf__Page')?.getBoundingClientRect();
        if (!rect) return;

        setDragging(fieldId);
        setSelectedField(fieldId);
        setDragOffset({
            x: e.clientX - rect.left - field.x,
            y: e.clientY - rect.top - field.y,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !containerRef.current) return;

        const rect = containerRef.current.querySelector('.react-pdf__Page')?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;

        // Update field position and recalculate ratios
        setFields(fields.map(field =>
            field.id === dragging
                ? {
                    ...field,
                    x,
                    y,
                    xRatio: x / (pageWidth * SCALE),
                    yRatio: 1 - (y / (pageHeight * SCALE))
                }
                : field
        ));
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const updateFieldProperty = <K extends keyof TemplateField>(
        fieldId: string,
        property: K,
        value: TemplateField[K]
    ) => {
        setFields(fields.map(field => {
            if (field.id === fieldId) {
                const updated = { ...field, [property]: value };
                if (property === 'width' && pageWidth > 0) {
                    updated.widthRatio = (value as number) / (pageWidth * SCALE);
                }
                if (property === 'height' && pageHeight > 0) {
                    updated.heightRatio = (value as number) / (pageHeight * SCALE);
                }
                // If type changes, reset width/height ratios to defaults if needed
                if (property === 'type') {
                    if (value === 'signature') {
                        updated.width = 150;
                        updated.height = 50;
                        updated.widthRatio = 150 / (pageWidth * SCALE);
                        updated.heightRatio = 50 / (pageHeight * SCALE);
                    } else if (value === 'checkbox') {
                        updated.width = 20;
                        updated.height = 20;
                        updated.widthRatio = 20 / (pageWidth * SCALE);
                        updated.heightRatio = 20 / (pageHeight * SCALE);
                    }
                }
                return updated;
            }
            return field;
        }));
    };

    const handleRemoveField = (fieldId: string) => {
        setFields(fields.filter(field => field.id !== fieldId));
        if (selectedField === fieldId) {
            setSelectedField(null);
        }
    };

    const handleSave = async () => {
        if (!templateId || !onSave) return;
        setIsSaving(true);
        try {
            await onSave(fields, templateId);
            // Alert handled in parent? or check onSave implementation. 
            // Assuming parent handles network, but we'll simulate delay here if needed or just wait.
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedFieldData = fields.find(f => f.id === selectedField);

    const renderFieldPlaceholder = (field: TemplateField) => {
        const isSymbol = ['tick', 'checkmark', 'dash', 'cancel', 'cross'].includes(field.name);
        // Use custom value if available, or profile data, or field name
        const displayText = field.isCustom ? (field.customValue || field.name) : (profileData[field.name] || field.name);

        switch (field.type) {
            case 'checkbox':
                return (
                    <div className="flex flex-col items-center group/field">
                        <div className={`w-4 h-4 border border-blue-400 bg-white shadow-sm flex items-center justify-center ${selectedField === field.id ? 'ring-2 ring-blue-500' : ''}`}>
                            {field.name === 'tick' || field.name === 'checkmark' ? <span className="text-[12px] font-bold">✓</span> : null}
                        </div>
                        <span className="text-[10px] text-blue-600 bg-white/80 px-1 rounded opacity-0 group-hover/field:opacity-100 transition-opacity absolute -bottom-4">{field.name}</span>
                    </div>
                );
            case 'signature':
                return (
                    <div className="flex flex-col items-center group/field">
                        <div
                            className={`border border-dashed border-purple-400 bg-purple-50/30 flex items-center justify-center overflow-hidden relative ${selectedField === field.id ? 'ring-2 ring-purple-500' : ''}`}
                            style={{ width: `${field.width}px`, height: `${field.height}px` }}
                        >
                            {companyProfileData.signature?.base64 ? (
                                <img
                                    src={companyProfileData.signature.base64}
                                    alt="Signature"
                                    className="w-full h-full object-contain p-1"
                                    style={{ opacity: 0.8 }}
                                />
                            ) : (
                                <span className="text-xs text-purple-600 font-medium">✍️ {field.name}</span>
                            )}
                        </div>
                    </div>
                );
            default: // text or symbols treated as text layers
                // Calculate font size based on symbol type
                let fontSize = '14px';
                if (isSymbol) {
                    if (field.name === 'dash' || field.name === 'cancel') {
                        fontSize = '28px';
                    } else {
                        fontSize = '24px';
                    }
                }

                return (
                    <div className="relative group/field">
                        <div
                            className={`px-1 py-0 border border-blue-400/20 hover:border-blue-400 bg-transparent transition-colors whitespace-nowrap flex items-center justify-center ${selectedField === field.id ? 'border-blue-500 bg-blue-50/20' : ''}`}
                            style={{
                                fontFamily: 'Helvetica, sans-serif',
                                fontSize,
                                fontWeight: 'bold',
                                color: field.color || '#000', // Respect custom color
                                minWidth: isSymbol ? '24px' : '20px',
                                minHeight: isSymbol ? '24px' : '20px',
                                lineHeight: 1,
                                height: isSymbol ? '100%' : 'auto', // Ensure vertical alignment
                                display: 'flex',
                                alignItems: 'center', // Center vertically
                                justifyContent: 'center' // Center horizontally
                            }}
                        >
                            {displayText}
                        </div>
                        {!isSymbol && <span className="text-[10px] text-blue-600 bg-white/80 px-1 rounded opacity-0 group-hover/field:opacity-100 transition-opacity absolute -top-4 left-0 pointer-events-none whitespace-nowrap">{field.name}</span>}
                    </div>
                );
        }
    };

    const fieldCategories = [
        { label: 'Create New', items: ['Custom Text'] }, // Custom Text First
        { label: 'Date Fields', items: ['todayDate', 'currentDate', 'date'] },
        { label: 'Symbols', items: ['tick', 'checkmark', 'dash', 'cancel', 'cross'] },
        { label: 'Basic Info', items: ['legalName', 'bidderName', 'companyName', 'registrationNumber', 'companyType', 'vatNumber', 'taxPin', 'csdNumber'] },
        { label: 'Contact Info', items: ['physicalAddress', 'postalAddress', 'address', 'telephone', 'phone', 'cellphone', 'fax', 'email'] },
        { label: 'Directors', items: ['directorName', 'directorId', 'directorPosition', 'director1Name', 'director2Name'] },
        { label: 'Compliance', items: ['rsaResident', 'hasBranch', 'accreditedRep', 'signature'] },
        { label: 'BEE Preferences', items: ['womenOwned', 'youthOwned', 'pwdOwned', 'pointsClaimed', 'signature'] },
        { label: 'Other', items: ['signature'] }
    ];

    // Helper to get display label for menu items
    const getMenuLabel = (item: string) => {
        if (item === 'Custom Text') return '✨ Custom Text Field';
        if (item === 'signature') return '✍️ Signature Field';

        // Show actual value if available
        const val = profileData[item];
        if (val) {
            const truncated = val.length > 20 ? val.substring(0, 20) + '...' : val;
            return `${item} (${truncated})`;
        }
        return item;
    };

    return (
        <div className="flex gap-4 h-full relative" onClick={() => setContextMenu(null)}>
            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-[100] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-2 w-64 max-h-[80vh] overflow-y-auto"
                    style={{ top: contextMenu.pageY, left: contextMenu.pageX }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {fieldCategories.map((cat) => (
                        <div key={cat.label} className="px-2 mb-2">
                            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 px-2">{cat.label}</div>
                            <div className="space-y-0.5">
                                {cat.items.map(item => (
                                    <button
                                        key={item}
                                        className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded transition-colors"
                                        onClick={() => {
                                            if (item === 'signature') {
                                                addFieldAtPos(item, 'signature');
                                            } else if (item === 'Custom Text') {
                                                const name = prompt('Enter custom field name (or leave empty for generic):', 'Custom Text');
                                                if (name) addFieldAtPos(name, 'text', true);
                                            } else {
                                                addFieldAtPos(item, 'text');
                                            }
                                        }}
                                    >
                                        {getMenuLabel(item)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )
            }

            {/* PDF Canvas */}
            <div className="flex-1 flex flex-col">
                <div className="mb-4 flex items-center justify-between bg-slate-800 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                        >
                            Previous
                        </Button>
                        <span className="text-white">
                            Page {currentPage} of {numPages}
                        </span>
                        <Button
                            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                            disabled={currentPage === numPages}
                            variant="outline"
                            size="sm"
                        >
                            Next
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Input
                            type="text"
                            value={templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            placeholder="Template ID (e.g., SBD 4)"
                            className="bg-slate-700 border-slate-600 text-white w-48"
                        />
                        <Button
                            onClick={handleSave}
                            disabled={!templateId || fields.length === 0 || isSaving}
                            className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            size="sm"
                        >
                            {isSaving ? 'Saving...' : 'Save Template'}
                        </Button>
                    </div>
                </div>

                <div className="mb-2 text-sm text-slate-400 bg-slate-800/50 p-2 rounded px-4 flex items-center gap-2">
                    <span className="text-[#D4AF37]"> Tip:</span> <strong>Right-click</strong> on the PDF to select and place elements accurately.
                </div>

                <div
                    ref={containerRef}
                    className="relative border border-slate-600 rounded-lg overflow-auto bg-slate-200 flex-1"
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onContextMenu={handleContextMenu}
                >
                    {isClient && (
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex justify-center p-4"
                        >
                            <div className="relative shadow-2xl">
                                <Page
                                    pageNumber={currentPage}
                                    scale={SCALE}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    onLoadSuccess={onPageLoadSuccess}
                                />

                                {/* Field Placeholders */}
                                {fields
                                    .filter(field => field.page === currentPage - 1)
                                    .map(field => (
                                        <div
                                            key={field.id}
                                            className={`absolute cursor-move select-none z-10 transition-shadow ${selectedField === field.id ? 'z-20' : ''
                                                }`}
                                            style={{
                                                left: `${field.x}px`,
                                                top: `${field.y}px`,
                                                // No longer using -50% translate to match Editor top-left alignment
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, field.id)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedField(field.id);
                                                setContextMenu(null);
                                            }}
                                        >
                                            {renderFieldPlaceholder(field)}
                                        </div>
                                    ))}
                            </div>
                        </Document>
                    )}
                </div>
            </div>

            {/* Properties Panel */}
            <Card className="w-80 bg-slate-800 border-slate-700 p-4 overflow-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Field Properties</h3>

                {selectedFieldData ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Field Name
                            </label>
                            <Input
                                value={selectedFieldData.name}
                                onChange={(e) => updateFieldProperty(selectedField!, 'name', e.target.value)}
                                className="bg-slate-900 border-slate-600 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Field Type
                            </label>
                            <select
                                value={selectedFieldData.type}
                                onChange={(e) => updateFieldProperty(selectedField!, 'type', e.target.value as FieldType)}
                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                            >
                                <option value="text">Text</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="date">Date</option>
                                <option value="signature">Signature</option>
                                <option value="select">Dropdown</option>
                                <option value="radio">Radio</option>
                            </select>
                        </div>

                        {/* Custom Text & Color Options */}
                        <div className="space-y-4 pt-2 border-t border-gray-700">
                            {selectedFieldData.isCustom && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Text</label>
                                    <Input
                                        value={selectedFieldData.customValue || ''}
                                        onChange={(e) => updateFieldProperty(selectedField!, 'customValue', e.target.value)}
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={selectedFieldData.color || '#000000'}
                                        onChange={(e) => updateFieldProperty(selectedField!, 'color', e.target.value)}
                                        className="h-8 w-14 bg-transparent border border-gray-600 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-400">{selectedFieldData.color || '#000000'}</span>
                                </div>
                            </div>
                        </div>

                        {selectedFieldData.type === 'signature' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-400">Width (px)</label>
                                    <Input
                                        type="number"
                                        value={selectedFieldData.width || 150}
                                        onChange={(e) => updateFieldProperty(selectedField!, 'width', parseInt(e.target.value))}
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400">Height (px)</label>
                                    <Input
                                        type="number"
                                        value={selectedFieldData.height || 50}
                                        onChange={(e) => updateFieldProperty(selectedField!, 'height', parseInt(e.target.value))}
                                        className="bg-slate-900 border-slate-600 text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Position
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-400">X: {Math.round(selectedFieldData.x)}px</label>
                                    <div className="text-xs text-gray-500">Ratio: {selectedFieldData.xRatio.toFixed(4)}</div>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400">Y: {Math.round(selectedFieldData.y)}px</label>
                                    <div className="text-xs text-gray-500">Ratio: {selectedFieldData.yRatio.toFixed(4)}</div>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={() => handleRemoveField(selectedField!)}
                            className="w-full bg-red-600 hover:bg-red-700"
                            size="sm"
                        >
                            Remove Field
                        </Button>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-8">
                        <p>No field selected</p>
                        <p className="text-sm mt-2">Click "+ Add Field" to start</p>
                    </div>
                )}

                {fields.filter(f => f.page === currentPage - 1).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-600">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">
                            Fields on This Page ({fields.filter(f => f.page === currentPage - 1).length})
                        </h4>
                        <div className="space-y-2">
                            {fields
                                .filter(f => f.page === currentPage - 1)
                                .map(field => (
                                    <div
                                        key={field.id}
                                        className={`p-2 rounded cursor-pointer ${selectedField === field.id
                                            ? 'bg-blue-600'
                                            : 'bg-slate-700 hover:bg-slate-600'
                                            }`}
                                        onClick={() => setSelectedField(field.id)}
                                    >
                                        <div className="text-white text-sm font-medium">{field.name}</div>
                                        <div className="text-xs text-gray-400">{field.type}</div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Download Button Section */}
                <div className="mt-6 pt-6 border-t border-slate-600">
                    <Button
                        onClick={async () => {
                            if (!pdfUrl) return;
                            setIsDownloading(true);
                            try {
                                // Create a new PDF document with form fields
                                const response = await fetch('/api/generate-pdf', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        templateId,
                                        fields: fields.reduce((acc, field) => {
                                            if (!acc[field.name]) acc[field.name] = [];
                                            acc[field.name].push({
                                                page: field.page,
                                                xRatio: field.xRatio,
                                                yRatio: field.yRatio,
                                                widthRatio: field.width ? field.width / (pageWidth * SCALE) : undefined,
                                                heightRatio: field.height ? field.height / (pageHeight * SCALE) : undefined,
                                                type: field.type,
                                                color: field.color, // Save color
                                                isCustom: field.isCustom,
                                                customValue: field.customValue
                                            });
                                            return acc;
                                        }, {} as Record<string, any[]>),
                                        pdfUrl: pdfUrl.split('/').pop()
                                    })
                                });

                                if (!response.ok) {
                                    throw new Error('Failed to generate PDF');
                                }

                                // Get the PDF blob and create a download link
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${templateId || 'document'}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                                alert("PDF downloaded successfully! ✅");

                            } catch (error) {
                                console.error('Error generating PDF:', error);
                                alert('Failed to generate PDF. Please try again.');
                            } finally {
                                setIsDownloading(false);
                            }
                        }}
                        disabled={!templateId || !pdfUrl || fields.length === 0 || isDownloading || isSaving}
                        variant="outline"
                        className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDownloading ? 'Downloading...' : 'Download PDF'}
                    </Button>
                </div>
            </Card>
        </div >
    );
}
