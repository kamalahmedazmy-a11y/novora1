export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: result.error.flatten().fieldErrors,
        });
    }
    req.body = result.data;
    next();
};

export const validateQuery = (schema) => (req, res, next) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
        return res.status(400).json({
            message: 'Validation failed',
            errors: r.error.flatten().fieldErrors,
        });
    }
    next();
};
