import express from 'express';

import {paginainicio, generarExcel, debitosindex} from '../controllers/mainController.js';

//crear app

const router = express.Router();

//routing

router.get('/index',paginainicio)
router.get('/enviodebitos',debitosindex)
router.get('/index/generarExcel',generarExcel)




export default router



