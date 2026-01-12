// src/pages/add-park/types.ts
import type { LatLngTuple } from 'leaflet';

export type Province = { name: string; code: string };

export type PotaLookupItem = {
  type: string;
  id: number;
  display: string;
  value: string;
};

export type PotaParkInfo = {
  parkId: number;
  reference: string;
  name: string;
  latitude: number;
  longitude: number;
  grid4: string;
  grid6: string;
  parktypeId: number;
  active: number;
  parkComments: string;
  accessibility: string | null;
  sensitivity: string | null;
  accessMethods: string;
  activationMethods: string;
  agencies: string | null;
  agencyURLs: string | null;
  parkURLs: string | null;
  website: string;
  createdByAdmin: string;
  parktypeDesc: string;
  locationDesc: string;
  locationName: string;
  entityId: number;
  entityName: string;
  referencePrefix: string;
  entityDeleted: number;
};

export type MapPOI = {
  id: number;
  name: string;
  displayName: string;
  province: string;
  city: string;
  lat: number;
  lon: number;
};

export type ParkTypeOption = {
  id: number;
  zh: string;
  en: string;
};

export type FormState = {
  parkName: string;
  parkType: string;
  province: string;
  provinces: string[];
  latitude: string;
  longitude: string;
  website: string;
  accessMethods: string[];
  activationMethods: string[];
  confirmed: boolean;
  isPotaPark: boolean;
  mapCenter: LatLngTuple;
  mapZoom: number;
};
