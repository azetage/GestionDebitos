import fs from 'fs';
import readline from 'readline'
import DebitosTemp from '../models/DebitosTemporales.js';
import ExcelJS from 'exceljs';
import { db_debitos } from '../config/db.js';
import os from 'os';
import path from 'path';
import EnvioDebitos from '../models/EnvioDebitos.js';
import VistaDebitos from '../models/VistaDebitos.js';
import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import Organismos from '../models/Organismos.js';
import { Op, fn, col, where } from 'sequelize';



global.GlobalenviosOrganismo= ""  

function obtenerRutaDescargas(){
    const home = os.homedir();
    return path.join(home,'Descargas');
}

async function  cargarArchivo() {
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

}
async function ConsultarOrganismos(){
    let organismos = await Organismos.findAll({ where: { FORMA: 'AUTOMATICA' }})
    return organismos
}
    

const generarDebitos = async (codigo_debito)=>{
    
    GlobalenviosOrganismo= codigo_debito    

    let datosfonavi = await EnvioDebitos.findAll({
        where: {
            COD_DEB: codigo_debito,
            [Op.and]: [
            where(fn('LEN', col('DNI_DESC')), { [Op.gt]: 6 })
            ]
             },
        order: [['NRO_AGENTE', 'ASC']]
        });
       
       
    let total= 0
    
    const datos = datosfonavi.map(item   => {
        total += item.MTO_CUO        

                return {
       
                    COD:        item.COD,
                    COD_DEB:    item.COD_DEB,
                    DNI_DESC:   item.DNI_DESC,
                    APEYNOM:    item.APEYNOM,
                    NRO_AGENTE: item.NRO_AGENTE,
                    MTO_CUO:    item.MTO_CUO,
                    OPERATORIA: 'ADJUD',
                    total
                    }
               
                })
    console.log(total)
    
    let datosOperatorias2 = await VistaDebitos.findAll({
        where: {
            COD_DEB: codigo_debito,
            [Op.and]: [
            where(fn('LEN', col('dni')), { [Op.gt]: 6 })
            ]
             },
        order: [['dni', 'ASC']]
        });
    
    const datos1 = datosOperatorias2.map(item=>{
        total += item.imp_cuota
        return{
            COD:        item.codigo,
            COD_DEB:    item.OrganismoId,
            DNI_DESC:   item.dni_titular,
            APEYNOM:    item.titular,
            NRO_AGENTE: item.agente,
            MTO_CUO:    item.imp_cuota,
            OPERATORIA: item.operatoria,
            total
        }})

    console.log(total)
    
    datos.push(...datos1)
    
    const totalPesos = total.toLocaleString('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
        });

    console.log(totalPesos)
       
    return {datos,totalPesos}
    
}




const consultarDebitos = async (req,res)=>{
    
    let codigo_debito = req.query.enviosOrganismo
    let debitos = await generarDebitos(codigo_debito)

        return res.render('main/enviodebitos', {
            pagina : "ENVIO DEBITOS",
            datos: debitos.datos, 
            Organismos: await ConsultarOrganismos(),
            totalPesos: debitos.totalPesos
            })   
}

async function generarExcel (req,res){

    
    console.log(GlobalenviosOrganismo)
    
    let {datos} = await generarDebitos(GlobalenviosOrganismo)

    console.log(datos)

    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos");

    // // definir columnas
    worksheet.columns = [
                            {header : 'CODIGO',             key: 'COD'},
                            {header : 'CODIGO DEBITO',      key: 'COD_DEB'},
                            {header : 'DNI DESC',           key: 'DNI_DESC'},
                            {header : 'APELLIDO Y NOMBRE',  key: 'APEYNOM'},
                            {header : 'NRO AGENTE',         key: 'NRO_AGENTE'},
                            {header : 'MONTO',              key: 'MTO_CUO'},
                            {header : 'OPERATORIA',         key: 'OPERATORIA'},
                        ]
    
    //agregar Filas 
    datos.forEach(item=>{
                           // console.log(item)    
                            worksheet.addRow(item)})                    

    // guardar archivo

    const ruta = path.join(obtenerRutaDescargas(),'Debitos.xls')

    await workbook.xlsx.writeFile(ruta);

    console.log(`excel generado: ${ruta}`)
    



}

async function reportePDFBasico(){
//     const doc = new jsPDF()
//     const datos =await consultarDebitos(34)

//     const body = datos.map(item => [
//         item.COD,
//         item.COD_DEB,
//         item.DNI_DESC,
//         item.APEYNOM,
//         item.NRO_AGENTE,
//         item.MTO_CUO,
//         item.OPERATORIA
//       ]);

//     doc.text('DEBITOS DIO',10,10);

//     autoTable(doc, {
//         startY: 20,
//         head: [['COD', 'COD_DEB', 'DNI_DESC', 'APEYNOM', 'NRO_AGENTE', 'MTO_CUO', 'OPERATORIA']],
//         body: body,

//           // Estilos generales
//         styles: {
//             fontSize: 6,
//             cellPadding: 4,
//             valign: 'middle',
//             halign: 'left', // alineación horizontal
//             textColor: [40, 40, 40]
//         },

// //    Encabezado
//         headStyles: {
//             fillColor: [128, 128, 128],  // color fondo
//             textColor: [255, 255, 255], // color texto
//             fontStyle: 'bold',
//             halign: 'center'
//         },

// //   // Cuerpo de la tabla
// //   bodyStyles: {
// //     fillColor: [245, 245, 245], // fondo alterno
// //     textColor: 50
// //   },

// //   // Columnas específicas
// //   columnStyles: {
// //     0: { halign: 'center', cellWidth: 15 },
// //     3: { halign: 'right' }
// //   },

// //   // Opcional: pie de tabla
//     didDrawPage: (data) => {
//         doc.setFontSize(8);
//         doc.text(`Reporte generado automáticamente - Sist deb IPV - ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);         }

//       });

//     doc.save("reporte.pdf")
}
const paginainicio= async (req,res)=> {
   
   // reportePDFBasico()
    return res.render('main/index', {
         pagina : "GESTION DEBITOS",
         
         })

}

const debitosindex = async (req,res)=>{

    let Organismos = await ConsultarOrganismos();
    
    return res.render('main/enviodebitos', {
        pagina : "ENVIO DEBITOS",
        datos: null,
        Organismos
        })

}


export {
    paginainicio, 
    generarExcel,
    debitosindex,
    generarDebitos,
    consultarDebitos
}
