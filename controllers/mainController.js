import fs from 'fs';
import readline from 'readline'
import ExcelJS from 'exceljs';
import { db_debitos,db_vistaDebitos } from '../config/db.js';
import path from 'path';
import Organismos from '../models/Organismos.js';
import DebitosTotales from '../models/DebitosTotales.js';
import { DBFFile } from 'dbffile';
import { writeFile } from 'fs/promises';
import { json, STRING } from 'sequelize';


global.GlobalenviosOrganismo= ""
global.Globalperiodo=""
global.Globalsigla=""
global.wfecha= ""
global.ultimoDia= ""
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
   
    return organismos
}

function ultimoDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}


const generarDebitos = async (codigo_debito, periodo, sigla)=>{

    GlobalenviosOrganismo= codigo_debito
    Globalperiodo=periodo
    Globalsigla= sigla

    console.log("********************************************************************")
    console.log("******************        CONSOLA          *************************")
    console.log("********************************************************************")




    console.log("codigo debito "+ codigo_debito+" periodo :" +periodo )
    const [year, month, day] = periodo.split('-').map(Number)
    console.log ("FECHA SEPADARA", year, month, day)
    wfecha = new Date(year, month-1, day)
    console.log ("NUEVA DATE DESDE FECHA SEPARADA", wfecha.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))
    
    ultimoDia = ultimoDiaDelMes(wfecha);
    console.log("ULTIMO DIA DEL MES ",ultimoDia.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))
/////////////////////////////////////DEBITOS FONAVI /////////////////////////////////////////////////////////////////////////

// `SELECT * FROM VISTA_ENVIODEBITOS 
//    WHERE COD_DEB = :codigoDebito 
//      AND FEC_ENVIO <= :ultimodiaSQL 
//      AND FEC_VTO >= :fechaSQL
//    ORDER BY NRO_AGENTE ASC`,

//  if (req.query.compleja_fecha_escritura){
//         const year = Number(req.query.compleja_fecha_escritura);
//         const start = new Date(`${year}-01-01T00:00:00Z`);
//         const end   = new Date(`${year}-12-31T23:59:59Z`);
                    
