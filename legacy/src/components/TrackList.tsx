'use client';

import React, { useState } from 'react';
import { Track } from '../types/Track';

interface TrackListProps {
  tracks: Track[];
  onEdit: (track: Track) => void;
  onDelete: (trackId: string) => void;
}

const TrackList: React.FC<TrackListProps> = ({ tracks, onEdit, onDelete }) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (trackId: string) => {
    setDeleteConfirmId(trackId);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tracks found. Create your first track to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="list" aria-label="tracks list" className="space-y-4">
        {tracks.map((track) => (
          <div
            key={track.id}
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
            data-track-id={track.id}
            data-track-name={track.name}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {track.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {track.domain}
                  </span>
                  <span>Frequency: {track.frequency} day{track.frequency !== 1 ? 's' : ''}</span>
                </div>
                {track.description && (
                  <p className="text-gray-600 mb-3">{track.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(track)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  id={`edit-track-${track.id}-btn`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteClick(track.id)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  id={`delete-track-${track.id}-btn`}
                >
                  Delete
                </button>
              </div>
            </div>

            {track.keywords && track.keywords.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Keywords:</h4>
                <div className="flex flex-wrap gap-2">
                  {track.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {track.sources && track.sources.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sources:</h4>
                <div className="flex flex-wrap gap-2">
                  {track.sources.map((source, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}




          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-label="delete confirmation dialog"
        >
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this track? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                id="delete-dialog-confirm-btn"
              >
                Delete
              </button>
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                id="delete-dialog-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackList; 