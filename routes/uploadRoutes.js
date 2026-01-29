import { Router } from 'express'
import {subirDebitos, grabarDebitos} from '../controllers/recepcionController.js';


const router = Router()

router.post('/upload', subirDebitos)
router.post('/upload/grabardebitos',grabarDebitos)

export default router
