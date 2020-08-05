import * as functions from 'firebase-functions';

import * as bodyParser from 'body-parser';
import express from 'express'

import * as admin from 'firebase-admin'

import { asyncHandler, buildValidator } from './middleware'
import { addUserSchema } from './schema/user.schema';
import { errorHandler } from './errors';
import { HttpException } from './http.exception';
import { addQuizSchema, updateQuizSchema } from './schema/quizes.schema';


// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//

admin.initializeApp();
const Firestore = admin.firestore();

const app = express();
app.use(bodyParser.json());

app.get('/', asyncHandler(async (request, response, next) => {
    response.send('alive 💪')
}));

/*
 *
 * TIP:
 * 
 * for field validation use Joi
 * there is a middleware `buildValidator` already defined
 * just figure out how to define the right Joi schema and use the middleware
 * 
 * the 'buildValidator' middleware will also handle all the errors
 */


/*
 *
 * database models
 * 
 * USER:
 *   collection name: 'users'
 *   object structure:
 *     { 
 *       name: string, 
 *       quizIds: string[]
 *     }
 * 
 * QUIZ:
 *   collection name: 'quizzes'
 *   object structure:
 *     { 
 *       name: string, 
 *       description: string
 *       active: boolean
 *       userCount: number  -> private counter, should never be settable
 *     }
*/
const usersColl = Firestore.collection('users');
const quizzesColl = Firestore.collection('quizzes');

/*
 * create a user
 *
 * 
 * ROUTE: 
 *   POST /users
 *
 * expected body JSON:
 * {
 *   name: "Bob Builder"
 * }
 * 
 * POST PARAMS VALIDATION:
 *   name: string, required, min length 1
 *  
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   "user": {
 *     "id": "uAWoWFpknToBcdZ7GF59",
 *     "quizIds": [],
 *     "name": "Bob Builder"
 *   }
 * }
 * 
 */
app.post('/users',
    buildValidator(addUserSchema),
    asyncHandler(async (request, response, next) => {
        const user = {
            ...request.body,
            quizIds: []
        };
        const res = await usersColl.add(user);
        const userData = await res.get();
        response.json({
            user: {
                id: userData.id,
                ...userData.data()
            }
        });
    }));

/*
 * get a user
 *
 * 
 * ROUTE: 
 *   GET /users/:userId
 *  
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   "user": {
 *     "id": "uAWoWFpknToBcdZ7GF59",
 *     "quizIds": [],
 *     "name": "Bob Builder"
 *   }
 * }
 * 
 */
app.get('/users/:userId',
    asyncHandler(async (request, response, next) => {

        const userId = request.params.userId;
        const user = await usersColl.doc(userId).get();
        if (user.exists) {
            response.json(
                {
                    user: {
                        id: userId,
                        ...user.data()
                    }
                }
            );
        } else {
            const error = new HttpException(404, 'User not found');
            next(error);
        }
    }));

/*
* delete a user
*
* ROUTE:
*   POST /users
*
* EXPECTED RESPONSE: -> The values of the object that was deleted
* JSON
* {
*   "user": {
*     "id": "uAWoWFpknToBcdZ7GF59",
*     "quizIds": [],
*     "name": "Bob Builder"
*   }
* }
*
*/
app.delete('/users/:userId',
    asyncHandler(async (request, response, next) => {
        const userId = request.params.userId;
        const user = await usersColl.doc(userId).get();
        if (user.exists) {
            await usersColl.doc(userId).delete();
            response.json(
                {
                    user: {
                        id: userId,
                        ...user.data()
                    }
                }
            );
        } else {
            const error = new HttpException(404, 'User not found');
            next(error);
        }
    }));


/*
 * create an individual quiz
 *
 * expected JSON body:
 * {
 *   name: "Quiz 2",
 *   description: "this is a quiz to do something",
 *   active: false
 * }
 * 
 * name: string, required, can't be blank
 * description: string, optional, can't be blank
 * active: boolean, optional, defaults to false
 * 
 * ROUTE: 
 *   POST /quizes
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   "quiz": {
 *     "id": "KltYLDxCbP5lX6BHWY9l",
 *     "description": "this is a quiz to do something",
 *     "active": false,
 *     "userCount": 0,
 *     "name": "Quiz 2",
 *     "createdOn": {
 *       "_seconds": 1595465567,
 *       "_nanoseconds": 643000000
 *     }
 *   }
 * }
 * 
 * 
 * TIP: for your createdOn value, in your set call, set it to 
 *  `admin.firestore.FieldValue.serverTimestamp()`, that will use the server timestamp
 * 
 */
