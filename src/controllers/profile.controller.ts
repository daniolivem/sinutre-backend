import { Request, Response } from 'express';
import { LEVEL_CHOICES } from '../constants/enums';
import { prisma } from '../prisma';
import { badRequest, isFiniteNumber } from '../utils/validation';

function serializeProfile(
  healthData: { targetDietDaily: number; levelActivity: string } | null,
  weightLog: { height: number; weight: number; createdAt: Date } | null,
) {
  return {
    calorieTarget: healthData?.targetDietDaily ?? null,
    activityLevel: healthData?.levelActivity ?? null,
    height: weightLog?.height ?? null,
    weight: weightLog?.weight ?? null,
    updatedAt: weightLog?.createdAt ?? null,
  };
}

export async function getProfile(req: Request, res: Response) {
  const [healthData, weightLog] = await Promise.all([
    prisma.healthData.findFirst({
      where: { userId: req.userId!, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { targetDietDaily: true, levelActivity: true },
    }),
    prisma.weightLog.findFirst({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      select: { height: true, weight: true, createdAt: true },
    }),
  ]);

  return res.json(serializeProfile(healthData, weightLog));
}

export async function saveProfile(req: Request, res: Response) {
  const { calorieTarget, activityLevel, height, weight } = req.body ?? {};

  if (!Number.isInteger(calorieTarget) || calorieTarget < 500 || calorieTarget > 15000) {
    return badRequest(res, 'A meta calórica deve ser um número inteiro entre 500 e 15000.');
  }
  if (typeof activityLevel !== 'string' || !LEVEL_CHOICES.includes(activityLevel as (typeof LEVEL_CHOICES)[number])) {
    return badRequest(res, 'O nível de atividade é inválido.');
  }
  if (!isFiniteNumber(height) || height < 0.5 || height > 2.8) {
    return badRequest(res, 'A altura deve estar em metros, entre 0,5 e 2,8.');
  }
  if (!isFiniteNumber(weight) || weight < 15 || weight > 500) {
    return badRequest(res, 'O peso deve estar em quilogramas, entre 15 e 500.');
  }

  const userId = req.userId!;
  const [healthData, weightLog] = await prisma.$transaction(async (tx) => {
    await tx.healthData.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, closedAt: new Date() },
    });
    const newHealthData = await tx.healthData.create({
      data: { userId, targetDietDaily: calorieTarget, levelActivity: activityLevel },
      select: { targetDietDaily: true, levelActivity: true },
    });
    const newWeightLog = await tx.weightLog.create({
      data: { userId, height, weight },
      select: { height: true, weight: true, createdAt: true },
    });
    return [newHealthData, newWeightLog];
  });

  return res.json(serializeProfile(healthData, weightLog));
}
