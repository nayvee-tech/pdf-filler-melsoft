'use client';

import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import companyProfileData from '@/data/company_profile.json';

// Type safe access
const profileData = companyProfileData as any;

// Only set worker on client side
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
}

const SCALE = 1.5;

type FieldType = 'text' | 'checkbox' | 'date' | 'select' | 'radio' | 'signature';

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  page: number;
  type: FieldType;
  options?: string[];
  value?: string;
  checked?: boolean;
  width?: number;
  height?: number;
}

interface InteractivePDFEditorProps {
  pdfUrl: string;
  initialTextLayers?: TextLayer[];
  onSave?: (textLayers: TextLayer[]) => void;
}

export default function InteractivePDFEditor({
  pdfUrl,
  initialTextLayers = [],
  onSave
}: InteractivePDFEditorProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [textLayers, setTextLayers] = useState<TextLayer[]>(initialTextLayers);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingText, setEditingText] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [fieldOptions, setFieldOptions] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (initialTextLayers) {
      setTextLayers(
        initialTextLayers.map(layer => ({
          ...layer,
          type: (layer.type as FieldType) || 'text',
        }))
      );
    }
  }, [initialTextLayers]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleAddTextLayer = () => {
    const newLayer: TextLayer = {
      id: `layer-${Date.now()}`,
      text: fieldType === 'text' ? 'New Text' : fieldType,
      x: 100,
      y: 100,
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      bold: false,
      italic: false,
      page: currentPage - 1,
      type: fieldType,
      value: fieldType === 'date' ? new Date().toISOString().split('T')[0] : '',
      checked: fieldType === 'checkbox' ? false : undefined,
      options: (fieldType === 'select' || fieldType === 'radio')
        ? fieldOptions.split(',').map(opt => opt.trim()).filter(Boolean)
        : undefined,
      width: fieldType === 'signature' ? 150 : fieldType === 'checkbox' ? 20 : undefined,
      height: fieldType === 'signature' ? 50 : fieldType === 'checkbox' ? 20 : undefined
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedLayer(newLayer.id);
  };

  const handleRemoveLayer = (layerId: string) => {
    setTextLayers(textLayers.filter(layer => layer.id !== layerId));
    if (selectedLayer === layerId) {
      setSelectedLayer(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent, layerId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const layer = textLayers.find(l => l.id === layerId);
    if (!layer || !containerRef.current) return;

    const rect = containerRef.current.querySelector('.react-pdf__Page')?.getBoundingClientRect();
    if (!rect) return;

    // Calculate offset from the element's current position to the cursor
    setDragging(layerId);
    setSelectedLayer(layerId);
    setDragOffset({
      x: e.clientX - rect.left - layer.x,
      y: e.clientY - rect.top - layer.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.querySelector('.react-pdf__Page')?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setTextLayers(textLayers.map(layer =>
      layer.id === dragging
        ? { ...layer, x, y }
        : layer
    ));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const updateLayerProperty = <K extends keyof TextLayer>(
    layerId: string,
    property: K,
    value: TextLayer[K]
  ) => {
    setTextLayers(textLayers.map(layer =>
      layer.id === layerId
        ? { ...layer, [property]: value }
        : layer
    ));
  };

  const selectedLayerData = textLayers.find(l => l.id === selectedLayer);

  const handleSave = () => {
    if (onSave) {
      onSave(textLayers);
    }
  };

  return (
    <div className="flex gap-4 h-full">
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
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
              className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm"
            >
              <option value="text">Text</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
              <option value="select">Dropdown</option>
              <option value="radio">Radio</option>
              <option value="signature">Signature</option>
            </select>
            {(fieldType === 'select' || fieldType === 'radio') && (
              <input
                type="text"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
                placeholder="Options (comma-separated)"
                className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm w-48"
              />
            )}
            <Button
              onClick={handleAddTextLayer}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              + Add Field
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              Save Changes
            </Button>
            <Button
              onClick={async () => {
                try {
                  // Generate PDF on server
                  const response = await fetch('/api/download-pdf', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      pdfUrl,
                      // Ensure we send ALL current layers including new additions
                      layers: textLayers
                    })
                  });

                  if (!response.ok) {
                    throw new Error('Failed to generate PDF');
                  }

                  const blob = await response.blob();

                  // Try to use File System Access API for "Save As"
                  try {
                    // @ts-ignore - showSaveFilePicker is not in standard TS types yet
                    if (window.showSaveFilePicker) {
                      // @ts-ignore
                      const handle = await window.showSaveFilePicker({
                        suggestedName: 'edited-document.pdf',
                        types: [{
                          description: 'PDF Document',
                          accept: { 'application/pdf': ['.pdf'] },
                        }],
                      });
                      const writable = await handle.createWritable();
                      await writable.write(blob);
                      await writable.close();
                      return;
                    }
                  } catch (err: any) {
                    // Fallback to standard download if user cancels or API fails
                    if (err.name !== 'AbortError') {
                      console.log('File System API unavailable, falling back to download');
                    } else {
                      return; // User cancelled
                    }
                  }

                  // Standard download fallback
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'edited-document.pdf';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);

                } catch (error) {
                  console.error('Error downloading PDF:', error);
                  alert('Failed to download PDF');
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              Download PDF
            </Button>
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative border border-slate-600 rounded-lg overflow-auto bg-slate-200 flex-1"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {isClient && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              className="flex justify-center p-4"
            >
              <div className="relative">
                <Page
                  pageNumber={currentPage}
                  scale={SCALE}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />

                {/* Text Layers */}
                {textLayers
                  .filter(layer => layer.page === currentPage - 1)
                  .map(layer => (
                    <div
                      key={layer.id}
                      className={`absolute select-none ${selectedLayer === layer.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                      style={{
                        left: `${layer.x}px`,
                        top: `${layer.y}px`,
                        fontSize: `${layer.fontSize}px`,
                        fontFamily: layer.fontFamily,
                        color: layer.color,
                        fontWeight: layer.bold ? 'bold' : 'normal',
                        fontStyle: layer.italic ? 'italic' : 'normal',
                        width: layer.width ? `${layer.width}px` : 'auto',
                        height: layer.height ? `${layer.height}px` : 'auto',
                      }}
                    >
                      {/* Draggable wrapper with handle */}
                      <div className="relative group">
                        {/* Drag handle - visible on hover */}
                        <div
                          className="absolute -left-6 top-0 w-5 h-5 bg-blue-500 rounded cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={(e) => handleMouseDown(e, layer.id)}
                          title="Drag to move"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                            <circle cx="3" cy="3" r="1.5" />
                            <circle cx="9" cy="3" r="1.5" />
                            <circle cx="3" cy="9" r="1.5" />
                            <circle cx="9" cy="9" r="1.5" />
                          </svg>
                        </div>

                        {/* Content wrapper - also draggable */}
                        <div
                          className="cursor-move"
                          onMouseDown={(e) => {
                            // Only trigger drag if not clicking on an interactive element
                            const target = e.target as HTMLElement;
                            if (!['INPUT', 'SELECT', 'BUTTON'].includes(target.tagName)) {
                              handleMouseDown(e, layer.id);
                            }
                          }}
                          onDoubleClick={() => ((layer.type as FieldType) ?? 'text') === 'text' && setEditingText(layer.id)}
                        >
                          {(() => {
                            switch (layer.type) {
                              case 'checkbox':
                                return (
                                  <input
                                    type="checkbox"
                                    checked={layer.checked || false}
                                    onChange={(e) => updateLayerProperty(layer.id, 'checked', e.target.checked)}
                                    className="w-full h-full cursor-pointer"
                                    style={{ width: '20px', height: '20px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                );
                              case 'date':
                                return (
                                  <input
                                    type="date"
                                    value={layer.value || ''}
                                    onChange={(e) => updateLayerProperty(layer.id, 'value', e.target.value)}
                                    className="border border-gray-400 rounded px-2 py-1"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                );
                              case 'select':
                                return (
                                  <select
                                    value={layer.value || ''}
                                    onChange={(e) => updateLayerProperty(layer.id, 'value', e.target.value)}
                                    className="border border-gray-400 rounded px-2 py-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {layer.options?.map((opt, i) => (
                                      <option key={i} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                );
                              case 'radio':
                                return (
                                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                    {layer.options?.map((opt, i) => (
                                      <label key={i} className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`radio-${layer.id}`}
                                          value={opt}
                                          checked={layer.value === opt}
                                          onChange={() => updateLayerProperty(layer.id, 'value', opt)}
                                        />
                                        <span>{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                );
                              case 'signature':
                                return (
                                  <div className="border-2 border-dashed border-purple-400 bg-purple-50/20 flex items-center justify-center text-purple-600 font-medium overflow-hidden"
                                    style={{
                                      width: layer.width ? `${layer.width}px` : '150px',
                                      height: layer.height ? `${layer.height}px` : '50px'
                                    }}>
                                    {profileData.signature?.base64 ? (
                                      <img
                                        src={profileData.signature.base64}
                                        alt="Signature"
                                        className="w-full h-full object-contain p-1"
                                        style={{ opacity: 0.8 }}
                                      />
                                    ) : (
                                      <span>✍️ Signature</span>
                                    )}
                                  </div>
                                );
                              default: // text-like fields (including undefined type)
                                // Get the display value for special symbol fields
                                const getDisplayValue = (text: string) => {
                                  switch (text) {
                                    case 'tick':
                                    case 'checkmark':
                                      return '✓';
                                    case 'dash':
                                    case 'cancel':
                                      return '—';
                                    case 'cross':
                                      return '✗';
                                    default:
                                      return text;
                                  }
                                };

                                return editingText === layer.id ? (
                                  <input
                                    type="text"
                                    value={layer.text}
                                    onChange={(e) => updateLayerProperty(layer.id, 'text', e.target.value)}
                                    onBlur={() => setEditingText(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') setEditingText(null);
                                    }}
                                    autoFocus
                                    className="bg-transparent border-b border-blue-500 outline-none"
                                    style={{
                                      fontSize: `${layer.fontSize}px`,
                                      fontFamily: layer.fontFamily,
                                      color: layer.color,
                                      fontWeight: layer.bold ? 'bold' : 'normal',
                                      fontStyle: layer.italic ? 'italic' : 'normal',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <span style={{
                                    fontSize: `${layer.fontSize}px`,
                                    fontFamily: layer.fontFamily,
                                    color: layer.color,
                                    fontWeight: layer.bold ? 'bold' : 'normal',
                                    fontStyle: layer.italic ? 'italic' : 'normal',
                                    lineHeight: 1, // Fix alignment
                                    display: 'block'
                                  }}>
                                    {getDisplayValue(layer.text)}
                                  </span>
                                );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <Card className="w-80 bg-slate-800 border-slate-700 p-4 overflow-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Text Properties</h3>

        {selectedLayerData ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Text Content
              </label>
              <Input
                value={selectedLayerData.text}
                onChange={(e) => updateLayerProperty(selectedLayer!, 'text', e.target.value)}
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Size
              </label>
              <Input
                type="number"
                value={selectedLayerData.fontSize}
                onChange={(e) => updateLayerProperty(selectedLayer!, 'fontSize', parseInt(e.target.value))}
                className="bg-slate-900 border-slate-600 text-white"
                min="6"
                max="72"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Family
              </label>
              <select
                value={selectedLayerData.fontFamily}
                onChange={(e) => updateLayerProperty(selectedLayer!, 'fontFamily', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={selectedLayerData.color}
                  onChange={(e) => updateLayerProperty(selectedLayer!, 'color', e.target.value)}
                  className="w-16 h-10 bg-slate-900 border-slate-600"
                />
                <Input
                  type="text"
                  value={selectedLayerData.color}
                  onChange={(e) => updateLayerProperty(selectedLayer!, 'color', e.target.value)}
                  className="flex-1 bg-slate-900 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLayerData.bold}
                  onChange={(e) => updateLayerProperty(selectedLayer!, 'bold', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="font-bold">Bold</span>
              </label>
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLayerData.italic}
                  onChange={(e) => updateLayerProperty(selectedLayer!, 'italic', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="italic">Italic</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400">X</label>
                  <Input
                    type="number"
                    value={Math.round(selectedLayerData.x)}
                    onChange={(e) => updateLayerProperty(selectedLayer!, 'x', parseInt(e.target.value))}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Y</label>
                  <Input
                    type="number"
                    value={Math.round(selectedLayerData.y)}
                    onChange={(e) => updateLayerProperty(selectedLayer!, 'y', parseInt(e.target.value))}
                    className="bg-slate-900 border-slate-600 text-white"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleRemoveLayer(selectedLayer!)}
              className="w-full bg-red-600 hover:bg-red-700"
              size="sm"
            >
              Remove This Text
            </Button>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            <p>Select a text layer to edit its properties</p>
            <p className="text-sm mt-2">or</p>
            <Button
              onClick={handleAddTextLayer}
              className="mt-4 bg-green-600 hover:bg-green-700"
              size="sm"
            >
              + Add New Text
            </Button>
          </div>
        )}

        {textLayers.filter(l => l.page === currentPage - 1).length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-600">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">
              Text Layers on This Page
            </h4>
            <div className="space-y-2">
              {textLayers
                .filter(l => l.page === currentPage - 1)
                .map(layer => (
                  <div
                    key={layer.id}
                    className={`p-2 rounded cursor-pointer ${selectedLayer === layer.id
                      ? 'bg-blue-600'
                      : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    onClick={() => setSelectedLayer(layer.id)}
                  >
                    <div className="text-white text-sm truncate">
                      {layer.text}
                    </div>
                    <div className="text-xs text-gray-400">
                      {layer.fontSize}px • {layer.fontFamily}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
