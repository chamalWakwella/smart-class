export type Grade = 9 | 10 | 11;
export type FeeStatus = 'Paid' | 'Pending';
export type AttendanceStatus = 'Present' | 'Late';

export type Student = {
  _id: string;
  studentId: string;
  name: string;
  grade: Grade;
  guardianPhone: string;
  qrCodeData: string;
  createdAt: string;
  updatedAt: string;
};

export type Attendance = {
  _id: string;
  studentId: string;
  date: string;
  timestamp: string;
  status: AttendanceStatus;
};

export type ScanResponse = {
  student: Student;
  attendance: Attendance;
  alreadyMarked: boolean;
  fee: {
    month: string;
    amount: number;
    status: FeeStatus;
    paidDate: string | null;
    recorded: boolean;
  };
};

export type AttendanceRow = {
  attendance: Attendance;
  student: Pick<Student, 'studentId' | 'name' | 'grade' | 'guardianPhone'> | null;
  feeStatus: FeeStatus;
};

export type AttendanceList = {
  date: string;
  timezone: string;
  lateAfter: string;
  records: AttendanceRow[];
};

export type AppConfig = {
  className: string;
  teacherName: string;
  teacherPhone: string;
  currency: string;
  lateAfter: string;
  timezone: string;
  defaultMonthlyFee: number;
  authRequired: boolean;
  today: string;
};

export type FeeRow = {
  student: Pick<Student, 'studentId' | 'name' | 'grade' | 'guardianPhone'>;
  fee: {
    _id: string | null;
    month: string;
    amount: number;
    status: FeeStatus;
    paidDate: string | null;
    recorded: boolean;
  };
  attendance: {
    present: number;
    late: number;
    total: number;
  };
};

export type FeeDashboard = {
  month: string;
  classDays: number;
  currency: string;
  totals: {
    paidCount: number;
    pendingCount: number;
    collected: number;
    outstanding: number;
  };
  rows: FeeRow[];
};

export type Mark = {
  _id: string;
  studentId: string;
  studentName: string;
  grade: Grade | null;
  examTitle: string;
  score: number;
  totalMarks: number;
  date: string;
  percentage: number;
};

export type MarkSummary = {
  examTitle: string;
  count: number;
  averagePercentage: number;
  highest: { studentId: string; name: string; percentage: number } | null;
  lowest: { studentId: string; name: string; percentage: number } | null;
  rows: Array<{
    studentId: string;
    name: string;
    grade: Grade | null;
    score: number;
    totalMarks: number;
    percentage: number;
    date: string;
  }>;
};
