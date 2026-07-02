'use client';

import React, { useState, useEffect } from 'react';
import { Track, TrackCreate, TrackUpdate, TrackDomain, TrackSource } from '../types/Track';
import { TrackService } from '@/services/trackService';

interface TrackFormProps {
  track?: Track;
  onSubmit: (trackData: TrackCreate | TrackUpdate, domainId?: number, sourceIds?: number[]) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const TrackForm: React.FC<TrackFormProps> = ({ 
  track, 
  onSubmit, 
  onCancel, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState<TrackCreate>({
    name: '',
    domain: '',
    description: '',
    keywords: [],
    sources: [],
    frequency: 1
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [domains, setDomains] = useState<TrackDomain[]>([]);
  const [sourcesOptions, setSourcesOptions] = useState<TrackSource[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | undefined>(undefined);
  const [selectedSourceIds, setSelectedSourceIds] = useState<number[]>([]);

  useEffect(() => {
    if (track && isEditing) {
      setFormData({
        name: track.name,
        domain: track.domain,
        description: track.description || '',
        keywords: track.keywords || [],
        sources: track.sources || [],
        frequency: track.frequency
      });
    }
  }, [track, isEditing]);

  useEffect(() => {
    // Load domain and sources from backend
    const loadOptions = async () => {
      const [ds, ss] = await Promise.all([
        TrackService.listDomains(),
        TrackService.listSources(),
      ]);
      setDomains(ds);
      setSourcesOptions(ss);

      // Preselect based on editing track
      if (track) {
        const dom = ds.find(d => d.name === track.domain);
        setSelectedDomainId(dom?.id);
        const ids = ss.filter(s => (track.sources || []).includes(s.name)).map(s => s.id);
        setSelectedSourceIds(ids);
      }
    };
    loadOptions().catch(err => console.error('Failed to load options', err));
  }, [track]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'frequency' ? parseInt(value) : value
    }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, selectedOptions } = e.target;
    const values = Array.from(selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      [name]: values
    }));
    if (name === 'sources') {
      const ids = Array.from(selectedOptions, option => Number(option.getAttribute('data-id'))).filter(Boolean) as number[];
      setSelectedSourceIds(ids);
    }
  };

  const handleDomainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setFormData(prev => ({ ...prev, domain: value }));
    const found = domains.find(d => d.name === value);
    setSelectedDomainId(found?.id);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !formData.keywords?.includes(newKeyword.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...(prev.keywords || []), newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords?.filter(k => k !== keywordToRemove) || []
    }));
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() && (selectedDomainId || 0) > 0) {
      onSubmit(formData, selectedDomainId, selectedSourceIds);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="space-y-6 p-6 bg-white rounded-lg shadow-md"
      aria-label={isEditing ? "edit track form" : "create track form"}
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Track Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="track name"
        />
      </div>

      <div>
        <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
          Domain *
        </label>
        <select
          id="domain"
          name="domain"
          value={formData.domain}
          onChange={handleDomainChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="domain"
        >
          <option value="">Select a domain</option>
          {domains.map(domain => (
            <option key={domain.id} value={domain.name}>
              {domain.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Optional description for this track"
        />
      </div>

      <div>
        <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
          Frequency (days)
        </label>
        <input
          type="number"
          id="frequency"
          name="frequency"
          value={formData.frequency}
          onChange={handleInputChange}
          min="1"
          max="30"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="sources" className="block text-sm font-medium text-gray-700 mb-2">
          Sources
        </label>
        <select
          id="sources"
          name="sources"
          multiple
          value={formData.sources}
          onChange={handleMultiSelectChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
          aria-label="sources"
        >
          {sourcesOptions.map(source => (
            <option key={source.id} value={source.name} data-id={source.id}>
              {source.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple sources</p>
      </div>



      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Keywords
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Enter keyword"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="keyword"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="add-keyword-btn"
          >
            Add
          </button>
        </div>
        {formData.keywords && formData.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2" role="list" aria-label="keywords list">
            {formData.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>



      <div className="flex gap-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          id="track-form-submit-btn"
        >
          {isEditing ? 'Update Track' : 'Create Track'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          id="track-form-cancel-btn"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default TrackForm; 