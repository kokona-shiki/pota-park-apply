import { z } from 'zod';
import { createApiResponseSchema } from './common';
import { UserSchema } from './user';

export const CallsignChangeRequestSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  current_callsign: z.string(),
  requested_callsign: z.string(),
  reason: z.string(),
  status: z.union([z.literal('pending'), z.literal('approved'), z.literal('rejected')]),
  reviewer_id: z.number().nullable().optional(),
  review_notes: z.string().nullable().optional(),
  reviewed_at: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  applicant_email: z.string().nullable().optional(),
  applicant_callsign: z.string().nullable().optional(),
  reviewer_email: z.string().nullable().optional(),
  reviewer_callsign: z.string().nullable().optional(),
});

export type CallsignChangeRequest = z.infer<typeof CallsignChangeRequestSchema>;

export const CallsignChangeRequestsDataSchema = z.object({
  requests: z.array(CallsignChangeRequestSchema).optional(),
});

export const CallsignChangeRequestDataSchema = z.object({
  request: CallsignChangeRequestSchema.optional(),
});

export const CallsignReviewDataSchema = z.object({
  request: CallsignChangeRequestSchema.optional(),
  updatedUser: UserSchema.nullable().optional(),
});

export const CallsignChangeRequestsResponseSchema = createApiResponseSchema(
  CallsignChangeRequestsDataSchema
);
export const CallsignChangeRequestResponseSchema = createApiResponseSchema(
  CallsignChangeRequestDataSchema
);
export const CallsignReviewResponseSchema = createApiResponseSchema(CallsignReviewDataSchema);

export const CallsignChangeRequestCreateSchema = z.object({
  newCallsign: z.string().min(1),
  reason: z.string().min(1),
});

export const CallsignChangeReviewSchema = z.object({
  status: z.union([z.literal('approved'), z.literal('rejected')]),
  reviewNotes: z.string().optional(),
});
