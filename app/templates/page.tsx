'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Navigation from '@/components/Navigation';

interface Template {
  id: string;
  name: string;
  pageSize: string;
  fieldCount: number;
  fields: string[];
  createdAt?: string;
}

type SortOption = 'newest' | 'oldest' | 'nameAsc' | 'nameDesc';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter & Sort Logic
  useEffect(() => {
    let result = [...templates];

    // 1. Filter by Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      );
    }

    // 2. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'nameAsc':
          return (a.name || a.id).localeCompare(b.name || b.id);
        case 'nameDesc':
          return (b.name || b.id).localeCompare(a.name || a.id);
        default:
          return 0;
      }
    });

    setFilteredTemplates(result);
  }, [templates, searchQuery, sortBy]);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates/list');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        setError('Failed to load templates');
      }
    } catch (err) {
      setError('Error loading templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateId}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(templateId);
    try {
      const response = await fetch('/api/templates/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ templateId }),
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
      } else {
        const data = await response.json();
        alert(`Failed to delete template: ${data.error}`);
      }
    } catch (err) {
      alert('Error deleting template');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Template Library
              </h1>
              <p className="text-slate-400">
                Manage your PDF templates and field mappings
              </p>
            </div>
            <Button
              onClick={() => router.push('/template-designer')}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold"
            >
              + Create New Template
            </Button>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-800/50 p-4 rounded-lg flex flex-col md:flex-row gap-4 mb-8 border border-slate-700">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="w-full md:w-48">
              <select
                className="w-full h-10 px-3 rounded-md bg-slate-900 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="nameAsc">Name (A-Z)</option>
                <option value="nameDesc">Name (Z-A)</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="text-center py-20">
              <div className="text-slate-400">Loading templates...</div>
            </div>
          )}

          {error && (
            <div className="text-center py-20">
              <div className="text-red-400">{error}</div>
            </div>
          )}

          {!loading && !error && filteredTemplates.length === 0 && (
            <Card className="bg-slate-800 border-slate-700 p-12 text-center">
              <div className="text-slate-400 mb-4">
                {searchQuery ? 'No templates match your search.' : 'No templates found. Create your first template to get started.'}
              </div>
              {!searchQuery && (
                <Button
                  onClick={() => router.push('/template-designer')}
                  className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-slate-900 font-semibold"
                >
                  Create Template
                </Button>
              )}
            </Card>
          )}

          {!loading && !error && filteredTemplates.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-slate-800 border-slate-700 p-6 hover:border-yellow-500 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/?template=${template.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition-colors truncate pr-2" title={template.name}>
                      {template.name}
                    </h3>
                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded whitespace-nowrap">
                      {template.pageSize}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-sm text-slate-400 flex justify-between">
                      <span>
                        <span className="font-semibold text-yellow-500">
                          {template.fieldCount}
                        </span>{' '}
                        mapped fields
                      </span>
                      {template.createdAt && (
                        <span className="text-slate-600 text-xs self-center">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {template.fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 h-12 overflow-hidden content-start">
                        {template.fields.slice(0, 6).map((field) => (
                          <span
                            key={field}
                            className="text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded"
                          >
                            {field}
                          </span>
                        ))}
                        {template.fields.length > 6 && (
                          <span className="text-[10px] text-slate-500 px-1.5 py-0.5">
                            +{template.fields.length - 6}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/?template=${template.id}`);
                      }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white"
                      size="sm"
                    >
                      Use
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/template-designer?edit=${template.id}`);
                      }}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      disabled={deleting === template.id}
                      className="bg-red-600/80 hover:bg-red-600 text-white"
                      size="sm"
                    >
                      {deleting === template.id ? '...' : 'Del'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
