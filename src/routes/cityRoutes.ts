import express from 'express';
import { searchCities, getCityById } from '../controllers/cityController';

const router = express.Router();

router.get('/search', searchCities);
router.get('/:id', getCityById);

export default router;
