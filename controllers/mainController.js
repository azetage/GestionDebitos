import fs from 'fs';
import readline from 'readline'
import ExcelJS from 'exceljs';
import { db_debitos } from '../config/db.js';
import path from 'path';
import VistaDebitos from '../models/VistaDebitos.js';
import EnvioPlanes from '../models/EnvioPlanes.js';
import Organismos from '../models/Organismos.js';
import {Op, fn, col, where} from 'sequelize';




global.GlobalenviosOrganismo= ""
global.Globalperiodo=""
global.Globalsigla=""

function obtenerRutaDescargas(){
    // const home = os.homedir();
    // return path.join(home,'Descargas');
    return 'public/descargas'
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
    let organismos = await Organismos.findAll({ where: { FORMA: 'AUTOMATICA' } })
    console.log(organismos.length)
    return organismos
}

function ultimoDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}


const generarDebitos = async (codigo_debito, periodo, sigla)=>{

    GlobalenviosOrganismo= codigo_debito
    Globalperiodo=periodo
    Globalsigla= sigla

    console.log("codigo debito "+ codigo_debito+" periodo :" +periodo )

    const [year, month, day] = periodo.split('-').map(Number)

    console.log ("FECHA SEPADARA", year, month, day)

    const wfecha = new Date(year, month-1, day)

    console.log ("NUEVA DATE DESDE FECHA SEPARADA", wfecha.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))

    const ultimoDia = ultimoDiaDelMes(wfecha);
 
    console.log("ULTIMO DIA DEL MES ",ultimoDia.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))

// `SELECT * FROM VISTA_ENVIODEBITOS 
//    WHERE COD_DEB = :codigoDebito 
//      AND FEC_ENVIO <= :ultimodiaSQL 
//      AND FEC_VTO >= :fechaSQL
//    ORDER BY NRO_AGENTE ASC`,

    
const datosfonavi = await db_debitos.query(
`SELECT * FROM VISTA_ENVIODEBITOS 
    WHERE COD_DEB = :codigoDebito
    AND FEC_ENVIO <= :ultimodiaSQL
    AND FEC_VTO >= :fechaSQL
    ORDER BY NRO_AGENTE ASC`,

  {
    replacements: {
      codigoDebito: codigo_debito,
       fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
       ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
    },
    type: db_debitos.QueryTypes.SELECT
  }
);

//  const datosfonavi = await EnvioDebitos.findAll({
//     where: {
//     COD_DEB: codigo_debito,
//     FEC_ENVIO: { [Op.lte]: ultimoDia },   // <=
//     FEC_VTO: { [Op.gte]: wfecha }         // >=
//   },
//   order: [['NRO_AGENTE', 'ASC']]
// });

    let totalFonavi= 0
    let datos
    
    if (!['11', '34', '37'].includes(codigo_debito)){
    
        if(['2', '8'].includes(codigo_debito)){
                datos = datosfonavi.map(item   => { 
                    const suma = item.MTO_CUO+item.MTO_ADIC+item.MTO_DEUDA
                    totalFonavi += suma
                    return {
                                FECHA: wfecha,
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.DNI_DESC,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   'N/A'
                            }
                    }
                )

        }else{ 
                datos = datosfonavi.map(item   => { 
                    const suma = item.MTO_CUO+item.MTO_ADIC+item.MTO_DEUDA
                    totalFonavi += suma
                        return {
                                FECHA: wfecha,
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.NRO_AGENTE,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   'N/A'
                                }
                        }
                )
                
            }          
    }
    else{
        
        const agrupados = datosfonavi.reduce((acc, item) => {
        const key = item.NRO_AGENTE;
        let suma=0
        if (['11'].includes(codigo_debito)){
            suma = item.MTO_CUO + item.MTO_ADIC + item.MTO_DEUDA;
        }else{
             suma = item.MTO_CUO + item.MTO_ADIC + item.MTO_DEUDA+1;
        }   
        
        totalFonavi += suma;

        if (!acc[key]) {
            acc[key] = {
                                FECHA: wfecha,
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.NRO_AGENTE,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad: 0  // ← contador de registros
            };
        }

        acc[key].MTO_CUO += suma;
        acc[key].cantidad += 1; // ← incrementa por cada registro

            return acc;
            }, {});

        datos = Object.values(agrupados);
    }
    console.log('cantidad de elementos:'+ datos.length , 'gastos administrativos FONAVI: ' + datos.length*200)  
    console.log("Op Fonavi "+ totalFonavi.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

    let datosPlanes = await EnvioPlanes.findAll({
                                                    where: {
                                                            COD_DEB: codigo_debito,
                                                            TIPO_PLAN: "C",
                                                            CONF_PLAN_OFFSET: {
                                                                                [Op.lte]:   ultimoDia
                                                                                },
                                                            VTO_PLAN_OFFSET:   {
                                                                                [Op.gte]:   ultimoDia
                                                                                },
                                                            [Op.and]:           [
                                                                                where(fn('LEN', col('DNI_DESC')), {
                                                                                    [Op.gt]: 6
                                                                                    })
                                                                                ]
                                                          } ,
            order: [['N_TARJETA', 'ASC']]
        });

    let totalPlanes = 0
    const datos1 = datosPlanes.map(item   => {
         const suma = item.MTO_CUO + item.MTO_ADIC + item.INT_CUO
         totalPlanes += suma

                 return {

                         
                                FECHA: wfecha,
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.N_TARJETA,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad: 0  // ← contador de registros
                    }

                })
    console.log("Op Planes "+ totalPlanes.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

    datos.push(...datos1)


    let datosOperatorias2 = await VistaDebitos.findAll({
        where: {
            COD_DEB: codigo_debito,
          },
        order: [['agente_debito', 'ASC']]
        });
    let totalOperatoria2=0
    const datos2 = datosOperatorias2.map(item=>{
        totalOperatoria2 += item.imp_cuota
        return{
                                 
         


                    FECHA: wfecha,
                               OPERATORIA: item.operatoria,
                                COD:        item.codigo,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.agente_debito,
                                DNI_DESC:   item.dni,
                                APEYNOM:    item.nombre,                                
                                MTO_CUO:    item.imp_cuota,                            
                                cantidad: 0  // ← contador de registros
                                        }

        })

    datos.push(...datos2)
    console.log("Op Operatorias2 "+ totalOperatoria2.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    console.log("------------------")

    let total= totalFonavi+totalPlanes+totalOperatoria2

    const totalPesos = total.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2});

    console.log("CANTIDAD DE REGISTROS "+datos.length +"--- TOTAL PESOS" + totalPesos)

    return {datos,totalPesos}

}




