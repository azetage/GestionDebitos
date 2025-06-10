import fs from 'fs';
import readline from 'readline'
import DebitosTemp from '../models/DebitosTemporales.js';
import ExcelJS from 'exceljs';
import { db_debitos } from '../config/db.js';
import os from 'os';
import path from 'path';

const paginainicio = async (req, res) => {
 
    const fileStream = fs.createReadStream('./uploads/archiveto.txt');
    
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    
    });
        let datos= []

    for await (const line of rl){
        const registro = {
        
        fec_vto:    line.slice(24,32),
        cbu:        line.slice(32,40),
        cbu2:       line.slice(40,54),
        nro_agente: line.slice(44,53),
        monto:      line.slice(60,74),
        codigo:     line.slice(74,81)
        }
    
        datos.push(registro)
    }




    res.render('main/index', {
        pagina : "GESTION DEBITOS",
        datos
    })
    
    // DebitosTemp.bulkCreate(datos)
    // datos.map(async(dato,i)=> {
    //         await DebitosTemp.create({
    //             FEC_VTO:    dato.fec_vto,
    //             CBU:        dato.cbu,
    //             CBU2:       dato.cbu2,
    //             NRO_AGENTE: dato.nro_agente,
    //             MONTO:      dato.monto,
    //             CODIGO:     dato.codigo
    //         })}
    // )
}

function obtenerRutaDescargas(){
    const home = os.homedir();
//console.log (path.join(home,'Dowloads'))
    return path.join(home,'Descargas');
}

const generarExcel= async(req,res)=>{

    console.log("funcion generar")


    const [rows] = await DebitosTemp.findAll()

    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Datos");

    // // definir columnas

    // const columnas = Object.keys(rows[0] || {}).map(key => ({
    //     header: key,
    //     key
    //   }));
    //   worksheet.columns = columnas

    // // agregar Filas 

    // rows.forEach(row => worksheet.addRow(row));

    // guardar archivo

    const ruta = path.join(obtenerRutaDescargas(),'debitos_generados.xlsx')

    await workbook.xlsx.writeFile(ruta);

    console.log(`excel generado: ${ruta}`)
    
}
export {
    paginainicio, 
    generarExcel
}
