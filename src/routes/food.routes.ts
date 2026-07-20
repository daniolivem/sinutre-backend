import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { prisma } from '../prisma';
import { badRequest, validateFood } from '../utils/validation';

export const foodRouter = Router();

//foods/
foodRouter.get('/', requireAuth, async (req, res) => {
  const search = String(req.query.search ?? '');
  const foods = await prisma.food.findMany({
    where: {
      userId: req.userId!,
      name: {
        contains: search,
      }
    },
    take: 10,
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

  const error = validateFood(req.body);
  if (error) return badRequest(res, error);

  const food = await prisma.food.create({
    data: {
      name: name.trim(),
      caloriesPer100g,
      carbsPer100g,
      proteinPer100g,
      fatPer100g,
      userId: req.userId!,
    },
  });

  return res.status(201).json(food);
});

foodRouter.patch('/:id', requireAuth, async (req, res) => {
  const foodId = Number(req.params.id);
  if (!Number.isInteger(foodId) || foodId <= 0) {
    return badRequest(res, 'O identificador do alimento é inválido.');
  }

  const error = validateFood(req.body);
  if (error) return badRequest(res, error);

  const existingFood = await prisma.food.findFirst({
    where: { id: foodId, userId: req.userId! },
  });
  if (!existingFood) {
    return res.status(404).json({ error: 'Alimento não encontrado.' });
  }

  const food = await prisma.food.update({
    where: { id: foodId },
    data: {
      name: req.body.name.trim(),
      caloriesPer100g: req.body.caloriesPer100g,
      carbsPer100g: req.body.carbsPer100g,
      proteinPer100g: req.body.proteinPer100g,
      fatPer100g: req.body.fatPer100g,
    },
  });
  return res.json(food);
});

foodRouter.delete('/:id', requireAuth, async (req, res) => {
  const foodId = Number(req.params.id);
  if (!Number.isInteger(foodId) || foodId <= 0) {
    return badRequest(res, 'O identificador do alimento é inválido.');
  }

  const food = await prisma.food.findFirst({
    where: { id: foodId, userId: req.userId! },
    include: { _count: { select: { meals: true } } },
  });
  if (!food) {
    return res.status(404).json({ error: 'Alimento não encontrado.' });
  }
  if (food._count.meals > 0) {
    return res.status(409).json({
      error: 'Este alimento faz parte de refeições e não pode ser excluído.',
    });
  }

  await prisma.food.delete({ where: { id: foodId } });
  return res.status(204).send();
});
