'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TrackForm from '../../components/TrackForm';
import TrackList from '../../components/TrackList';
import { Track, TrackCreate, TrackUpdate } from '../../types/Track';
import { TrackService } from '@/services/trackService';
import { useAuth } from '@/contexts/AuthContext';

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Initial load: fetch user's tracks list if backend supports it
  useEffect(() => {
    let mounted = true;
    // Redirect to landing page if not authenticated
    if (!isLoading && !isAuthenticated) {
      setTracks([]);
      router.replace('/');
      return () => {
        mounted = false;
      };
    }

    if (!isAuthenticated) return () => { mounted = false; };

    (async () => {
      try {
        setLoading(true);
        const list = await TrackService.list();
        if (mounted) setTracks(list);
      } catch (_error) {
        // ignore; already handled gracefully in service
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, isLoading, router]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateTrack = async (
    trackData: TrackCreate,
    domainId: number,
    sourceIds: number[]
  ) => {
    try {
      setLoading(true);
      const uuid = await TrackService.create(trackData, domainId, sourceIds);
      // Fetch created track detail for display
      const created = await TrackService.get(uuid);
      setTracks(prev => [...prev, created]);
      setShowForm(false);
      showMessage('success', 'Track created successfully!');
    } catch (error: unknown) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to create track');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTrack = async (
    trackData: TrackUpdate,
    domainId?: number,
    sourceIds?: number[]
  ) => {
    if (!editingTrack) return;
    try {
      setLoading(true);
      await TrackService.update(editingTrack.id, trackData, domainId, sourceIds);
      const updated = await TrackService.get(editingTrack.id);
      setTracks(prev => prev.map(t => (t.id === editingTrack.id ? updated : t)));
      setEditingTrack(null);
      showMessage('success', 'Track updated successfully!');
    } catch (error: unknown) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to update track');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    try {
      setLoading(true);
      await TrackService.remove(trackId);
      setTracks(prev => prev.filter(track => track.id !== trackId));
      showMessage('success', 'Track deleted successfully!');
    } catch (error: unknown) {
      showMessage('error', error instanceof Error ? error.message : 'Failed to delete track');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrack = (track: Track) => {
    setEditingTrack(track);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTrack(null);
  };

  const handleFormSubmit = (
    trackData: TrackCreate | TrackUpdate,
    domainId?: number,
    sourceIds?: number[]
  ) => {
    if (editingTrack) {
      handleUpdateTrack(trackData as TrackUpdate, domainId, sourceIds);
    } else {
      handleCreateTrack(trackData as TrackCreate, domainId!, sourceIds || []);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Management</h1>
          <p className="text-gray-600">
            Set up and manage your tracks to monitor specific topics and sources.
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        {/* Add New Track Button */}
        {!showForm && !editingTrack && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className={`px-6 py-3 bg-blue-500 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
              disabled={loading}
              id="add-new-track-btn"
            >
              {loading ? 'Processing...' : 'Add New Track'}
            </button>
          </div>
        )}

        {/* Track Form */}
        {(showForm || editingTrack) && (
          <div className="mb-8">
            <TrackForm
              track={editingTrack || undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              isEditing={!!editingTrack}
            />
          </div>
        )}

        {/* Track List - hide when editing to avoid duplicated context */}
        {!editingTrack && (
          <TrackList
            tracks={tracks}
            onEdit={handleEditTrack}
            onDelete={handleDeleteTrack}
          />
        )}
      </div>
    </div>
  );
} 