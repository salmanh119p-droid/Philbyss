# Philbys Operations Dashboard

A real-time dashboard for tracking invoices and engineer payroll for Philbys Group Ltd. Built with Next.js 14, TypeScript, and Tailwind CSS.

![Dashboard Preview](https://philbysltd.com/wp-content/uploads/2025/02/Philbys-Group-Logo-White.png)

## Features

### 📊 Invoice Tracking
- Total outstanding vs paid amounts
- Breakdown by client/agency (60+ clients)
- Breakdown by director (who's chasing what)
- Searchable and sortable tables
- Visual charts and summaries

### 👷 Engineer Payroll
- Total payroll costs
- Per-engineer breakdown with job details
- Hours worked tracking
- Timeline view of costs over time
- Support for Day Rate, Hourly, and Per-Job pay types

### 🔄 Real-Time Updates
- Auto-refreshes every 30 seconds
- Manual refresh button
- Live connection to Google Sheets

### 🔐 Security
- Password-protected access
- Secure session cookies
- Server-side authentication

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Data Source**: Google Sheets API
- **Deployment**: Vercel

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd operations-dashboard
npm install
```

### 2. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Sheets API**:
   - Go to APIs & Services > Library
   - Search for "Google Sheets API"
   - Click Enable

4. Create a Service Account:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "Service Account"
   - Name it (e.g., "philbys-dashboard")
   - Click "Create and Continue"
   - Skip the optional steps, click "Done"

5. Create a JSON Key:
   - Click on your new service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the file

6. Share Your Spreadsheets:
   - Open each Google Sheet
   - Click "Share"
   - Add the service account email (looks like: `name@project.iam.gserviceaccount.com`)
   - Give "Viewer" access

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Dashboard password (change this!)
DASHBOARD_PASSWORD=your-secure-password

# Paste the ENTIRE contents of your JSON key file here (as a single line)
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# Spreadsheet IDs (already configured for Philbys)
INVOICE_SHEET_ID=1yjd2XlpYz7-L9ZyJTTu1Fwkj4qupAWXDJK1Fmk0kyK0
PAYSLIP_SHEET_ID=1aMdn-F2_Gwntn7ZTj7IzsNHGSWrWjSpcYSaQrXlWqjY
ENGINEER_RATES_SHEET_ID=1nSnxxgmog46Rb5tj8aeCW9S98qSaU5_srtk_CYO0Yxw
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables in Vercel dashboard:
   - `DASHBOARD_PASSWORD`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `INVOICE_SHEET_ID`
   - `PAYSLIP_SHEET_ID`
   - `ENGINEER_RATES_SHEET_ID`
5. Deploy!

## Spreadsheet Structure

### Invoice Chasing Sheet
Each tab represents a client/agency. Expected columns:
| Column | Description |
|--------|-------------|
| PO | Purchase Order number |
| WO | Work Order number |
| Address | Property address |
| Amount | Invoice amount (£) |
| Email | Contact email |
| Name | Contact name |
| Paid | "PAID" or "NOT PAID" |
| Director | Person responsible for chasing |

### Engineers Payslip Sheet
Each tab represents an engineer. Expected columns:
| Column | Description |
|--------|-------------|
| Job Id | ServiceM8 job ID |
| Date | Completion date |
| Hours | Time worked (HH:MM:SS) |
| Cost | Pay amount (£) |
| Overtime | Overtime amount (£) |
| Hourly Rate | Rate if applicable |

## Customization

### Changing the Refresh Interval
In `src/components/DashboardClient.tsx`, find:
```javascript
const interval = setInterval(() => fetchData(false), 30000);
```
Change `30000` (30 seconds) to your preferred interval in milliseconds.

### Adding New Metrics
1. Update types in `src/types/index.ts`
2. Add data processing in `src/lib/data.ts`
3. Create components in `src/components/`
4. Add to dashboard in `src/components/DashboardClient.tsx`

## Troubleshooting

### "Failed to authenticate with Google Sheets API"
- Check that `GOOGLE_SERVICE_ACCOUNT_KEY` is valid JSON
- Ensure the key is on a single line in the env file
- Verify the service account has access to the spreadsheets

### "Unauthorized" error
- Clear browser cookies
- Check `DASHBOARD_PASSWORD` is set correctly

### Data not updating
- Check the spreadsheet structure matches expected columns
- Verify the service account email has been shared on all sheets
- Check browser console for errors

## Support

For issues or questions, contact the Philbys IT team.

---

© 2026 Philbys Group Ltd. All rights reserved.
