import { Request, Response } from 'express';
import { MEAL_CHOICES } from '../constants/enums';
import { prisma } from '../prisma';
import { badRequest, isFiniteNumber } from '../utils/validation';

type MealItemInput = { foodId: number; grams: number };

function validateMeal(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'O corpo da requisição deve conter os dados da refeição.';
  }
  const data = body as Record<string, unknown>;

  if (typeof data.type !== 'string' || !MEAL_CHOICES.includes(data.type as (typeof MEAL_CHOICES)[number])) {
    return 'O tipo da refeição é inválido.';
  }
  if (typeof data.eatTime !== 'string' || Number.isNaN(new Date(data.eatTime).getTime())) {
    return 'A data e hora da refeição são inválidas.';
  }
  if (data.description !== undefined && (typeof data.description !== 'string' || data.description.length > 300)) {
    return 'A descrição deve ter no máximo 300 caracteres.';
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return 'Inclua pelo menos um alimento na refeição.';
  }

  const foodIds = new Set<number>();
  for (const item of data.items) {
    if (!item || typeof item !== 'object') return 'Os itens da refeição são inválidos.';
    const { foodId, grams } = item as Record<string, unknown>;
    if (typeof foodId !== 'number' || !Number.isInteger(foodId) || foodId <= 0) {
      return 'O identificador de cada alimento deve ser válido.';
    }
    if (!isFiniteNumber(grams) || grams <= 0 || grams > 10000) {
      return 'A quantidade de cada alimento deve estar entre 0 e 10000 gramas.';
    }
    if (foodIds.has(foodId)) return 'Não repita um alimento na mesma refeição.';
    foodIds.add(foodId);
  }
  return null;
}

async function mealItemsData(userId: number, items: MealItemInput[]) {
  const foods = await prisma.food.findMany({
    where: { id: { in: items.map((item) => item.foodId) }, userId },
  });
  if (foods.length !== items.length) throw new Error('Alimento não encontrado.');

  return items.map((item) => {
    const food = foods.find((candidate) => candidate.id === item.foodId)!;
    return {
      foodId: food.id,
      foodG: item.grams,
      calories: (food.caloriesPer100g * item.grams) / 100,
      carbs: (food.carbsPer100g * item.grams) / 100,
      protein: (food.proteinPer100g * item.grams) / 100,
      fat: (food.fatPer100g * item.grams) / 100,
    };
  });
}

export async function meals(
  req: Request,
  res: Response,
) {
  const meals = await prisma.meal.findMany({
    where: {
      userId: req.userId,
    },

    include: {
      foods: {
        include: {
          food: true,
        },
      },
    },

    orderBy: {
      createdAt: 'desc',
    },
  });

  const result = meals.map((meal) => {
    const totals = meal.foods.reduce(
      (acc, item) => {
        acc.grams += item.foodG;
        acc.calories += item.calories;
        acc.carbs += item.carbs;
        acc.proteins += item.protein;
        acc.fats += item.fat;

        return acc;
      },
      {
        grams: 0,
        calories: 0,
        carbs: 0,
        proteins: 0,
        fats: 0,
      },
    );

    return {
      id: meal.id,
      name: meal.description,
      type: meal.type,
      createdAt: meal.createdAt,
      eatTime: meal.eatTime,

      totals,

      items: meal.foods,
    };
  });

  return res.json(result);
}

export async function createMeal(
  req: Request,
  res: Response,
) {
  const userId = req.userId!;

  const {
    type,
    eatTime,
    description,
    items,
  } = req.body;

  const validationError = validateMeal(req.body);
  if (validationError) return badRequest(res, validationError);

  try {
    const meal = await prisma.$transaction(
    async (tx) => {
      // Busca os alimentos envolvidos
      const foods = await tx.food.findMany({
        where: {
          id: {
            in: items.map(
              (i: { foodId: number }) =>
                i.foodId,
            ),
          },

          userId,
        },
      });

      if (foods.length !== items.length) throw new Error('Alimento não encontrado.');

      // Cria a refeição
      const meal = await tx.meal.create({
        data: {
          type,
          eatTime: new Date(eatTime),
          description,
          userId,
        },
      });

      // Cria MealFood
      await tx.mealFood.createMany({
        data: items.map(
          (
            item: {
              foodId: number;
              grams: number;
            },
          ) => {
            const food = foods.find(
              (f) => f.id === item.foodId,
            )!;

            return {
              mealId: meal.id,

              foodId: food.id,

              foodG: item.grams,

              calories:
                (food.caloriesPer100g *
                  item.grams) /
                100,

              carbs:
                (food.carbsPer100g *
                  item.grams) /
                100,

              protein:
                (food.proteinPer100g *
                  item.grams) /
                100,

              fat:
                (food.fatPer100g *
                  item.grams) /
                100,
            };
          },
        ),
      });

      return meal;
    },
  );

    return res.status(201).json(meal);
  } catch (error) {
    if (error instanceof Error && error.message === 'Alimento não encontrado.') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}

export async function updateMeal(req: Request, res: Response) {
  const mealId = Number(req.params.id);
  if (!Number.isInteger(mealId) || mealId <= 0) return badRequest(res, 'O identificador da refeição é inválido.');
  const validationError = validateMeal(req.body);
  if (validationError) return badRequest(res, validationError);

  const { type, eatTime, description, items } = req.body as {
    type: string; eatTime: string; description?: string; items: MealItemInput[];
  };
  const existingMeal = await prisma.meal.findFirst({ where: { id: mealId, userId: req.userId! } });
  if (!existingMeal) return res.status(404).json({ error: 'Refeição não encontrada.' });

  try {
    const data = await mealItemsData(req.userId!, items);
    const meal = await prisma.$transaction(async (tx) => {
      await tx.mealFood.deleteMany({ where: { mealId } });
      return tx.meal.update({
        where: { id: mealId },
        data: {
          type,
          eatTime: new Date(eatTime),
          description,
          foods: { createMany: { data } },
        },
        include: { foods: { include: { food: true } } },
      });
    });
    return res.json(meal);
  } catch (error) {
    if (error instanceof Error && error.message === 'Alimento não encontrado.') {
      return res.status(404).json({ error: error.message });
    }
    throw error;
  }
}

export async function deleteMeal(req: Request, res: Response) {
  const mealId = Number(req.params.id);
  if (!Number.isInteger(mealId) || mealId <= 0) return badRequest(res, 'O identificador da refeição é inválido.');
  const existingMeal = await prisma.meal.findFirst({ where: { id: mealId, userId: req.userId! } });
  if (!existingMeal) return res.status(404).json({ error: 'Refeição não encontrada.' });

  await prisma.$transaction([
    prisma.mealFood.deleteMany({ where: { mealId } }),
    prisma.meal.delete({ where: { id: mealId } }),
  ]);
  return res.status(204).send();
}
