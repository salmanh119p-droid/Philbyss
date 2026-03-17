// Invoice Types
export interface Invoice {
  po: string;
  wo: string;
  address: string;
  amount: number;
  email: string;
  name: string;
  paid: 'PAID' | 'NOT PAID';
  director: string;
  client: string; // The sheet/tab name (client/agency)
}

export interface InvoiceSummary {
  totalOutstanding: number;
  totalPaid: number;
  countOutstanding: number;
  countPaid: number;
  byClient: {
    client: string;
    outstanding: number;
    paid: number;
    count: number;
  }[];
  byDirector: {
    director: string;
    outstanding: number;
    count: number;
  }[];
  byPM: {
    email: string;
    pmName: string; // Extracted from email or Name column
    outstanding: number;
    paid: number;
    count: number;
  }[];
}

// Engineer/Payslip Types
export interface EngineerJob {
  jobId: string;
  date: string;
  hours: string;
  hoursDecimal: number; // Numeric hours for flagging
  cost: number;
  overtime: number;
  hourlyRate: number | null;
  engineerName: string;
  rowIndex: number; // For updating the sheet
}

// Ticket/Fine Types
export interface Ticket {
  vehicleReg: string;
  fineAmount: number;
  fineIssuedDate: string;
  engineerName: string;
  adminFee: number;
  datePaid: string;
  refNumber: string;
  totalAmount: number; // The actual total from Admin Fee column
}

export interface EngineerSummary {
  name: string;
  displayName: string; // Second word of name (Mohammed, Harry, etc.)
  totalJobs: number;
  totalHours: number;
  totalCost: number;
  totalOvertime: number;
  averageCostPerJob: number;
  jobs: EngineerJob[];
  recentJobs: EngineerJob[]; // Last 2 weeks only
  tickets: Ticket[]; // Fines for this engineer
  totalFines: number;
}

export interface PayrollSummary {
  totalCost: number;
  totalJobs: number;
  totalHours: number;
  totalOvertime: number;
  engineerCount: number;
  engineers: EngineerSummary[];
  byDate: {
    date: string;
    cost: number;
    jobs: number;
  }[];
  // Pay period info
  payPeriodStart: string;
  payPeriodEnd: string;
  // Tickets summary
  totalFines: number;
  totalTickets: number;
  tickets: Ticket[];
}

// Dashboard State
export interface DashboardData {
  invoices: InvoiceSummary;
  payroll: PayrollSummary;
  lastUpdated: string;
}

// Material Search Types
export interface MaterialSearchResult {
  rank: number;
  title: string;
  price: string;
  supplier: string;
  also_available: string;
  delivery: string;
  rating: string;
  url: string;
  image: string | null;
  why: string;
}

export interface MaterialSearchResponse {
  query_original: string;
  query_optimized: string;
  suppliers_searched: string[];
  results: MaterialSearchResult[];
}

// Job Dispatch Types (Supabase)
export interface Job {
  id: string;
  job_ref: string;
  source: string;
  job_title: string;
  trade: string;
  priority: string;
  status: string;
  property_address: string;
  postcode: string;
  landlord: string | null;
  company: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_email: string | null;
  job_description: string;
  instruction_notes: string | null;
  fixflo_ref: string | null;
  assigned_by: string | null;
  assigned_engineer: string | null;
  works_due_by: string | null;
  date_raised: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  job_id: string;
  material_name: string;
  quantity: number;
  created_at: string;
}

// Engineer Matching Types (n8n webhook response)
export interface EngineerBookedSlot {
  start: string;
  end: string;
  hours: number;
  job_uuid: string;
}

export interface EngineerFreeSlot {
  start: string;
  end: string;
  hours: number;
}

export interface EngineerDayAvailability {
  date: string;
  day: string;
  label: string;
  is_today: boolean;
  on_leave?: boolean;
  booked_slots: EngineerBookedSlot[];
  free_slots: EngineerFreeSlot[];
  total_free_hours: number;
  total_booked_hours: number;
  booking_count: number;
}

export interface EngineerLeavePeriod {
  leave_type: string;
  leave_start: string;
  leave_end: string;
  notes: string | null;
}

export interface EngineerMatch {
  staff_uuid: string;
  name: string;
  email: string;
  mobile: string;
  match_score: number;
  trade_score: number;
  trade_match_reason: string;
  area: string;
  area_match: boolean;
  certifications: string[];
  trades: string[];
  skills: string[];
  badge: string | null;
  on_leave_today: boolean;
  leave_dates: string[];
  leave_periods: EngineerLeavePeriod[];
  week_summary: {
    total_free_hours: number;
    today_free_hours: number;
  };
  availability: EngineerDayAvailability[];
}

export interface EngineerSearchResponse {
  error: boolean;
  job: {
    job_ref: string;
    trade: string;
    job_title: string;
    postcode: string;
    region: string;
    priority: string;
  };
  request: {
    timestamp: string;
    today: string;
    current_hour: string;
    date_from: string;
    num_days: number;
    date_range: { from: string; to: string };
  };
  total_matched: number;
  total_others: number;
  matched_engineers: EngineerMatch[];
  other_engineers: EngineerMatch[];
}

// Single Engineer Availability Response (engineer-availability webhook)
export interface EngineerAvailabilityResponse {
  error: boolean;
  engineer: {
    staff_uuid: string;
    name: string;
    full_name: string;
    trades: string[];
    skills: string[];
    area: string;
    certifications: string[];
    on_leave_today: boolean;
    leave_dates: string[];
    leave_periods: EngineerLeavePeriod[];
  };
  request: {
    date_from: string;
    date_to: string;
    num_days: number;
    today: string;
  };
  week_summary: {
    total_free_hours: number;
    today_free_hours: number;
  };
  availability: EngineerDayAvailability[];
}

// Supabase Engineer Profiles
export interface Engineer {
  id: string;
  sm8_uuid: string;
  display_name: string;
  full_name: string;
  email: string;
  mobile: string;
  trades: string[];
  skills: string[];
  area: string;
  area_display: string;
  certifications: string[];
  is_active: boolean;
}

export interface EngineerLeave {
  id: string;
  engineer_id: string;
  leave_type: string;
  leave_start: string;
  leave_end: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  engineers?: { display_name: string; sm8_uuid: string };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
