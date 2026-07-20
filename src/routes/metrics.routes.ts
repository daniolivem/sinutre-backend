import { Router } from 'express';
import { dashboard, metrics } from '../controllers/metrics.controller';
import { requireAuth } from '../middlewares/auth.middleware';

export const metricsRoutes = Router();

metricsRoutes.get('/dashboard', requireAuth, dashboard);
metricsRoutes.get('/', requireAuth, metrics);