const consultarDebitos = async (req,res)=>{
    let [codigo_debito, sigla] = req.query.enviosOrganismo.split('|');

    let periodo =       req.query.enviosPeriodo
    let debitos = await generarDebitos(codigo_debito,periodo,sigla)

        return res.render('main/enviodebitos', {
            pagina : "ENVIO DEBITOS",
            datos: debitos.datos,
            Organismos: await ConsultarOrganismos(),
            totalPesos: debitos.totalPesos
            })
}

async function generarExcel (req,res){


    console.log(GlobalenviosOrganismo+Globalperiodo)


    let {datos} = await generarDebitos(GlobalenviosOrganismo,Globalperiodo,Globalsigla)


    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos");

    worksheet.columns = [
    { header: 'FECHA', key: 'FECHA',width: 15, style: { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'center' } } },
    { header: 'OPERATORIA', key: 'OPERATORIA',width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'CODIGO', key: 'COD',width: 10, style: { alignment: { horizontal: 'center' } }},
    { header: 'CODIGO DEBITO', key: 'COD_DEB',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SIGLA', key: 'SIGLA',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'NRO AGENTE', key: 'NRO_AGENTE',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'DNI', key: 'DNI_DESC',width: 15, style: { alignment: { horizontal: 'center' } }  },
    { header: 'APELLIDO Y NOMBRE', key: 'APEYNOM',width: 40 },
    { header: 'MONTO CUOTA', key: 'MTO_CUO',width: 15 ,style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },
    { header: 'CANT', key: 'cantidad', style: { numFmt: '0', alignment: { horizontal: 'center' } } }
];

    //agregar Filas
    datos.forEach(item=>{

    // console.log(item)
    worksheet.addRow(item)})

    // guardar archivo

    const ruta = path.join(obtenerRutaDescargas(),'Debitos.xls')

    await workbook.xlsx.writeFile(ruta);

    console.log(`excel generado: ${ruta}`)
    res.download(ruta, 'Debitos.xls',

            (err) => {
            if (err) {
                console.error('Error al descargar el archivo:', err);
                res.status(500).send('Hubo un problema al descargar el archivo');
            }
        })





}
// async function generartxt (req,res){


//     console.log(GlobalenviosOrganismo)

//     let {datos} = await generarDebitos(GlobalenviosOrganismo)

//     console.log(datos)

//     const lineas = datos.map(item =>
//                     '$(item.NRO_AGENTE)  $(item.APEYNOM)  $(item.DNI_DESC) $(item.MTO_CUO)`.join('\n')

//     )



// }

//async function reportePDFBasico(){
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
//}

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
