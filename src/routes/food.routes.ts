import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';

export const foodRouter = Router();


foodRouter.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search ?? '');

  const foods = await prisma.food.findMany({
    where: {
      userId: req.userId,

      name: {
        contains: search,
      },
    },

    take: 10,

    orderBy: {
      name: 'asc',
    },
  });

  res.json(foods);
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

