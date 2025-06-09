import express from 'express';

import {formularioLogin,
		iniciarSesion, 
		formularioRegistro, 
		registrar} from '../controllers/usuarioController.js';

//crear app

const router = express.Router();

//routing

router.get('/',formularioLogin)
router.get ('/login', formularioLogin);
router.post('/login',iniciarSesion)

router.get ('/registro', formularioRegistro);
router.post('/registro', registrar);



router.post ('/', function (req,res) { 
    res.send('Información de Nosotros')
});

export default router