//         where.FECHA_ESCRITURA= { [Op.between]: [start, end] }
//     }            
    let datos
    let totalFonavi= 0
    let totalPlanes = 0
    let totalOperatoria2=0
    
    // MAPEO FONAVI
    const datosfonavi = await db_debitos.query(
    `SELECT * FROM VISTA_ENVIODEBITOS 
        WHERE COD_DEB = :codigoDebito
        AND FEC_ENVIO <= '2025-09-01' 
        AND FEC_VTO >= '2025-09-30'
        ORDER BY NRO_AGENTE ASC`,

        

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    datos = datosfonavi.map(item   => { 
                    const suma = item.MTO_CUO+item.MTO_ADIC+item.MTO_DEUDA
                    totalFonavi += suma
                    return {
                                FECHA:      wfecha.toISOString().split('T')[0],
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,
                                SUCURSAL:   item.SUCURSAL, 
                                NRO_AGENTE: item.NRO_AGENTE,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   0
                            }
                    }
                )
    console.log("elementos [Fonavi]   " + datosfonavi.length + "   total [fonavi]   " + totalFonavi.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

   /////////////////////////////////////DEBITOS PLANES /////////////////////////////////////////////////////////////////////////
    
   // `SELECT * FROM VISTA_ENVIODEBITOS 
//    WHERE COD_DEB = :codigoDebito 
//      AND FEC_ENVIO <= :ultimodiaSQL 
//      AND FEC_VTO >= :fechaSQL
//    ORDER BY NRO_AGENTE ASC`,

//  if (req.query.compleja_fecha_escritura){
//         const year = Number(req.query.compleja_fecha_escritura);
//         const start = new Date(`${year}-01-01T00:00:00Z`);
//         const end   = new Date(`${year}-12-31T23:59:59Z`);
                    
//         where.FECHA_ESCRITURA= { [Op.between]: [start, end] }
//     }            


    let datosPlanes = await db_debitos.query(
        `SELECT * FROM VISTA_ENVIOPLANES 
        WHERE COD_DEB = :codigoDebito
        AND TIPO_PLAN = 'C'
        AND CONF_PLAN <= :ultimodiaSQL
        AND VTO_PLAN >=  :fechaSQL
        ORDER BY N_TARJETA ASC`,

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    let datos1 = datosPlanes.map(item   => {
         const suma = item.MTO_CUO + item.MTO_ADIC + item.INT_CUO
         totalPlanes += suma
                 return {

                   
                                FECHA:      wfecha.toISOString().split('T')[0],
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,
                                SUCURSAL:   item.SUCURSAL,     
                                NRO_AGENTE: item.N_TARJETA,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   0  // ← contador de registros
                    }

                }
            )
    console.log("elementos [Planes]   " + datos1.length + "   total [planes]   "+totalPlanes.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    datos.push(...datos1)
    /////////////////////////////////////DEBITOS OPERATORIAS /////////////////////////////////////////////////////////////////////////  
    
    let datosOperatorias2 = await db_vistaDebitos.query(
        `SELECT * FROM v_debitos 
        WHERE COD_DEB = :codigoDebito
        ORDER BY agente_debito ASC`,

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    const datos2 = datosOperatorias2.map(item=>{
        totalOperatoria2 += item.imp_cuota
        return{
                              
                FECHA:      wfecha.toISOString().split('T')[0],
                OPERATORIA: item.operatoria,
                COD:        item.codigo,
                COD_DEB:    codigo_debito,
                SIGLA:      sigla,
                SUCURSAL:   item.agente_debito.slice(1,4), 
                NRO_AGENTE: item.agente_debito,
                DNI_DESC:   item.dni,
                APEYNOM:    item.nombre,                                
                MTO_CUO:    item.imp_cuota,                            
                cantidad:   1  // ← contador de registros
                        }

        })
    console.log("elementos [Operatorias2]   " + datos2.length + "   total [operatorias2]   " + totalOperatoria2.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    datos.push(...datos2) 


    let total= totalFonavi+totalPlanes+totalOperatoria2

    const totalPesos = total //total.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2});
    
    if (['7','11'].includes(codigo_debito)) {

                const agrupados = datos.reduce((acc, item) => {
                const key =  `${item.SUCURSAL}-${item.NRO_AGENTE}`;

                // proteger contra null/undefined
                 const safe = (v) => Number(v) || 0; 
                 const monto = safe(item.MTO_CUO); // monto a acumul
                
                 if (!acc[key]) {
                    acc[key] = {
                        FECHA:      item.FECHA,
                        OPERATORIA: item.OPERATORIA,
                        COD:        item.COD,
                        COD_DEB:    item.COD_DEB,                        
                        SIGLA:      item.SIGLA,    
                        SUCURSAL:   item.SUCURSAL,
                        NRO_AGENTE: item.NRO_AGENTE,
                        DNI_DESC:   item.DNI_DESC,
                        APEYNOM:    item.APEYNOM,                                
                        MTO_CUO:    0,                            
                        cantidad:   0  // ← contador de registros
                    };
                }

                acc[key].MTO_CUO += monto;  // acumula la cuota
                acc[key].cantidad += 1;     // incrementa contador de registros

                return acc;
            }, {});
            
            if (['11'].includes(codigo_debito)) {
                Object.values(agrupados).forEach(item => {
                item.MTO_CUO += 200;
                });
            }    

            datos = Object.values(agrupados);
            
    }
    
    if (['2', '8'].includes(datos[0]?.COD_DEB)) {
                datos = datos.map(item   => { 
                    return {
                                    FECHA:      item.FECHA,
                                    OPERATORIA: item.OPERATORIA,
                                    COD:        item.COD,
                                    COD_DEB:    item.COD_DEB,
                                    SIGLA:      item.SIGLA,
                                    SUCURSAL:   item.SUCURSAL,    
                                    NRO_AGENTE: item.DNI_DESC,
                                    DNI_DESC:   item.DNI_DESC,
                                    APEYNOM:    item.APEYNOM,                                
                                    MTO_CUO:    item.MTO_CUO,                            
                                    cantidad:   1
                            }
                    }
                )
    }
    if (['34','37'].includes(datos[0]?.COD_DEB)) {

         Object.values(datos).forEach(item => {
            item.MTO_CUO += 1;
            });
    }
    console.log("=======================================================")
    console.log("CANTIDAD DE REGISTROS    [[ "+Object.keys(datos).length +"]]--- TOTAL PESOS " + totalPesos.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    //console.log (JSON.stringify(datos[0]))

    
 //   datos.forEach((obj, i) => {
//  console.log(`${i + 1}: ${JSON.stringify(obj)}\n`)
//})
    return {datos,totalPesos}

}

const consultarDebitos = async (req,res)=>{
    let [codigo_debito, sigla] = req.query.enviosOrganismo.split('|');
    let periodo =       req.query.enviosPeriodo
    let debitos = await generarDebitos(codigo_debito,periodo,sigla)

        return res.render('main/enviodebitos', {
            pagina :    "ENVIO DEBITOS",
            datos:      debitos.datos,
            Organismos: await ConsultarOrganismos(),
            totalPesos: debitos.totalPesos.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}),
            cant_reg:   debitos.datos.length
            })
}

async function generarExcel (req,res){


    console.log(GlobalenviosOrganismo+Globalperiodo)


    let {datos} = await generarDebitos(GlobalenviosOrganismo,Globalperiodo,Globalsigla)

    await DebitosTotales.bulkCreate(datos)
    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos - "+Globalsigla);

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

    const ruta = path.join(obtenerRutaDescargas(),`Debitos ${Globalsigla}.xls`)

    await workbook.xlsx.writeFile(ruta);

    console.log(`excel generado: ${ruta}`)
    res.download(ruta, `Debitos ${Globalsigla} - ${Globalperiodo} .xls`,

            (err) => {
            if (err) {
                console.error('Error al descargar el archivo:', err);
                res.status(500).send('Hubo un problema al descargar el archivo');
            }
        })
}

async function generarDbf() {
  // Definir campos de la tabla
  const campos = [
    { name: 'FECHA', type: 'D', size: 8 },
    { name: 'OPERATORIA', type: 'C', size: 20 },
    { name: 'COD', type: 'N', size: 20 },
    { name: 'COD_DEB', type: 'C', size: 20 },
    { name: 'SIGLA', type: 'C', size: 20 },
    { name: 'NRO_AGENTE', type: 'C', size: 20 },
    { name: 'DNI_DESC', type: 'C', size: 20 },
    { name: 'APEYNOM', type: 'C', size: 20 },
    { name: 'MTO_CUO', type: 'N', size: 20 },
    { name: 'cantidad', type: 'N', size: 20 },
  ];

       


  // Crear archivo DBF
  const rutaArchivo = path.join(obtenerRutaDescargas(), `Debitos ${Globalsigla} - ${Globalperiodo}.dbf`);
  const dbf = await DBFFile.create(rutaArchivo, campos);

    console.log(`Archivo DBF creado: ${dbf.path}`);
    let {datos} = await generarDebitos(GlobalenviosOrganismo,Globalperiodo,Globalsigla)
  // Agregar registros
  await dbf.appendRecords(datos);

  console.log(`Se agregaron ${registros.length} registros`);
  res.download(rutaArchivo,`Debitos ${Globalsigla} - ${Globalperiodo}.dbf`)
}

//generarDbf().catch(console.error);


function a128Caracteres(str) {
  // Si es más largo, corta a 128
  str = str.slice(0, 128);
  // Si es más corto, rellena con espacios al final
  return str.padEnd(128, " ");
}


async function generartxt(req, res) {
  try {
    let { datos, totalPesos } = await generarDebitos(GlobalenviosOrganismo, Globalperiodo, Globalsigla);
    console.log(totalPesos)
    // Fechas
    const mes = String(wfecha.getMonth() + 1).padStart(2, "0");
    const diaFin = String(ultimoDia.getDate()).padStart(2, "0");

    // Encabezado
    const encabezado = `1315504660048000PE${mes}01${wfecha.getFullYear()}${mes}${diaFin}REE`;

    let filas = [a128Caracteres(encabezado) + "\n"];

    // Orden de campos
    const orden = ["SUCURSAL", "NRO_AGENTE", "MTO_CUO"];

    filas.push(
      ...datos.map(obj => {
        const valoresOrdenados = orden.map(k => {
          if (k === "SUCURSAL") {
            return String(obj[k] ?? "").padStart(4, "0") + "CA";
          }
          if (k === "NRO_AGENTE") {
            return String(obj[k] ?? "").padStart(11, "0");
          }
          if (k === "MTO_CUO") {
            const montoEntero = Math.round(Number(obj[k] ?? 0) * 100); // centavos
            return String(montoEntero).padStart(15, "0");
          }
          return obj[k] ?? "";
        });

        const fila = "2" + valoresOrdenados.join("");
        return a128Caracteres(fila) + "\n";
      })
    );
    // Pie de Pagina
    const montoRaw = totalPesos ?? 0;               // Si viene null/undefined → 0
    const totalPesosEntero = Math.round(Number(montoRaw) * 100); 
    const cantidad = String(datos.length).padStart(6, "0");
    const ceros = "0".repeat(21);
    const pieStr = "3" + String(totalPesosEntero).padStart(15, "0") + cantidad+ceros;
    const pie = a128Caracteres(pieStr) + "\n";
    filas.push(pie);
            
    // Construimos ruta con nombre de archivo .txt
        const ruta = path.join(
            obtenerRutaDescargas(),
            `Debitos ${Globalsigla} - ${Globalperiodo}.txt`
        );

        // Escribimos el archivo
        await writeFile(ruta,'Hola','utf8');
        await writeFile(ruta, filas, 'utf8');
        console.log(`Archivo creado exitosamente: ${ruta}`);
        res.download(ruta,`Debitos ${Globalsigla} - ${Globalperiodo}.txt`)

    } catch (err) {
        console.error('Error al escribir el archivo:', err);
    }
}


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
    generartxt,
    consultarDebitos,
    generarDbf
}
