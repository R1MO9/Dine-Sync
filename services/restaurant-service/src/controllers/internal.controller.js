import { getTableInternal } from "../services/restaurant.service.js";
import { sendSuccess } from "../utils/response.js";

// ── GET /internal/tables/:id ──────────────────────────────────────
export const getTableById = async (req, res, next) => {
    try {
        const table = await getTableInternal(req.params.id);
        return sendSuccess(res, 200, { table });
    } catch (err) {
        next(err);
    }
};
