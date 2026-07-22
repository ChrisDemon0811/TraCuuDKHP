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

export type LockerSession = "morning" | "afternoon";

export interface LockerSlot {
  dayOfWeek: number;
  session: LockerSession;
  startTime: string;
  endTime: string;
}

export interface FormLocker {
  id: string;
  facultyName: string;
  shortName: string;
  lockerLabel: string;
  scheduleText: string;
  slots: LockerSlot[];
}

export interface LockerStatus {
  isOpen: boolean;
  statusText: "Đang mở" | "Đã khóa";
  activeSlot: LockerSlot | null;
  currentSessionText: string | null;
  nextOpenText: string;
}
