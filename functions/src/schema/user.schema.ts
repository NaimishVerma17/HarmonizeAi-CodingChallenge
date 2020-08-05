import Joi = require('@hapi/joi');

export const addUserSchema = Joi.object({
    name: Joi.string().required().min(1)
});

