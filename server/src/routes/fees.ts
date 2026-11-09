import { Router } from 'express';
import * as fees from '../controllers/feeController';

const router = Router();

router.get('/dashboard', fees.feeDashboard);
router.post('/generate', fees.generateFees);
router.get('/', fees.listFees);
router.post('/', fees.createFee);
router.put('/:id', fees.updateFee);
router.delete('/:id', fees.deleteFee);

export default router;
