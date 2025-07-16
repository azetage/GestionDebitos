import fs from 'fs';
import readline from 'readline'
import DebitosTemp from '../models/DebitosTemporales.js';
import ExcelJS from 'exceljs';
import { db_debitos } from '../config/db.js';
import os from 'os';
import path from 'path';

import EnvioDebitos from '../models/EnvioDebitos.js';
import VistaDebitos from '../models/VistaDebitos.js';
import EnvioPlanes from '../models/EnvioPlanes.js';

import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
import Organismos from '../models/Organismos.js';
import {Sequelize, Op, fn, col, where, literal } from 'sequelize';




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
    

const generarDebitos = async (codigo_debito, periodo)=>{
    
    GlobalenviosOrganismo= codigo_debito    

    const [year, month, day] = periodo.split('-').map(Number)
    
    console.log("codigo debito "+ codigo_debito+" periodo :" +year + "-"+month )

    let datosfonavi = await EnvioDebitos.findAll({
        where: {
                    COD_DEB: codigo_debito,
                    [Op.and]:   [
                                    literal(`YEAR(FEC_ENVIO) <= ${year} AND MONTH(FEC_ENVIO) <= ${month}`),
                                    literal(`YEAR(FEC_VTO) >= ${year} `),
                                 // LEN(DNI_DESC) > 6
                                    // where(fn('LEN', col('DNI_DESC')), {
                                    //     [Op.gt]: 6
                                    // })
                                ]
                    },
        order: [['NRO_AGENTE', 'ASC']]
        });

      
       
    let totalFonavi= 0
    
    const datos = datosfonavi.map(item   => {
        const suma = item.MTO_CUO + item.MTO_ADIC + item.MTO_DEUDA
        totalFonavi += suma
        
                return {
       
                    NRO_AGENTE: item.NRO_AGENTE,
                    APEYNOM:    item.APEYNOM,
                    DNI_DESC:   item.DNI_DESC,
                    MTO_CUO:    suma,
                    COD:        item.COD,                
                    OPERATORIA: 'ADJUD',
                                        }
               
                })
    console.log("Op Adjud "+ totalFonavi.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    let datosPlanes = await EnvioPlanes.findAll({
        where: {
            COD_DEB: codigo_debito,
            TIPO_PLAN: "C",
            [Op.and]:   [
                                    literal(`YEAR(CONF_PLAN) <= ${year} AND MONTH(CONF_PLAN) <= ${month}`),
                                    literal(`YEAR(VTO_PLAN) >= ${year} `),
                                    // LEN(DNI_DESC) > 6
                                    where(fn('LEN', col('DNI_DESC')), {
                                        [Op.gt]: 6
                                    })
                                ]
            },
            order: [['N_TARJETA', 'ASC']]
        });

    let totalPlanes = 0  
    const datos1 = datosPlanes.map(item   => {
         const suma = item.MTO_CUO + item.MTO_ADIC + item.INT_CUO
         totalPlanes += suma
        
                 return {
       
                    NRO_AGENTE: item.N_TARJETA,
                    APEYNOM:    item.APEYNOM,
                    DNI_DESC:   item.DNI_DESC,
                    MTO_CUO:    suma,
                    COD:        item.COD,                
                    OPERATORIA: 'ADJUD',
                    }
               
                })
    console.log("Op Planes "+ totalPlanes.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

    datos.push(...datos1)
    
    
    let datosOperatorias2 = await VistaDebitos.findAll({
        where: {
            COD_DEB: codigo_debito,
            [Op.and]: [
                        where(fn('LEN', col('dni')), { [Op.gt]: 6 })
                      ]
             },
        order: [['agente_debito', 'ASC']]
        });
    let totalOperatoriaa2=0
    const datos2 = datosOperatorias2.map(item=>{
        totalOperatoriaa2 += item.imp_cuota
        return{
                    NRO_AGENTE: item.agente_debito,
                    APEYNOM:    item.nombre,
                    DNI_DESC:   item.dni,
                    MTO_CUO:    item.imp_cuota,
                    COD:        item.codigo,                
                    OPERATORIA: item.operatoria,
                    
                    }
           
        })

    console.log("Op Operatorias2 "+ totalOperatoriaa2.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    console.log("------------------")

    let total= totalFonavi+totalPlanes+totalOperatoriaa2
    
    datos.push(...datos2)
    
    const totalPesos = total.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2});

    console.log(totalPesos)
       
    return {datos,totalPesos}
    
}




const consultarDebitos = async (req,res)=>{
    
    let codigo_debito = req.query.enviosOrganismo
    let periodo =       req.query.enviosPeriodo
    let debitos = await generarDebitos(codigo_debito,periodo)

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
                            {header : 'DNI DESC',           key: 'DNI_DESC'},
                            {header : 'APELLIDO Y NOMBRE',  key: 'APEYNOM'},
                            {header : 'NRO AGENTE',         key: 'NRO_AGENTE'},
                            {header : 'MONTO',              key: 'MTO_CUO'},
                            {header : 'OPERATORIA',         key: 'OPERATORIA'},
                        ]
    async function generartxt (req,res){

  
//     console.log(GlobalenviosOrganismo)
    
//     let {datos} = await generarDebitos(GlobalenviosOrganismo)

//     console.log(datos)

//     const lineas = datos.map(item => 
//                     '$(item.NRO_AGENTE)  $(item.APEYNOM)  $(item.DNI_DESC) $(item.MTO_CUO)`.join('\n')
                 
//     )
    


 }

    //agregar Filas 
    datos.forEach(item=>{
                           // console.log(item)    
                            worksheet.addRow(item)})                    

    // guardar archivo

    const ruta = path.join(obtenerRutaDescargas(),'Debitos.xls')

    await workbook.xlsx.writeFile(ruta);

    console.log(`excel generado: ${ruta}`)
    



}
// async function generartxt (req,res){

  
//     console.log(GlobalenviosOrganismo)
    
//     let {datos} = await generarDebitos(GlobalenviosOrganismo)

//     console.log(datos)

//     const lineas = datos.map(item => 
//                     '$(item.NRO_AGENTE)  $(item.APEYNOM)  $(item.DNI_DESC) $(item.MTO_CUO)`.join('\n')
                 
//     )
    


// }

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
