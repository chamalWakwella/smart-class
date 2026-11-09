import { Mark } from '../models/Mark';
import { Student } from '../models/Student';
import { asyncHandler } from '../utils/asyncHandler';
import { HttpError } from '../utils/httpError';
import { routeParam } from '../utils/text';
import { markBody, markListQuery, markUpdate, objectIdSchema } from '../validation/schemas';

type MarkQuery = {
  studentId?: string;
  examTitle?: string;
  grade?: '9' | '10' | '11';
};

async function loadMarkRows(query: MarkQuery) {
  const studentFilter: { grade?: number; studentId?: string } = {};
  if (query.grade) studentFilter.grade = Number(query.grade);
  if (query.studentId) studentFilter.studentId = query.studentId;

  const markFilter: { studentId?: string | { $in: string[] }; examTitle?: string } = {};
  if (query.grade || query.studentId) {
    const matched = await Student.find(studentFilter).select('studentId');
    markFilter.studentId = { $in: matched.map((student) => student.studentId) };
  }
  if (query.examTitle) markFilter.examTitle = query.examTitle;

  const marks = await Mark.find(markFilter).sort({ date: -1, examTitle: 1 }).limit(1000);
  const students = await Student.find({ studentId: { $in: marks.map((mark) => mark.studentId) } }).select(
    'studentId name grade',
  );
  const studentsById = new Map(students.map((student) => [student.studentId, student]));

  return marks.map((mark) => {
    const student = studentsById.get(mark.studentId);
    const percentage = mark.totalMarks === 0 ? 0 : Math.round((mark.score / mark.totalMarks) * 1000) / 10;
    return {
      _id: mark._id,
      studentId: mark.studentId,
      studentName: student?.name ?? 'Unknown student',
      grade: student?.grade ?? null,
      examTitle: mark.examTitle,
      score: mark.score,
      totalMarks: mark.totalMarks,
      date: mark.date,
      percentage,
    };
  });
}

export const listMarks = asyncHandler(async (req, res) => {
  const query = markListQuery.parse(req.query);
  const rows = await loadMarkRows(query);
  res.json({ success: true, data: rows });
});

export const listExamTitles = asyncHandler(async (_req, res) => {
  const titles = await Mark.distinct('examTitle');
  titles.sort((left, right) => left.localeCompare(right));
  res.json({ success: true, data: titles });
});

export const markSummary = asyncHandler(async (req, res) => {
  const query = markListQuery.parse(req.query);
  if (!query.examTitle) throw new HttpError(400, 'Choose an exam to see the summary.');

  const loaded = await loadMarkRows(query);
  const rows = loaded.map((row) => ({
    studentId: row.studentId,
    name: row.studentName,
    grade: row.grade,
    score: row.score,
    totalMarks: row.totalMarks,
    percentage: row.percentage,
    date: row.date,
  }));

  if (rows.length === 0) {
    res.json({
      success: true,
      data: {
        examTitle: query.examTitle,
        count: 0,
        averagePercentage: 0,
        highest: null,
        lowest: null,
        rows,
      },
    });
    return;
  }

  let highest = rows[0];
  let lowest = rows[0];
  let total = 0;
  for (const row of rows) {
    total += row.percentage;
    if (!highest || row.percentage > highest.percentage) highest = row;
    if (!lowest || row.percentage < lowest.percentage) lowest = row;
  }

  res.json({
    success: true,
    data: {
      examTitle: query.examTitle,
      count: rows.length,
      averagePercentage: Math.round((total / rows.length) * 10) / 10,
      highest: highest
        ? { studentId: highest.studentId, name: highest.name, percentage: highest.percentage }
        : null,
      lowest: lowest
        ? { studentId: lowest.studentId, name: lowest.name, percentage: lowest.percentage }
        : null,
      rows,
    },
  });
});

export const createMark = asyncHandler(async (req, res) => {
  const body = markBody.parse(req.body);
  const student = await Student.findOne({ studentId: body.studentId });
  if (!student) throw new HttpError(404, 'Student not found.');

  const existing = await Mark.findOne({ studentId: body.studentId, examTitle: body.examTitle });
  if (existing) throw new HttpError(409, 'Marks for this exam already exist. Edit the existing row.');

  const mark = await Mark.create(body);
  res.status(201).json({ success: true, data: mark });
});

export const updateMark = asyncHandler(async (req, res) => {
  const id = objectIdSchema.parse(routeParam(req.params.id));
  const body = markUpdate.parse(req.body);
  const mark = await Mark.findById(id);
  if (!mark) throw new HttpError(404, 'Marks not found.');

  const nextScore = body.score ?? mark.score;
  const nextTotal = body.totalMarks ?? mark.totalMarks;
  if (nextScore > nextTotal) throw new HttpError(400, 'Score cannot exceed the total.');

  if (body.examTitle && body.examTitle !== mark.examTitle) {
    const clash = await Mark.findOne({
      studentId: mark.studentId,
      examTitle: body.examTitle,
      _id: { $ne: mark._id },
    });
    if (clash) throw new HttpError(409, 'This student already has marks for that exam.');
  }

  if (body.examTitle) mark.examTitle = body.examTitle;
  if (body.score !== undefined) mark.score = body.score;
  if (body.totalMarks !== undefined) mark.totalMarks = body.totalMarks;
  if (body.date) mark.date = body.date;
  await mark.save();
  res.json({ success: true, data: mark });
});

export const deleteMark = asyncHandler(async (req, res) => {
  const id = objectIdSchema.parse(routeParam(req.params.id));
  const removed = await Mark.findByIdAndDelete(id);
  if (!removed) throw new HttpError(404, 'Marks not found.');
  res.json({ success: true, data: { id } });
});
