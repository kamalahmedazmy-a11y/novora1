// Shared request/utility helpers extracted from routes to remove duplication.
// These are byte-for-byte identical to the inline copies they replace, so
// behaviour is unchanged.

// Resolve the tenant (school) for a request: the authenticated user's school,
// falling back to an explicit ?schoolId / body.schoolId (used by super admins).
export const schoolOf = (req) => req.user.schoolId || req.query.schoolId || req.body.schoolId;

// Normalize a date to midnight UTC (used for day-keyed records).
export const midnight = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; };
