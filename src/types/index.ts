// User Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPublic {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// Baby Types
export interface Baby {
  id: string;
  name: string;
  birthDate: Date;
  gender: string | null;
  avatarUrl: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BabyWithStats extends Baby {
  todayRecordsCount: number;
}

// Record Types
export interface Record {
  id: string;
  type: string;
  babyId: string;
  startTime: Date;
  endTime: Date | null;
  amount: number | null;
  unit: string | null;
  feedingType: string | null;
  diaperStatus: string | null;
  medicalCategory: string | null;
  medicalHospital: string | null;
  medicalDepartment: string | null;
  medicalDiagnosis: string | null;
  medicalPrescription: string | null;
  medicalCost: number | null;
  followUpDate: Date | null;
  vaccineName: string | null;
  vaccineDoseNumber: number | null;
  vaccineTotalDoses: number | null;
  vaccineStatus: string | null;
  nextDoseDate: Date | null;
  contraindication: string | null;
  adverseReaction: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordWithBaby extends Record {
  baby: Baby;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Session Types
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// Stats Types
export interface TodayStats {
  feedingCount: number;
  feedingTotalAmount: number;
  sleepTotalMinutes: number;
  diaperCount: number;
  bathCount: number;
}

export interface WeeklyStats {
  date: string;
  feedingAmount: number;
  sleepMinutes: number;
  diaperCount: number;
}

// Admin Types
export interface PlatformStats {
  totalUsers: number;
  totalBabies: number;
  totalRecords: number;
  todayRecords: number;
}

export interface UserWithBabiesCount extends UserPublic {
  babiesCount: number;
  createdAt: Date;
}
