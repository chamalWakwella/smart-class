import { env } from '../config/env';
import { Attendance } from '../models/Attendance';
import { Fee } from '../models/Fee';
import { Student } from '../models/Student';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { candidateIds } from '../utils/qr';
import { routeParam } from '../utils/text';
import { isLate, todayISO } from '../utils/time';
import { attendanceQuery, objectIdSchema, scanBody } from '../validation/schemas';

function isDuplicate(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: number }).code === 11000;
}

export const scanAttendance = asyncHandler(async (req, res) => {
  const body = scanBody.parse(req.body);
  const keys = candidateIds(body.qrData);
  const student = await Student.findOne({
    $or: [{ qrCodeData: { $in: keys } }, { studentId: { $in: keys } }],
  });
  if (!student) throw new HttpError(404, 'No student matches this card.');

  const date = todayISO();
  const month = date.slice(0, 7);
  let attendance = await Attendance.findOne({ studentId: student.studentId, date });
  let alreadyMarked = Boolean(attendance);

  if (!attendance) {
    try {
      attendance = await Attendance.create({
        studentId: student.studentId,
        date,
        timestamp: new Date(),
        status: isLate() ? 'Late' : 'Present',
      });
    } catch (err) {
      if (!isDuplicate(err)) throw err;
      attendance = await Attendance.findOne({ studentId: student.studentId, date });
      alreadyMarked = true;
    }
  }

  if (!attendance) throw new HttpError(500, 'Attendance could not be saved.');

  const fee = await Fee.findOne({ studentId: student.studentId, month });
  res.json({
    success: true,
    data: {
      student,
      attendance,
      alreadyMarked,
      fee: {
        month,
        amount: fee?.amount ?? env.defaultMonthlyFee,
        status: fee?.status ?? 'Pending',
        paidDate: fee?.paidDate ?? null,
        recorded: Boolean(fee),
      },
    },
  });
});

export const listAttendance = asyncHandler(async (req, res) => {
  const query = attendanceQuery.parse(req.query);
  const date = query.date ?? todayISO();
  const month = date.slice(0, 7);
  const grade = query.grade ? Number(query.grade) : undefined;

  const attendanceFilter: { date: string; studentId?: { $in: string[] } } = { date };
  if (grade) {
    const graded = await Student.find({ grade }).select('studentId');
    attendanceFilter.studentId = { $in: graded.map((student) => student.studentId) };
  }

  const records = await Attendance.find(attendanceFilter).sort({ timestamp: -1 }).limit(1000);
  const ids = records.map((record) => record.studentId);
  const [students, fees] = await Promise.all([
    Student.find({ studentId: { $in: ids } }).select('studentId name grade guardianPhone'),
    Fee.find({ studentId: { $in: ids }, month }).select('studentId status'),
  ]);
  const studentsById = new Map(students.map((student) => [student.studentId, student]));
  const feesById = new Map(fees.map((fee) => [fee.studentId, fee.status]));

  res.json({
    success: true,
    data: {
      date,
      timezone: env.timezone,
      lateAfter: env.lateAfter,
      records: records.map((attendance) => ({
        attendance,
        student: studentsById.get(attendance.studentId) ?? null,
        feeStatus: feesById.get(attendance.studentId) ?? 'Pending',
      })),
    },
  });
});

export const removeAttendance = asyncHandler(async (req, res) => {
  const id = objectIdSchema.parse(routeParam(req.params.id));
  const removed = await Attendance.findByIdAndDelete(id);
  if (!removed) throw new HttpError(404, 'Attendance record not found.');
  res.json({ success: true, data: { id } });
});
