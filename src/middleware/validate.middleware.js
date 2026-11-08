import { ApiError } from '../utils/response.js';

/**
 * Validates request data against a Zod schema.
 * @param {import('zod').ZodSchema} schema 
 * @param {'body'|'query'|'params'} source 
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.safeParse(dataToValidate);

      if (!parsed.success) {
        const issues = parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));

        throw new ApiError(400, 'Validation failed: ' + issues.map(i => i.message).join(', '), issues);
      }

      req[source] = parsed.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}
