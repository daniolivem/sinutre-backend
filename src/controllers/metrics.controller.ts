import { Request, Response } from 'express';
import { prisma } from '../prisma';

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function calories(meal: { foods: { calories: number }[] }) {
  return meal.foods.reduce((total, item) => total + item.calories, 0);
}

function bmiClassification(bmi: number) {
  if (bmi < 18.5) return 'ABAIXO_DO_PESO';
  if (bmi < 25) return 'PESO_ADEQUADO';
  if (bmi < 30) return 'SOBREPESO';
  if (bmi < 35) return 'OBESIDADE_GRAU_I';
  if (bmi < 40) return 'OBESIDADE_GRAU_II';
  return 'OBESIDADE_GRAU_III';
}

export async function dashboard(req: Request, res: Response) {
  const today = startOfDay(new Date());
  const [healthData, meals] = await Promise.all([
    prisma.healthData.findFirst({
      where: { userId: req.userId!, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { targetDietDaily: true },
    }),
    prisma.meal.findMany({
      where: { userId: req.userId!, eatTime: { gte: today } },
      include: { foods: { select: { calories: true } } },
    }),
  ]);
  const consumedCalories = calories({ foods: meals.flatMap((meal) => meal.foods) });
  const calorieTarget = healthData?.targetDietDaily ?? null;

  return res.json({
    date: today.toISOString().slice(0, 10),
    calorieTarget,
    consumedCalories: Number(consumedCalories.toFixed(2)),
    remainingCalories: calorieTarget === null ? null : Number((calorieTarget - consumedCalories).toFixed(2)),
    goalExceeded: calorieTarget !== null && consumedCalories > calorieTarget,
  });
}

export async function metrics(req: Request, res: Response) {
  const now = new Date();
  const sevenDaysAgo = startOfDay(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const [healthData, weightLog, meals] = await Promise.all([
    prisma.healthData.findFirst({
      where: { userId: req.userId!, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { targetDietDaily: true },
    }),
    prisma.weightLog.findFirst({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      select: { height: true, weight: true, createdAt: true },
    }),
    prisma.meal.findMany({
      where: { userId: req.userId!, eatTime: { gte: sevenDaysAgo, lte: now } },
      include: { foods: { select: { calories: true } } },
    }),
  ]);

  const totalsByDay = new Map<string, number>();
  for (let day = new Date(sevenDaysAgo); day <= now; day.setDate(day.getDate() + 1)) {
    totalsByDay.set(day.toISOString().slice(0, 10), 0);
  }
  for (const meal of meals) {
    const key = meal.eatTime.toISOString().slice(0, 10);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + calories(meal));
  }
  const averageCalories = [...totalsByDay.values()].reduce((sum, value) => sum + value, 0) / 7;
  const bmi = weightLog ? weightLog.weight / (weightLog.height ** 2) : null;
  const calorieTarget = healthData?.targetDietDaily ?? null;

  return res.json({
    bmi: bmi === null ? null : Number(bmi.toFixed(2)),
    bmiClassification: bmi === null ? null : bmiClassification(bmi),
    weight: weightLog?.weight ?? null,
    height: weightLog?.height ?? null,
    averageCalories: Number(averageCalories.toFixed(2)),
    calorieTarget,
    averageComparedToTarget: calorieTarget === null ? null : Number((averageCalories - calorieTarget).toFixed(2)),
    period: { from: sevenDaysAgo.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
  });
}
