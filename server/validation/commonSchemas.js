import { z } from 'zod';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'invalid id');

export const messageSchema = z.object({
    toId: objectId,
    body: z.string().min(1).max(5000),
    attachmentId: objectId.optional(),
});

export const announcementSchema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1),
    audience: z.enum(['all', 'teachers', 'parents', 'students']).optional(),
    pinned: z.boolean().optional(),
});

export { z };
