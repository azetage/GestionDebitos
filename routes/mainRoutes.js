import express from 'express';

import {paginainicio} from '../controllers/mainController.js';

//crear app

const router = express.Router();

//routing

router.get('/index',paginainicio)




export default router



