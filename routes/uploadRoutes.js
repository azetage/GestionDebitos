import { Router } from 'express'
import {subirDebitos,subirDebitosBanco, grabarDebitos,TipoDocumento} from '../controllers/recepcionController.js';


const router = Router()

//router.post('/upload', subirDebitos)
//router.post('/upload', TipoDocumento)
router.post('/upload', TipoDocumento, (req, res, next) => {

  if (req.tipo === 'excel'|| req.tipo === 'dbf') return subirDebitos(req, res, next);

  if (req.tipo === 'txt') return subirDebitosBanco(req, res, next);

});

router.post('/upload/grabardebitos',grabarDebitos)

export default router
