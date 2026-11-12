import { env } from '../config/env';
import { Attendance } from '../models/Attendance';
import { Fee } from '../models/Fee';
import { Mark } from '../models/Mark';
import { Student } from '../models/Student';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { currentMonth } from '../utils/time';

export const myRecord = asyncHandler(async (req, res) => {
  const studentId = req.studentId;
  if (!studentId) throw new HttpError(401, 'Sign in with your student ID to continue.');

  const student = await Student.findOne({ studentId }).select('-qrCodeData');
  if (!student) throw new HttpError(404, 'Student not found.');

  const month = currentMonth();
  const [fee, fees, marks, monthAttendance, recentAttendance] = await Promise.all([
    Fee.findOne({ studentId, month }),
    Fee.find({ studentId }).sort({ month: -1 }).limit(12),
    Mark.find({ studentId }).sort({ date: -1 }).limit(20),
    Attendance.find({ studentId, date: { $gte: `${month}-01`, $lte: `${month}-31` } }).sort({ date: -1 }),
    Attendance.find({ studentId }).sort({ date: -1 }).limit(8),
  ]);

  const present = monthAttendance.filter((row) => row.status === 'Present').length;
  const late = monthAttendance.filter((row) => row.status === 'Late').length;

  res.json({
    success: true,
    data: {
      student,
      month,
      currency: env.currency,
      fee: {
        month,
        amount: fee?.amount ?? env.defaultMonthlyFee,
        status: fee?.status ?? 'Pending',
        paidDate: fee?.paidDate ?? null,
        recorded: Boolean(fee),
      },
      attendance: {
        present,
        late,
        total: present + late,
        recent: recentAttendance,
      },
      fees,
      marks: marks.map((mark) => ({
        _id: mark._id,
        examTitle: mark.examTitle,
        score: mark.score,
        totalMarks: mark.totalMarks,
        date: mark.date,
        percentage: mark.totalMarks === 0 ? 0 : Math.round((mark.score / mark.totalMarks) * 1000) / 10,
      })),
    },
  });
});
