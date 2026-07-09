import "server-only";

import { google } from "googleapis";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const MAJOR_SUGGESTION_RANGE = "ma_nganh_gop_y!A:N";
const BUG_REPORT_RANGE = "bao_loi!A:J";

export interface MajorSuggestionSheetData {
  id: string;
  createdAt: string;
  type: "major_suggestion";
  selectedFacultyId: string;
  selectedFacultyName: string;
  newCodePattern: string;
  classCodeExample: string;
  note: string;
  existingPatternsSnapshot: string;
  pageUrl: string;
  userAgent: string;
  ipHash: string;
}

export interface BugReportSheetData {
  id: string;
  createdAt: string;
  type: "bug_report";
  errorTitle: string;
  message: string;
  pageUrl: string;
  userAgent: string;
  ipHash: string;
}

export function getSheetsClient() {
  const email = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const key = getRequiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [SHEETS_SCOPE]
  });

  return google.sheets({ version: "v4", auth });
}

export async function appendMajorSuggestion(data: MajorSuggestionSheetData) {
  await appendRow(MAJOR_SUGGESTION_RANGE, [
    data.id,
    data.createdAt,
    data.type,
    data.selectedFacultyId,
    data.selectedFacultyName,
    data.newCodePattern,
    data.classCodeExample,
    data.note,
    data.existingPatternsSnapshot,
    data.pageUrl,
    data.userAgent,
    data.ipHash,
    "pending",
    ""
  ]);
}

export async function appendBugReport(data: BugReportSheetData) {
  await appendRow(BUG_REPORT_RANGE, [
    data.id,
    data.createdAt,
    data.type,
    data.errorTitle,
    data.message,
    data.pageUrl,
    data.userAgent,
    data.ipHash,
    "pending",
    ""
  ]);
}

async function appendRow(range: string, values: string[]) {
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEET_ID");
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [values]
    }
  });
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
