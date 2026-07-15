export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const errors = result.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
        }));

        return res.status(422).json({
            success: false,
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            errors,
        });
    }

    req.body = result.data;
    next();
};
