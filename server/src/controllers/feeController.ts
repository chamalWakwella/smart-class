import { env } from '../config/env';
import { Attendance } from '../models/Attendance';
import { Fee } from '../models/Fee';
import { Student } from '../models/Student';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { asGrade, routeParam } from '../utils/text';
import { currentMonth } from '../utils/time';
import { feeBody, feeDashboardQuery, feeGenerate, feeListQuery, feeUpdate, objectIdSchema } from '../validation/schemas';

export const listFees = asyncHandler(async (req, res) => {
  const query = feeListQuery.parse(req.query);
  const filter: { studentId?: string; month?: string; status?: 'Paid' | 'Pending' } = {};
  if (query.studentId) filter.studentId = query.studentId;
  if (query.month) filter.month = query.month;
  if (query.status) filter.status = query.status;
  const fees = await Fee.find(filter).sort({ month: -1, studentId: 1 }).limit(1000);
  res.json({ success: true, data: fees });
});

export const createFee = asyncHandler(async (req, res) => {
  const body = feeBody.parse(req.body);
  const student = await Student.findOne({ studentId: body.studentId });
  if (!student) throw new HttpError(404, 'Student not found.');

  const existing = await Fee.findOne({ studentId: body.studentId, month: body.month });
  if (existing) {
    throw new HttpError(409, 'This student already has a fee for that month. Update it instead.');
  }

  const fee = await Fee.create({
    studentId: body.studentId,
    month: body.month,
    amount: body.amount,
    status: body.status,
    paidDate: body.status === 'Paid' ? new Date() : null,
  });
  res.status(201).json({ success: true, data: fee });
});

export const updateFee = asyncHandler(async (req, res) => {
  const id = objectIdSchema.parse(routeParam(req.params.id));
  const body = feeUpdate.parse(req.body);
  const fee = await Fee.findById(id);
  if (!fee) throw new HttpError(404, 'Fee record not found.');

  if (body.amount !== undefined) fee.amount = body.amount;
  if (body.status === 'Paid') {
    if (fee.status !== 'Paid') fee.paidDate = new Date();
    fee.status = 'Paid';
  } else if (body.status === 'Pending') {
    fee.status = 'Pending';
    fee.paidDate = null;
  }

  await fee.save();
  res.json({ success: true, data: fee });
});

export const deleteFee = asyncHandler(async (req, res) => {
  const id = objectIdSchema.parse(routeParam(req.params.id));
  const removed = await Fee.findByIdAndDelete(id);
  if (!removed) throw new HttpError(404, 'Fee record not found.');
  res.json({ success: true, data: { id } });
});

export const generateFees = asyncHandler(async (req, res) => {
  const body = feeGenerate.parse(req.body);
  const filter: { grade?: 9 | 10 | 11 } = {};
  if (body.grade !== undefined) filter.grade = asGrade(body.grade);
  const students = await Student.find(filter).select('studentId');
  if (students.length === 0) {
    res.json({ success: true, data: { created: 0 } });
    return;
  }

  const result = await Fee.bulkWrite(
    students.map((student) => ({
      updateOne: {
        filter: { studentId: student.studentId, month: body.month },
        update: {
          $setOnInsert: {
            studentId: student.studentId,
            month: body.month,
            amount: body.amount,
            status: 'Pending',
            paidDate: null,
          },
        },
        upsert: true,
      },
    })),
  );

  res.json({ success: true, data: { created: result.upsertedCount } });
});

export const feeDashboard = asyncHandler(async (req, res) => {
  const query = feeDashboardQuery.parse(req.query);
  const month = query.month ?? currentMonth();
  const studentFilter: { grade?: number } = {};
  if (query.grade) studentFilter.grade = Number(query.grade);

  const students = await Student.find(studentFilter).sort({ grade: 1, name: 1 }).limit(1000);
  const ids = students.map((student) => student.studentId);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  const [fees, attendance, classDates] = await Promise.all([
    Fee.find({ studentId: { $in: ids }, month }),
    Attendance.aggregate<{ _id: string; present: number; late: number }>([
      { $match: { studentId: { $in: ids }, date: { $gte: monthStart, $lte: monthEnd } } },
      {
        $group: {
          _id: '$studentId',
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        },
      },
    ]),
    Attendance.distinct('date', {
      studentId: { $in: ids },
      date: { $gte: monthStart, $lte: monthEnd },
    }),
  ]);

  const feesByStudent = new Map(fees.map((fee) => [fee.studentId, fee]));
  const attendanceByStudent = new Map(attendance.map((row) => [row._id, row]));
  const needle = query.q?.toLowerCase();

  const rows = students
    .map((student) => {
      const fee = feesByStudent.get(student.studentId);
      const counts = attendanceByStudent.get(student.studentId);
      const present = counts?.present ?? 0;
      const late = counts?.late ?? 0;
      return {
        student: {
          studentId: student.studentId,
          name: student.name,
          grade: student.grade,
          guardianPhone: student.guardianPhone,
        },
        fee: {
          _id: fee?._id ?? null,
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
        },
      };
    })
    .filter((row) => {
      if (query.status && row.fee.status !== query.status) return false;
      if (!needle) return true;
      return (
        row.student.name.toLowerCase().includes(needle) ||
        row.student.studentId.toLowerCase().includes(needle)
      );
    });

  const totals = rows.reduce(
    (sum, row) => {
      if (row.fee.status === 'Paid') {
        sum.paidCount += 1;
        sum.collected += row.fee.amount;
      } else {
        sum.pendingCount += 1;
        sum.outstanding += row.fee.amount;
      }
      return sum;
    },
    { paidCount: 0, pendingCount: 0, collected: 0, outstanding: 0 },
  );

  res.json({
    success: true,
    data: {
      month,
      classDays: classDates.length,
      currency: env.currency,
      totals,
      rows,
    },
  });
});