app.post('/quizzes',
    buildValidator(addQuizSchema),
    asyncHandler(async (request, response, next) => {
        const quiz = {
            ...request.body,
            userCount:0,
            createdOn: admin.firestore.FieldValue.serverTimestamp()
        };
        const res = await quizzesColl.add(quiz);
        const addedQuiz = await res.get();

        response.json({
            quiz:{
                id:addedQuiz.id,
                ...addedQuiz.data()
            }
        })
    }));


/*
 * partially update an individual quiz
 * 
 * Epected JSON:
 *   fields thesame as in create but can send one field at a time
 * 
 * name: string, optional, can't be blank
 * description: string, optional, can't be blank
 * active: boolean, optional
 * 
 * ROUTE: 
 *   POST /quizes/:quizId
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   quiz: {
 *      ... dump all the properties of the updated quiz ...
 *   }
 * }
 * 
 */

// Should be a PUT request
app.post('/quizzes/:quizId',
    buildValidator(updateQuizSchema),
    asyncHandler(async (request, response, next) => {
        const quizId = request.params.quizId;
        const quiz = await quizzesColl.doc(quizId).get();
        if(quiz.exists) {
            await quizzesColl.doc(quizId).update({...request.body});
            response.json({
                quiz : {
                    ...quiz.data(),
                    ...request.body
                }
            })
        } else {
            const error = new HttpException(404, 'Quiz not found');
            next(error);
        }
    }));

/*
 * get an individual quiz
 *
 * ROUTE: 
 *   GET /quizes/:quizId
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   quiz: {
 *      ... dump all the properties of the fetched quiz ...
 *   }
 * }
 */
app.get('/quizzes/:quizId', asyncHandler(async (request, response, next) => {
    const quizId = request.params.quizId;
    const quiz = await quizzesColl.doc(quizId).get();
    if (quiz.exists) {
        response.json(
            {
                quiz: {
                    id: quizId,
                    ...quiz.data()
                }
            }
        );
    } else {
        const error = new HttpException(404, 'Quiz not found');
        next(error);
    }
}));

/*
 * delete an individual quiz
 *
 * ROUTE: 
 *   GET /quizes/:quizId
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   quiz: {
 *      ... dump all the properties of the deleted quiz ...
 *   }
 * }
 */
app.delete('/quizzes/:quizId', asyncHandler(async (request, response, next) => {
    // @TODO: IMPLEMENT ME

    response.json('IMPLEMENT ME')
}))

/*
 * list latest 10 quizzes (ignore pagination)
 *
 * ROUTE: 
 *   GET /quizes
 * 
 * EXPECTED RESPONSE:
 * JSON
 * {
 *   quizes: [
 *      ... dump all the properties of the quiz ...,
 *      ... dump all the properties of the quiz ...,
 *      ...
 *   ]
 * }
 * 
 */
app.get('/quizzes', asyncHandler(async (request, response, next) => {
    // @TODO: IMPLEMENT ME

    response.json('IMPLEMENT ME')
}))

/*
* add a users to a quiz
*
*
* Should append the quiz id to the array of quizes on the user object in the database
* Should increment the `userCount` on the quiz object
*   - if the user is already part of the quiz, do not imcrement
* Both operations should be done in a Firestore transaction
*
* ROUTE:
*   POST /users/:userId/quizes/:quizId
*
* expected JSON body:
* {} // blank body
*
* EXPECTED RESPONSE:
* JSON
 {
     "quiz": {
         "id": "KltYLDxCbP5lX6BHWY9l",
         "description": "this is a quiz to do something",
         "active": false,
         "name": "Quiz 2",
         "createdOn": {
             "_seconds": 1595465567,
             "_nanoseconds": 643000000
         },
         "userCount": 1
     },
     "user": {
         "id": "uAWoWFpknToBcdZ7GF59",
         "name": "Bob Builder",
         "quizIds": [
             "KltYLDxCbP5lX6BHWY9l"
         ]
     }
 }
*/
app.post('/users/:userId/quizes/:quizId', asyncHandler(async (request, response, next) => {
    // @TODO: IMPLEMENT ME

    response.json('IMPLEMENT ME')
}));
app.use(errorHandler);


// Expose Express API as a single Cloud Function:
exports.api = functions.https.onRequest(app);
