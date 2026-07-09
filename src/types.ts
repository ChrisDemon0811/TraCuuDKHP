export interface Faculty {
  id: string;
  name: string;
  shortName: string;
  patterns: string[];
  tokens: string[];
}

export interface ScheduleDisplay {
  start: string;
  transition: string;
  close: string;
}

export interface ScheduleTokenRule {
  facultyId: string;
  tokens: string[];
  label: string;
  certainty: "certain" | "needs-review";
  note?: string;
}

export interface RegistrationSchedule {
  id: string;
  cohort: number;
  group: string;
  title: string;
  appliesToFacultyIds?: string[];
  appliesToTokenRules?: ScheduleTokenRule[];
  appliesToDescriptions: string[];
  startFrom: string;
  startTo: string;
  transitionAt: string;
  closeAt: string;
  display: ScheduleDisplay;
  note?: string;
}

export interface RegistrationData {
  faculties: Faculty[];
  schedules: RegistrationSchedule[];
}

export interface FacultyDetection {
  faculty: Faculty;
  matchedPatterns: string[];
  matchedTokens: string[];
  matchKind: "pattern" | "token";
}

export interface ScheduleMatch {
  schedule: RegistrationSchedule;
  reason: string;
}

export type LookupStatus =
  | "empty"
  | "invalid"
  | "not_found"
  | "ambiguous_faculty"
  | "faculty_without_schedule"
  | "found";

export interface LookupResult {
  status: LookupStatus;
  input: string;
  normalizedCode: string;
  cohort: number | null;
  facultyMatches: FacultyDetection[];
  selectedFaculty?: FacultyDetection;
  schedules: ScheduleMatch[];
  warnings: string[];
  message: string;
}
