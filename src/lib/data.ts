import { 
  Invoice, 
  InvoiceSummary, 
  EngineerJob, 
  EngineerSummary, 
  PayrollSummary,
  DashboardData,
  Ticket
} from '@/types';
import { 
  getAllSheetsData, 
  getSheetData, 
  parseCurrency, 
  parseTimeToHours 
} from './sheets';

const INVOICE_SHEET_ID = process.env.INVOICE_SHEET_ID!;
const PAYSLIP_SHEET_ID = process.env.PAYSLIP_SHEET_ID!;

// =====================
// DATE UTILITIES
// =====================

// Get the Monday of a given week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Get the current 2-week pay period (Monday to Monday)
function getPayPeriod(): { start: Date; end: Date } {
  const today = new Date();
  const currentMonday = getMonday(today);
  
  // Go back 2 weeks for the start
  const twoWeeksAgo = new Date(currentMonday);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  return {
    start: twoWeeksAgo,
    end: currentMonday,
  };
}

// Check if a date string is within the pay period
function isWithinPayPeriod(dateStr: string, payPeriod: { start: Date; end: Date }): boolean {
  if (!dateStr) return false;
  
  // Parse date in format "YYYY-MM-DD" or "DD/MM/YYYY"
  let date: Date;
  if (dateStr.includes('-')) {
    date = new Date(dateStr.split(' ')[0]); // Handle "2026-01-15 10:00" format
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    return false;
  }
  
  return date >= payPeriod.start && date <= payPeriod.end;
}

// Get display name (second word of engineer name)
function getDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return parts[1]; // Return second word (Mohammed, Harry, etc.)
  }
  return parts[0] || fullName; // Fallback to first word or full name
}

// =====================
// INVOICE DATA PROCESSING
// =====================

function parseInvoiceRow(row: string[], clientName: string): Invoice | null {
  // Expected columns: PO, WO, Address, Amount, Email, Name, Paid, Director
  if (row.length < 7) return null;
  
  const [po, wo, address, amount, email, name, paid, director] = row;
  
  // Skip header rows
  if (po?.toLowerCase() === 'po' || !po) return null;
  
  return {
    po: po || '',
    wo: wo || '',
    address: address || '',
    amount: parseCurrency(amount),
    email: email || '',
    name: name || '',
    paid: paid?.toUpperCase() === 'PAID' ? 'PAID' : 'NOT PAID',
    director: director || '',
    client: clientName,
  };
}

export async function fetchInvoiceData(): Promise<InvoiceSummary> {
  const allSheets = await getAllSheetsData(INVOICE_SHEET_ID);
  
  const invoices: Invoice[] = [];
  
  for (const { sheetName, data } of allSheets) {
    // Skip the first row (headers)
    for (let i = 1; i < data.length; i++) {
      const invoice = parseInvoiceRow(data[i], sheetName);
      if (invoice) {
        invoices.push(invoice);
      }
    }
  }

  // Calculate summaries
  const outstanding = invoices.filter(inv => inv.paid === 'NOT PAID');
  const paid = invoices.filter(inv => inv.paid === 'PAID');

  // Group by client
  const clientMap = new Map<string, { outstanding: number; paid: number; count: number }>();
  for (const inv of invoices) {
    const current = clientMap.get(inv.client) || { outstanding: 0, paid: 0, count: 0 };
    current.count++;
    if (inv.paid === 'PAID') {
      current.paid += inv.amount;
    } else {
      current.outstanding += inv.amount;
    }
    clientMap.set(inv.client, current);
  }

  // Group by director
  const directorMap = new Map<string, { outstanding: number; count: number }>();
  for (const inv of outstanding) {
    const current = directorMap.get(inv.director) || { outstanding: 0, count: 0 };
    current.outstanding += inv.amount;
    current.count++;
    directorMap.set(inv.director, current);
  }

  return {
    totalOutstanding: outstanding.reduce((sum, inv) => sum + inv.amount, 0),
    totalPaid: paid.reduce((sum, inv) => sum + inv.amount, 0),
    countOutstanding: outstanding.length,
    countPaid: paid.length,
    byClient: Array.from(clientMap.entries())
      .map(([client, data]) => ({ client, ...data }))
      .sort((a, b) => b.outstanding - a.outstanding),
    byDirector: Array.from(directorMap.entries())
      .map(([director, data]) => ({ director, ...data }))
      .filter(d => d.director) // Remove empty director entries
      .sort((a, b) => b.outstanding - a.outstanding),
  };
}

// =====================
// TICKETS DATA PROCESSING
// =====================

function parseTicketRow(row: string[]): Ticket | null {
  // Expected columns: Vehicle reg, Fine amount, Fine-Issued Date, Name, Admin Fee 25£, Date paid, Ref Number
  if (row.length < 4) return null;
  
  const [vehicleReg, fineAmount, fineIssuedDate, name, adminFee, datePaid, refNumber] = row;
  
  // Skip header rows
  if (vehicleReg?.toLowerCase() === 'vehicle reg' || !vehicleReg) return null;
  
  return {
    vehicleReg: vehicleReg || '',
    fineAmount: parseCurrency(fineAmount),
    fineIssuedDate: fineIssuedDate || '',
    engineerName: name || '',
    adminFee: parseCurrency(adminFee),
    datePaid: datePaid || '',
    refNumber: refNumber || '',
  };
}

