import Joi = require('@hapi/joi');

export const addUserSchema = Joi.object({
    name: Joi.string().required().min(1)
});

export const getUserSchema = Joi.object({
    userId: Joi.string().required()
});
