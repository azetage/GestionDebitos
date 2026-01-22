import { Router } from 'express'
import {subirDebitos} from '../controllers/recepcionController.js';


const router = Router()

router.post('/upload', subirDebitos)

export default router
