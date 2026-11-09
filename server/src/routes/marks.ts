import { Router } from 'express';
import * as marks from '../controllers/markController';

const router = Router();

router.get('/summary', marks.markSummary);
router.get('/exams', marks.listExamTitles);
router.get('/', marks.listMarks);
router.post('/', marks.createMark);
router.put('/:id', marks.updateMark);
router.delete('/:id', marks.deleteMark);

export default router;
