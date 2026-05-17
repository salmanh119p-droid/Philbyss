export type EngineerArea =
  | 'all'
  | 'east'
  | 'north_west'
  | 'north_east'
  | 'south'
  | 'central'
  | 'midlands';

export const ENGINEER_AREAS: { value: EngineerArea; label: string }[] = [
  { value: 'all', label: 'All Areas' },
  { value: 'east', label: 'East' },
  { value: 'north_west', label: 'North West' },
  { value: 'north_east', label: 'North East' },
  { value: 'south', label: 'South' },
  { value: 'central', label: 'Central' },
  { value: 'midlands', label: 'Midlands' },
];

export const TRADE_OPTIONS = [
  'Plumbing',
  'Electrical',
  'Gas',
  'Heating',
  'Carpentry',
  'Roofing',
  'General',
];

export const CERTIFICATION_OPTIONS = [
  'Gas Safe',
  'NICEIC',
  'OFTEC',
  'NAPIT',
  'Part P',
  'WaterSafe',
  'CSCS',
];

export interface Engineer {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  email: string;
  phone: string;
  start_date: string | null;
  area: EngineerArea | null;
  trades: string[] | null;
  skills: string[] | null;
  certifications: string[] | null;
  notes: string | null;
  is_active: boolean;
  sm8_staff_uuid: string | null;
  samsara_driver_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export type ProvisioningStatus = 'success' | 'failed' | 'skipped' | 'pending';

export interface EngineerProvisioningLog {
  id: string;
  engineer_id: string;
  action: 'create' | 'deactivate' | string;
  sm8_status: ProvisioningStatus | null;
  samsara_status: ProvisioningStatus | null;
  supabase_status: ProvisioningStatus | null;
  payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

export interface AddEngineerFormData {
  first_name: string;
  last_name: string;
  display_name?: string;
  email: string;
  phone: string;
  start_date?: string;
  area: EngineerArea;
  trades: string[];
  skills: string[];
  certifications: string[];
  notes?: string;
  create_samsara_driver: boolean;
  send_welcome_email: boolean;
}
