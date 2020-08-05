import Joi = require('@hapi/joi');

export const addQuizSchema = Joi.object({
    name: Joi.string().required().not().empty(),
    description:Joi.string().not().empty(),
    active:Joi.bool().default(false)
});

export const updateQuizSchema = Joi.object({
    name: Joi.string().not().empty(),
    description:Joi.string().not().empty(),
    active:Joi.bool()
});
