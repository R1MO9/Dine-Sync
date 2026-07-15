/**
 * Standardized API response format used across the gateway.
 *
 * Success: { success: true,  data: {...},   message: '...' }
 * Error:   { success: false, code: 'XXXX',  message: '...' }
 */

const sendSuccess = (res, statusCode = 200, data = null, message = "OK") => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const sendError = (
    res,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    message = "Something went wrong"
) => {
    return res.status(statusCode).json({
        success: false,
        code,
        message,
    });
};

export { sendSuccess, sendError };
