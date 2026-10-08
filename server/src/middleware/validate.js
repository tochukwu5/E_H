/** Parse req[part] with a zod schema and replace it with the parsed (clean) value. */
export const validate = (schema, part = 'body') => (req, _res, next) => {
  try {
    req[part] = schema.parse(req[part]);
    next();
  } catch (e) {
    next(e);
  }
};
