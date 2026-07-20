import { Response } from 'express';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function badRequest(res: Response, error: string) {
  return res.status(400).json({ error });
}

export function validateFood(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'O corpo da requisição deve conter os dados do alimento.';
  }

  const data = body as Record<string, unknown>;
  const fields = [
    'caloriesPer100g',
    'carbsPer100g',
    'proteinPer100g',
    'fatPer100g',
  ] as const;

  if (typeof data.name !== 'string' || !data.name.trim()) {
    return 'O nome do alimento é obrigatório.';
  }

  if (data.name.trim().length > 120) {
    return 'O nome do alimento deve ter no máximo 120 caracteres.';
  }

  for (const field of fields) {
    if (!isFiniteNumber(data[field]) || data[field] < 0) {
      return `O campo ${field} deve ser um número maior ou igual a zero.`;
    }
  }

  return null;
}
