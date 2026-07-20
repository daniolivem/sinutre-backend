import { Router } from 'express';
import { createMeal, deleteMeal, meals, updateMeal } from '../controllers/meals.controller';
import { requireAuth } from '../middlewares/auth.middleware';

export const mealsRoutes = Router();

mealsRoutes.post('/', requireAuth, createMeal);
mealsRoutes.get('/', requireAuth, meals);
mealsRoutes.patch('/:id', requireAuth, updateMeal);
mealsRoutes.delete('/:id', requireAuth, deleteMeal);
