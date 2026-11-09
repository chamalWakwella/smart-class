import { Router } from 'express';
import { login, session, studentLogin } from '../controllers/authController';
import { getConfig, health } from '../controllers/metaController';
import { myRecord } from '../controllers/portalController';
import { requireAdmin, requireStudent } from '../middleware/auth';
import attendance from './attendance';
import fees from './fees';
import marks from './marks';
import students from './students';

const router = Router();

router.get('/health', health);
router.get('/config', getConfig);
router.post('/session/login', login);
router.post('/session/student', studentLogin);
router.get('/me', requireStudent, myRecord);

router.use(requireAdmin);
router.get('/session', session);
router.use('/students', students);
router.use('/attendance', attendance);
router.use('/fees', fees);
router.use('/marks', marks);

router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'That API path does not exist.' });
});

export default router;
