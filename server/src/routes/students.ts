import { Router } from 'express';
import * as students from '../controllers/studentController';

const router = Router();

router.get('/', students.listStudents);
router.post('/', students.createStudent);
router.get('/:studentId/qr', students.getStudentQr);
router.get('/:studentId', students.getStudent);
router.put('/:studentId', students.updateStudent);
router.delete('/:studentId', students.deleteStudent);

export default router;
