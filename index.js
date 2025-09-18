//const express = require ('express')
import express, { urlencoded } from 'express'
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import session from 'express-session'
import usuarioRoutes from './routes/usuarioRoutes.js'
import mainRoutes from './routes/mainRoutes.js'
import {db_debitos} from './config/db.js'



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//crear la app
const app = express()

//Habilitar lectura de datos de formulario
app.use(express.urlencoded({extended : true}))


// habilitar usuario con variable de entorno

app.use(session({
    secret: 'mi_clave_segura',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1 hora
    user: ""
  }));

  
//conexion a la base de datos
console.log('-----------------------------------')

try {
    console.log('Autenticacion Servidor Amazon AWS : Debitos ')
    await db_debitos.authenticate();

    console.log('Autenticacion Sincronizado')
    db_debitos.sync()
    console.log('Conexion Correcta a la base de datos: Debitos')
    } catch (error) {
    console.log(error)
    }

console.log('-----------------------------------')




//habilitar pug
app.set('view engine', 'pug')
app.set('views', './views')
app.set('views', path.join(__dirname, 'views'));
// habilitar carpeta publica

app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null,path.join(__dirname, 'uploads')),
  //filename: (req,file,cb)=>cb(null,Date.now() + '-'+file.originalname),
  filename: (req,file,cb)=>cb(null,'archiveto.txt'),
});
const upload = multer({storage});
// routing
app.use('/auth', usuarioRoutes)
app.use('/main',mainRoutes)
app.post('/upload', upload.single('archivo'),(req,res)=>{
    if(!req.file){
      return res.send("no se subio ningun archivo");
    }
    res.send("archivo recibido: ${req.file.originalmane}");
});

//definir un puerto y arrancar el proyecto

const port = 3006
app.listen(port, () => {
console.log(`el servidor esta funcionando en el puerto ${port}`)
console.log("http://localhost:3006/main/index")
});