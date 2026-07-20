import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { me } from '../controllers/auth.me';
import { getProfile, saveProfile } from '../controllers/profile.controller';

import {
  redirectToGithub,
  githubCallback,
} from '../controllers/auth.controller';

export const authRoutes = Router();

authRoutes.get('/github', redirectToGithub);
authRoutes.get('/github/callback', githubCallback);
authRoutes.get('/me', requireAuth, me);
authRoutes.get('/profile', requireAuth, getProfile);
authRoutes.put('/profile', requireAuth, saveProfile);
