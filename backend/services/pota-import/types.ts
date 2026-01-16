export type PotaPark = {
  reference?: string;
  potaId?: string;
  pota_ref?: string;
  potaRef?: string;
  name?: string;
  parktypeDesc?: string;
  parkTypeDesc?: string;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  parkComments?: string;
  accessMethods?: string;
  activationMethods?: string;
  grid6?: string;
  grid4?: string;
  activations?: number;
  qsos?: number;
  [key: string]: unknown;
};

export type ParkTypeMappingItem = {
  id: string;
  chineseName: string;
  englishName: string;
};

export type ParkTypeMappings = {
  chinese_to_english: ParkTypeMappingItem[];
  english_to_chinese?: ParkTypeMappingItem[];
  pota_only_types?: ParkTypeMappingItem[];
  default_pota_type?: ParkTypeMappingItem;
};

export type ParkTypeIndexItem = {
  id: string;
  zh: string;
  en: string;
};

export type ParkTypeIndex = {
  allTypes: ParkTypeMappingItem[];
  byId: Map<string, ParkTypeIndexItem>;
  byEnglish: Map<string, string[]>;
  byChinese: Map<string, string>;
};

export type InternalPark = {
  park_name: string;
  park_type: string | null;
  provinces: string[];
  latitude?: number;
  longitude?: number;
  website?: string | null;
  description?: string;
  access_methods: string[];
  activation_methods: string[];
  confirmed_authenticity: boolean;
  pota_ref?: string;
  pota_park_type?: string | null;
};

export type UnprocessedPark = {
  reference?: string;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  locationDesc?: string;
  grid?: string;
  activations?: number | null;
  qsos?: number | null;
  failureReason?: string;
  parkTypeDesc?: string;
  accessMethods?: string;
  activationMethods?: string;
  website?: string;
  parkComments?: string;
  manualType?: string;
  message?: string;
};

export type ImportResult = {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<Record<string, unknown>>;
  needs_manual_confirmation: UnprocessedPark[];
};

export type ImportTask = {
  id: string;
  operatorId: number;
  operatorRole: string;
  operationType: 'manual' | 'auto';
  status: 'pending' | 'running' | 'success' | 'partial_success' | 'failed';
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: ImportResult | null;
  error: string | null;
  readAt: string | null;
};
