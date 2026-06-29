import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
    subdomain: z.string().optional().nullable(),
});

export const registerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.string().optional(),
    schoolId: z.string().optional(),
    parentOf: z.array(z.string()).optional(),
});

export const registerSchoolSchema = z.object({
    schoolName: z.string().min(1),
    subdomain: z.string().min(1),
    adminName: z.string().min(1),
    adminEmail: z.string().email(),
    adminPassword: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(6),
});
