import express from 'express';

    
import {paginainicio, generarExcel,reportePDFBasico ,    GenerarNotas
,generarExcelFormateado,debitosindex, consultarDebitos, generartxt,generarDbf,grabardatos,cierreEjercicio,seleccionarGrabados
} from '../controllers/mainController.js';
import {recepcioDebitosIndex} from '../controllers/recepcionController.js'

//crear app

const router = express.Router();

//routing

router.get('/index',paginainicio)
router.get('/enviodebitos',debitosindex)
router.get('/enviodebitos/consultasDebito', consultarDebitos)
router.get('/enviodebitos/seleccionarGrabados', seleccionarGrabados)
router.get('/index/generarExcel',generarExcel)
router.get('/index/generarExcelFormateado',generarExcelFormateado)
router.get('/index/generarTxt', generartxt)
router.get('/index/generarDbf', generarDbf)
router.get('/index/grabardatos', grabardatos)
router.get('/index/cierreejercicio',cierreEjercicio)
router.get('/index/reporte-pdf', reportePDFBasico);
router.get('/recepcionDebitos',recepcioDebitosIndex)
router.get('/index/Notaspdf', GenerarNotas);





export default router



