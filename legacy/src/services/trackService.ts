import { Track, TrackCreate, TrackUpdate, TrackCreateRequest, TrackUpdateRequest, TrackDomain, TrackSource } from '@/types/Track';

const API_PREFIX = '/api';

interface BackendTrackDomain {
  name?: string | null;
}

interface BackendTrackSource {
  name: string;
}

interface BackendTrackModel {
  uuid: string;
  name: string;
  track_domain?: BackendTrackDomain | null;
  description?: string | null;
  keywords?: string[] | null;
  track_sources?: BackendTrackSource[] | null;
  frequency: number;
  created_at: string;
  updated_at: string;
}

function mapBackendTrackToUi(backend: BackendTrackModel): Track {
  return {
    id: backend.uuid,
    name: backend.name,
    domain: backend.track_domain?.name ?? '',
    description: backend.description ?? undefined,
    keywords: backend.keywords ?? undefined,
    sources: Array.isArray(backend.track_sources) ? backend.track_sources.map((s: BackendTrackSource) => s.name) : undefined,
    frequency: backend.frequency,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
  };
}

export class TrackService {
  static async list(): Promise<Track[]> {
    const res = await fetch(`${API_PREFIX}/tracks/list`, { cache: 'no-store' });
    if (!res.ok) {
      // If backend does not support list yet, return empty
      return [];
    }
    const data = await res.json();
    // OpenAPI: ResponseWrapper[ResponseListWrapper[List[TrackFullResponseModel]]]
    const items: BackendTrackModel[] =
      (data?.data?.items && Array.isArray(data.data.items) && data.data.items) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.data) && data.data) ||
      [];
    return items.map(mapBackendTrackToUi);
  }

  static async listDomains(): Promise<TrackDomain[]> {
    const res = await fetch(`${API_PREFIX}/track-domains`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch track domains');
    const data = await res.json();
    const items: TrackDomain[] =
      (data?.data?.items && Array.isArray(data.data.items) && data.data.items) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.data) && data.data) ||
      [];
    return items as TrackDomain[];
  }

  static async listSources(): Promise<TrackSource[]> {
    const res = await fetch(`${API_PREFIX}/track-sources`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch track sources');
    const data = await res.json();
    const items: TrackSource[] =
      (data?.data?.items && Array.isArray(data.data.items) && data.data.items) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.data) && data.data) ||
      [];
    return items as TrackSource[];
  }

  static async get(uuid: string): Promise<Track> {
    const res = await fetch(`${API_PREFIX}/tracks?uuid=${encodeURIComponent(uuid)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch track');
    const data = await res.json();
    return mapBackendTrackToUi(data.data as BackendTrackModel);
  }

  static async create(input: TrackCreate, domainId: number, sourceIds: number[]): Promise<string> {
    const payload: TrackCreateRequest = {
      name: input.name,
      description: input.description,
      keywords: input.keywords,
      frequency: input.frequency ?? 1,
      track_domain_id: domainId,
      track_source_ids: sourceIds,
    };
    const res = await fetch(`${API_PREFIX}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to create track');
    }
    const data = await res.json();
    return data.data.uuid as string;
  }

  static async update(uuid: string, input: TrackUpdate, domainId?: number, sourceIds?: number[]): Promise<string> {
    const payload: TrackUpdateRequest = {
      uuid,
      name: input.name ?? null,
      description: input.description ?? null,
      keywords: input.keywords ?? null,
      frequency: input.frequency ?? null,
      track_domain_id: domainId ?? null,
      track_source_ids: sourceIds ?? null,
    };
    const res = await fetch(`${API_PREFIX}/tracks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to update track');
    }
    const data = await res.json();
    return data.data.uuid as string;
  }

  static async remove(uuid: string): Promise<string> {
    const res = await fetch(`${API_PREFIX}/tracks`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uuid }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to delete track');
    }
    const data = await res.json();
    return data.data.uuid as string;
  }
}


