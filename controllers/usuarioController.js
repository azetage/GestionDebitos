import {body, check, validationResult} from "express-validator"
import session from "express-session"
import bcrypt from 'bcrypt'
import Usuario from "../models/Usuario.js"
import {generarId} from "../helpers/token.js"
import {emailRegistro} from "../helpers/email.js"



const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina : "INICIAR SESION"
    })
}

const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina : 'Crear Cuenta'
    })
}

const registrar = async (req, res) =>{
    console.log("conectando...")
    console.log(req.body)

// VALIDACION DE DATOS DEL FORMULARIO

    await check('nombre').notEmpty().withMessage('El Nombre no puede ir vacio').run(req)
    await check('password').isLength({ min: 6 }).withMessage('La Clave debe ser de al menos 6 caracteres').run(req)
    await check('repetir_password').equals(req.body.password).withMessage('Las Claves no son iguales').run(req)

    let resultado = validationResult(req)

    // verificar el resultado este vacio
    if (!resultado.isEmpty()) {
        // el resultado no esta vacio, hay errores
           return  res.render('auth/registro',
            {
                pagina: "Crear Cuenta",
                errores: resultado.array(),
                usuario: {
                        nombre: req.body.nombre,
                        email:  req.body.email
                        
                }
            })
        }


//EXTRAER DATOS 

  const {nombre, password} = req.body        

// VERIFICAR QUE EL USUARIO NO ESTE DUPLICADO          // email : req.body.email == email: email
    const existeUsuario = await Usuario.findOne({where :{nombre}}) //object literal enhancement
    
    if(existeUsuario){
        // el resultado no esta vacio, hay errores
        return  res.render('auth/registro',
            {
                pagina: "Crear Cuenta",
                errores: [{msg: "el usuario ya esta registrado"}],
                usuario: {
                        nombre: req.body.nombre,
                        email:  req.body.email
                        
                }
            })
    }
    console.log(existeUsuario)

    //return ;


//ALMACENAR UN USUARIO
    const usuario = await Usuario.create({
        nombre, 
        password,
     })

// ENVIAR EMAIL DE CONFIRMACION

// MOSTRAR INFORMACION
    res.render('templates/mensaje',{
        pagina: 'Gestion Usuarios',
        mensaje: 'Operacion realizada Satisfactoriamente'

    })
}



const iniciarSesion= async(req,res) =>{
    console.log('funcion Iniciar Sesion')
    const usuario = req.body.usuario
    const pass= req.body.password
    //console.log(JSON.stringify(usuario)+ ` `+ JSON.stringify(pass))
    const existeUsuario = await Usuario.findOne({ where : { nombre: usuario }})
    
    if (existeUsuario)
    {
        if (pass==existeUsuario.password)
        {
            req.session.user= existeUsuario.nombre
            console.log(req.session.user)
            console.log("acceso garantizado")
            res.render('inicio/inicio',
                 {
                    pagina: 'MENU PRINCIPAL',
                    usuario: req.session.user
                }
            )
        }
        else{
            console.log('acceso denegado')
            res.render('templates/mensaje',{
                pagina: 'INICIAR SESION',
                mensaje: 'Usuario o Contraseña Incorrectos',
                ruta: '/auth/login'
        
                })
            }
    }
    
    else{
        console.log('acceso denegado')
        res.render('templates/mensaje',{
            pagina: 'INICIAR SESION',
            mensaje: 'Usuario o Contraseña Incorrectos',
            ruta: '/auth/login'
    
            })
        }
    }



export {
    formularioLogin,
    formularioRegistro,
    registrar,
    iniciarSesion
}
