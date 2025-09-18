import express from 'express';

import {paginainicio, generarExcel, debitosindex, consultarDebitos, generartxt,generarDbf,grabardatos,cierreEjercicio
} from '../controllers/mainController.js';

//crear app

const router = express.Router();

//routing

router.get('/index',paginainicio)
router.get('/enviodebitos',debitosindex)
router.get('/enviodebitos/consultasDebito', consultarDebitos)
router.get('/index/generarExcel',generarExcel)
router.get('/index/generarTxt', generartxt)
router.get('/index/generarDbf', generarDbf)
router.get('/index/grabardatos', grabardatos)
router.get('/index/cierreejercicio',cierreEjercicio)





export default router



