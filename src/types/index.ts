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
  success: boolean;
  query_original: string;
  query_optimized: string;
  suppliers_searched: string[];
  results: MaterialSearchResult[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
