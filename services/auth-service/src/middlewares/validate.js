import { sendError } from "../utils/response.js";

/**
 * Zod request validation middleware.
 * Validates req.body against the provided schema.
 * Replaces req.body with the parsed (sanitized) output on success.
 *
 * Usage: validate(registerSchema)
 */
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

    // Replace body with sanitized + typed output
    req.body = result.data;
    next();
};
