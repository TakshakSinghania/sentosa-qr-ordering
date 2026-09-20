import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

export async function enforceRestaurantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user || !req.user.restaurantId) {
    res.status(401).json({ error: 'Restaurant context missing from authentication' });
    return;
  }

  // Ensure restaurant exists and is valid
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.user.restaurantId },
  });

  if (!restaurant) {
    res.status(404).json({ error: 'Associated restaurant not found' });
    return;
  }

  next();
}
