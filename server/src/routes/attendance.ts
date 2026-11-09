import { Router } from 'express';
import * as attendance from '../controllers/attendanceController';

const router = Router();

router.post('/scan', attendance.scanAttendance);
router.get('/', attendance.listAttendance);
router.delete('/:id', attendance.removeAttendance);

export default router;
