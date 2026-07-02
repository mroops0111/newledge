export interface Track {
  id: string; // uuid
  name: string;
  domain: string; // mapped from backend track_domain.name
  description?: string;
  keywords?: string[];
  sources?: string[]; // mapped from backend track_sources[].name
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackCreate {
  name: string;
  domain: string; // kept for UI usage only
  description?: string;
  keywords?: string[];
  sources?: string[];
  frequency?: number;
}

export interface TrackUpdate {
  name?: string;
  domain?: string; // kept for UI usage only
  description?: string;
  keywords?: string[];
  sources?: string[];
  frequency?: number;
}

// Backend models
export interface TrackDomain {
  id: number;
  name: string;
  description?: string | null;
}

export interface TrackSource {
  id: number;
  name: string;
  description?: string | null;
}

// Backend request payloads
export interface TrackCreateRequest {
  name: string;
  description?: string;
  keywords?: string[];
  frequency?: number;
  track_domain_id: number;
  track_source_ids: number[];
}

export interface TrackUpdateRequest {
  uuid: string;
  name?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  frequency?: number | null;
  track_domain_id?: number | null;
  track_source_ids?: number[] | null;
}