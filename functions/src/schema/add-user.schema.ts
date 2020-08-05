import Joi = require('@hapi/joi');

const addUserSchema = Joi.object({
    name: Joi.string().required().min(1)
});

export default addUserSchema;
