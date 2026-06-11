import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';

export const foodRouter = Router();


foodRouter.get('/', requireAuth, async (req, res) => {
  const foods = await prisma.food.findMany({
    where: {
      userId: req.userId,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return res.json(foods);
});


foodRouter.post('/', requireAuth, async (req, res) => {
  const {
    name,
    caloriesPer100g,
    carbsPer100g,
    proteinPer100g,
    fatPer100g,
  } = req.body;

  const food = await prisma.food.create({
    data: {
      name,
      caloriesPer100g,
      carbsPer100g,
      proteinPer100g,
      fatPer100g,
      userId: req.userId,
    },
  });

  return res.status(201).json(food);
});

