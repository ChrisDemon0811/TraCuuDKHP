import registrationScheduleData from "@/data/registration-schedule.json";
import type { RegistrationData } from "@/types";

export const registrationData = registrationScheduleData as RegistrationData;
export const faculties = registrationData.faculties;
export const schedules = registrationData.schedules;

export const facultyById = new Map(faculties.map((faculty) => [faculty.id, faculty]));
