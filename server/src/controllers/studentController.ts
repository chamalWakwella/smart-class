import { Attendance } from '../models/Attendance';
import { Fee } from '../models/Fee';
import { Mark } from '../models/Mark';
import { Student } from '../models/Student';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { nextStudentId } from '../utils/ids';
import { buildQrPayload, qrDataUrl } from '../utils/qr';
import { asGrade, escapeRegex, routeParam } from '../utils/text';
import { parseStudentId, studentBody, studentListQuery, studentUpdate } from '../validation/schemas';

export const listStudents = asyncHandler(async (req, res) => {
  const query = studentListQuery.parse(req.query);
  const filter: {
    grade?: number;
    $or?: Array<Record<string, unknown>>;
  } = {};

  if (query.grade) filter.grade = Number(query.grade);
  if (query.q) {
    const pattern = escapeRegex(query.q);
    filter.$or = [
      { name: { $regex: pattern, $options: 'i' } },
      { studentId: { $regex: pattern, $options: 'i' } },
      { guardianPhone: { $regex: pattern, $options: 'i' } },
    ];
  }

  const students = await Student.find(filter).sort({ grade: 1, name: 1 }).limit(1000);
  res.json({ success: true, data: students });
});

export const getStudent = asyncHandler(async (req, res) => {
  const studentId = parseStudentId(routeParam(req.params.studentId));
  const student = await Student.findOne({ studentId });
  if (!student) throw new HttpError(404, 'Student not found.');
  res.json({ success: true, data: student });
});

export const createStudent = asyncHandler(async (req, res) => {
  const body = studentBody.parse(req.body);
  const grade = asGrade(body.grade);
  const studentId = await nextStudentId(grade);
  const student = await Student.create({
    studentId,
    name: body.name,
    grade,
    guardianPhone: body.guardianPhone,
    qrCodeData: buildQrPayload(studentId),
  });
  res.status(201).json({ success: true, data: student });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const studentId = parseStudentId(routeParam(req.params.studentId));
  const parsed = studentUpdate.parse(req.body);
  const body: { name?: string; grade?: number; guardianPhone?: string } = {};
  if (parsed.name !== undefined) body.name = parsed.name;
  if (parsed.grade !== undefined) body.grade = parsed.grade;
  if (parsed.guardianPhone !== undefined) body.guardianPhone = parsed.guardianPhone;
  if (Object.keys(body).length === 0) throw new HttpError(400, 'Nothing to update.');

  const student = await Student.findOneAndUpdate({ studentId }, body, { new: true, runValidators: true });
  if (!student) throw new HttpError(404, 'Student not found.');
  res.json({ success: true, data: student });
});

export const deleteStudent = asyncHandler(async (req, res) => {
  const studentId = parseStudentId(routeParam(req.params.studentId));
  const existing = await Student.findOne({ studentId });
  if (!existing) throw new HttpError(404, 'Student not found.');

  await Promise.all([
    Attendance.deleteMany({ studentId }),
    Fee.deleteMany({ studentId }),
    Mark.deleteMany({ studentId }),
    Student.deleteOne({ studentId }),
  ]);

  res.json({ success: true, data: { studentId } });
});

export const getStudentQr = asyncHandler(async (req, res) => {
  const studentId = parseStudentId(routeParam(req.params.studentId));
  const student = await Student.findOne({ studentId });
  if (!student) throw new HttpError(404, 'Student not found.');
  const image = await qrDataUrl(student.qrCodeData);
  res.json({
    success: true,
    data: {
      studentId: student.studentId,
      name: student.name,
      grade: student.grade,
      qrCodeData: student.qrCodeData,
      image,
    },
  });
});
