import mongoose from 'mongoose';
import { connectDb } from './config/db';
import { env } from './config/env';
import { Attendance } from './models/Attendance';
import { Counter } from './models/Counter';
import { Fee } from './models/Fee';
import { Mark } from './models/Mark';
import { Student } from './models/Student';
import { nextStudentId } from './utils/ids';
import { buildQrPayload } from './utils/qr';
import { currentMonth, shiftDays, todayISO } from './utils/time';

const people: Array<{ name: string; grade: 9 | 10 | 11; guardianPhone: string }> = [
  { name: 'Amaya Perera', grade: 9, guardianPhone: '0771000101' },
  { name: 'Nethmi Fernando', grade: 9, guardianPhone: '0771000102' },
  { name: 'Kavindu Silva', grade: 10, guardianPhone: '0771000103' },
  { name: 'Ishara Jayawardena', grade: 10, guardianPhone: '0771000104' },
  { name: 'Sahan Rathnayake', grade: 11, guardianPhone: '0771000111' },
  { name: 'Dilini Wickramasinghe', grade: 11, guardianPhone: '0771000112' },
];

async function seed(): Promise<void> {
  const reset = process.argv.includes('--reset');
  const existing = await Student.countDocuments();
  if (existing > 0 && !reset) {
    console.log('Students already exist. Run npm run seed:reset to replace the demo class.');
    return;
  }

  if (reset) {
    await Promise.all([
      Student.deleteMany({}),
      Attendance.deleteMany({}),
      Fee.deleteMany({}),
      Mark.deleteMany({}),
      Counter.deleteMany({}),
    ]);
  }

  const created = [];
  for (const person of people) {
    const studentId = await nextStudentId(person.grade);
    created.push(
      await Student.create({
        studentId,
        name: person.name,
        grade: person.grade,
        guardianPhone: person.guardianPhone,
        qrCodeData: buildQrPayload(studentId),
      }),
    );
  }

  const today = todayISO();
  const month = currentMonth();
  const feePlan: Array<'Paid' | 'Pending'> = ['Paid', 'Paid', 'Paid', 'Pending', 'Pending'];

  for (const [index, status] of feePlan.entries()) {
    const student = created[index];
    if (!student) continue;
    await Fee.create({
      studentId: student.studentId,
      month,
      amount: env.defaultMonthlyFee,
      status,
      paidDate: status === 'Paid' ? new Date() : null,
    });
  }

  for (const [index, student] of created.entries()) {
    for (const daysAgo of [1, 2, 3]) {
      const date = shiftDays(today, -daysAgo);
      const late = index === 4 && daysAgo === 3;
      await Attendance.create({
        studentId: student.studentId,
        date,
        timestamp: new Date(`${date}T${late ? '16:40' : '15:50'}:00+05:30`),
        status: late ? 'Late' : 'Present',
      });
    }
  }

  const termScores = [78, 64, 91, 55, 83, 72];
  const quizScores = [16, 12, 18, 9, 15, 14];
  for (const [index, student] of created.entries()) {
    await Mark.create({
      studentId: student.studentId,
      examTitle: 'Term Test',
      score: termScores[index] ?? 0,
      totalMarks: 100,
      date: shiftDays(today, -10),
    });
    await Mark.create({
      studentId: student.studentId,
      examTitle: 'Algebra Quiz',
      score: quizScores[index] ?? 0,
      totalMarks: 20,
      date: shiftDays(today, -3),
    });
  }

  console.log('Demo class loaded.');
  for (const student of created) {
    console.log(`${student.studentId}  ${student.name}`);
  }
  console.log('Dilini has no fee record yet, so a scan shows Fee pending.');
}

async function main(): Promise<void> {
  await connectDb();
  try {
    await seed();
  } finally {
    await mongoose.disconnect();
  }
}

main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