async function fetchTicketsData(): Promise<Ticket[]> {
  try {
    const ticketsData = await getSheetData(PAYSLIP_SHEET_ID, 'Tickets');
    const tickets: Ticket[] = [];
    
    // Skip header row
    for (let i = 1; i < ticketsData.length; i++) {
      const ticket = parseTicketRow(ticketsData[i]);
      if (ticket) {
        tickets.push(ticket);
      }
    }
    
    return tickets;
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return [];
  }
}

// =====================
// PAYROLL DATA PROCESSING
// =====================

function parsePayslipRow(row: string[], engineerName: string): EngineerJob | null {
  // Expected columns: Job Id, Date, Hours, Cost, Overtime, Hourly Rate
  if (row.length < 4) return null;
  
  const [jobId, date, hours, cost, overtime, hourlyRate] = row;
  
  // Skip header rows
  if (jobId?.toLowerCase() === 'job id' || !jobId) return null;
  
  return {
    jobId: jobId || '',
    date: date || '',
    hours: hours || '0:00:00',
    cost: parseCurrency(cost),
    overtime: parseCurrency(overtime),
    hourlyRate: hourlyRate ? parseCurrency(hourlyRate) : null,
    engineerName,
  };
}

export async function fetchPayrollData(): Promise<PayrollSummary> {
  const [allSheets, tickets] = await Promise.all([
    getAllSheetsData(PAYSLIP_SHEET_ID),
    fetchTicketsData(),
  ]);
  
  const payPeriod = getPayPeriod();
  const engineerSummaries: EngineerSummary[] = [];
  const allJobs: EngineerJob[] = [];
  
  // Create a map of tickets by engineer name (normalized)
  const ticketsByEngineer = new Map<string, Ticket[]>();
  for (const ticket of tickets) {
    const normalizedName = ticket.engineerName.toLowerCase().trim();
    const existing = ticketsByEngineer.get(normalizedName) || [];
    existing.push(ticket);
    ticketsByEngineer.set(normalizedName, existing);
  }
  
  for (const { sheetName, data } of allSheets) {
    // Skip utility sheets like "Tickets", "Jobs with No checkout"
    if (sheetName.toLowerCase() === 'tickets' || 
        sheetName.toLowerCase().includes('no checkout') ||
        data.length < 2) {
      continue;
    }
    
    const jobs: EngineerJob[] = [];
    
    // Skip the first row (headers)
    for (let i = 1; i < data.length; i++) {
      const job = parsePayslipRow(data[i], sheetName);
      if (job) {
        jobs.push(job);
        allJobs.push(job);
      }
    }
    
    if (jobs.length > 0) {
      // Filter jobs within pay period
      const recentJobs = jobs.filter(job => isWithinPayPeriod(job.date, payPeriod));
      
      const totalHours = jobs.reduce((sum, job) => sum + parseTimeToHours(job.hours), 0);
      const totalCost = jobs.reduce((sum, job) => sum + job.cost, 0);
      const totalOvertime = jobs.reduce((sum, job) => sum + job.overtime, 0);
      
      // Get display name (second word)
      const displayName = getDisplayName(sheetName);
      
      // Find tickets for this engineer
      const normalizedSheetName = sheetName.toLowerCase().trim();
      const engineerTickets = ticketsByEngineer.get(normalizedSheetName) || [];
      
      // Also try matching by display name
      const displayNameLower = displayName.toLowerCase();
      for (const [name, tix] of ticketsByEngineer.entries()) {
        if (name.includes(displayNameLower) || displayNameLower.includes(name.split(' ')[0])) {
          engineerTickets.push(...tix.filter(t => !engineerTickets.includes(t)));
        }
      }
      
      const totalFines = engineerTickets.reduce((sum, t) => sum + t.fineAmount + t.adminFee, 0);
      
      engineerSummaries.push({
        name: sheetName,
        displayName,
        totalJobs: jobs.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost,
        totalOvertime,
        averageCostPerJob: jobs.length > 0 ? Math.round(totalCost / jobs.length * 100) / 100 : 0,
        jobs,
        recentJobs: recentJobs.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        tickets: engineerTickets,
        totalFines,
      });
    }
  }

  // Group by date
  const dateMap = new Map<string, { cost: number; jobs: number }>();
  for (const job of allJobs) {
    const dateKey = job.date.split(' ')[0]; // Get just the date part
    const current = dateMap.get(dateKey) || { cost: 0, jobs: 0 };
    current.cost += job.cost;
    current.jobs++;
    dateMap.set(dateKey, current);
  }

  const byDate = Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalFines = tickets.reduce((sum, t) => sum + t.fineAmount + t.adminFee, 0);

  return {
    totalCost: engineerSummaries.reduce((sum, eng) => sum + eng.totalCost, 0),
    totalJobs: allJobs.length,
    totalHours: Math.round(engineerSummaries.reduce((sum, eng) => sum + eng.totalHours, 0) * 100) / 100,
    totalOvertime: engineerSummaries.reduce((sum, eng) => sum + eng.totalOvertime, 0),
    engineerCount: engineerSummaries.length,
    engineers: engineerSummaries.sort((a, b) => b.totalCost - a.totalCost),
    byDate,
    payPeriodStart: payPeriod.start.toISOString().split('T')[0],
    payPeriodEnd: payPeriod.end.toISOString().split('T')[0],
    totalFines,
    totalTickets: tickets.length,
    tickets,
  };
}

// =====================
// COMBINED DASHBOARD DATA
// =====================

export async function fetchDashboardData(): Promise<DashboardData> {
  const [invoices, payroll] = await Promise.all([
    fetchInvoiceData(),
    fetchPayrollData(),
  ]);

  return {
    invoices,
    payroll,
    lastUpdated: new Date().toISOString(),
  };
}
