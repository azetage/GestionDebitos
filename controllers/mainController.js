import fs from 'fs';
import readline from 'readline'
import ExcelJS from 'exceljs';
import { db_debitos,db_vistaDebitos } from '../config/db.js';
import path from 'path';
import Organismos from '../models/Organismos.js';
import DebitosTotales from '../models/DebitosTotales.js';
import { DBFFile } from 'dbffile';
import { writeFile } from 'fs/promises';
import { Op, Sequelize} from "sequelize";
import PdfPrinter from 'pdfmake';






global.globalDatosSinAgrup= ""
global.globalDatosAgrup= ""

global.GlobalenviosOrganismo= ""
global.Globalperiodo=""
global.Globalsigla=""

global.wfecha= ""
global.ultimoDia= ""

//////////////////////////////////////////////////
////////////////////////////// FUNCIONES AUXILIARES
//////////////////////////////////////////////////

// funcion devuelve ruta de descarga
function obtenerRutaDescargas(){
    // const home = os.homedir();
    // return path.join(home,'Descargas');
    return 'public/descargas'
}





async function ConsultarOrganismos(){
    let organismos = await Organismos.findAll({ where: { FORMA: 'AUTOMATICA' } })
    return organismos
}






function primerDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}






function ultimoDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
}





//funcion devuelve string con 128 caracteres fijos
function a128Caracteres(str) {
  // Si es más largo, corta a 128
  str = str.slice(0, 128);
  // Si es más corto, rellena con espacios al final
  return str.padEnd(128, " ");
}





function a188Caracteres(str) {
  // Si es más largo, corta a 188
  str = str.slice(0, 188);
  // Si es más corto, rellena con espacios al final
  return str.padEnd(188, " ");
}





//////////////////////////////////////////////////
//////////////////////////////FUNCION GENERAR  DEBITO
//////////////////////////////////////////////////

const generarDebitos = async (codigo_debito, periodo, sigla)=>{

    GlobalenviosOrganismo= codigo_debito
    Globalperiodo=periodo
    Globalsigla= sigla
   
    console.log("DATOS DE ENTRADA : codigo debito "+ codigo_debito+" periodo :" +periodo )

    const [year, month, day] = periodo.split('-').map(Number)
    wfecha = new Date(year, month-1, day)
    
    
    ultimoDia = ultimoDiaDelMes(wfecha);
    console.log("ULTIMO DIA DEL MES ",ultimoDia.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))
    console.log(ultimoDia.toISOString().split('T')[0]) // 'YYYY-MM-DD'))
   


   // Array con Objeto de consulta Debitos
    let datos
    // Acumuladores de Monto Total Generado por Operatoria
    
    let totalFonavi= 0
    let totalPlanes = 0
    let totalOperatoria2=0

//////////////////////////////////////////////////
//////////////////////////////GENERAR DEBITOS FONAVI
//////////////////////////////////////////////////

    // consulta Vista EnvioDebitos
      const datosfonavi = await db_debitos.query(
        `SELECT * FROM VISTA_ENVIODEBITOS 
            WHERE COD_DEB = :codigoDebito
            AND LEN(NRO_AGENTE) >= 2
            AND FEC_ENVIO <= :ultimodiaSQL 
            ORDER BY NRO_AGENTE ASC`,
        {
          replacements: {
            codigoDebito: codigo_debito,
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
          },
          type: db_debitos.QueryTypes.SELECT
        }
      );

    //Mapeo Datos ViviendaFonavi
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
                      cantidad:   0,
                      FECHA_VTO:  item.FEC_VTO
                  }
          }
        )
  // respuesta de consulta.
    console.log(" CONSULTA FONAVI          [" + datosfonavi.length + "]     MONTO: " + totalFonavi.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

//////////////////////////////////////////////////
//////////////////////////////DEBITOS PLANES
//////////////////////////////////////////////////


// consulta Envio Planes
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
        }
      );

//Mapeo Datos Operatoria Planes 
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
                      cantidad:   0,  // ← contador de registros,
                      FECHA_VTO:  item.VTO_PLAN

        }
      }
    )
  // respuesta de la consulta Planes        
    console.log(" CONSULTA PLANES          [" + datos1.length + "]     MONTO: "+totalPlanes.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    //Agregar Elementos de consulta debitos Planes en array Datos
    datos.push(...datos1)


//////////////////////////////////////////////////
////////////////////////////// DEBITOS OPERATORIAS2
//////////////////////////////////////////////////

// consulta Operatorias2
   let datosOperatorias2 = await db_vistaDebitos.query(
    `EXEC obtenerDebitos @anio=:anio, @mes=:mes, @cod_deb=:codigoDebito`,
    {
        replacements: {
            codigoDebito: codigo_debito,
            anio: wfecha.getFullYear(),           // año (2025)
            mes:  wfecha.getMonth() + 1           // mes (1-12)
        },
        type: db_vistaDebitos.QueryTypes.SELECT
    }
);

// Mapeo de datos de Operatorias 2
    const datos2 = datosOperatorias2.map(item=>{
        totalOperatoria2 += item.imp_cuota

        const sucursal = item.agente_debito? item.agente_debito.slice(0, 4): 0
        const nroAgente = codigo_debito === "11"
            ? item.agente_debito.slice(4)
            : item.agente_debito;
        return{
                              
                FECHA:      wfecha.toISOString().split('T')[0],
                OPERATORIA: item.operatoria,
                COD:        item.codigo,
                COD_DEB:    codigo_debito,
                SIGLA:      sigla,
                SUCURSAL:   sucursal,
                NRO_AGENTE: item.agente_debito,
                DNI_DESC:   item.dni,
                APEYNOM:    item.nombre,                                
                MTO_CUO:    item.imp_cuota,                            
                cantidad:   1,  // ← contador de registros
                FECHA_VTO:  item.fecha
                        }

        })
    //respuesta de la consulta de debitos de Operatorias2
    console.log(" CONSULTA OPERATORIAS2    [" + datos2.length + "]     MONTO: " + totalOperatoria2.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    // agregar elemntos de la consulta de operatorias a array datos
    datos.push(...datos2) 

    const sinagrupar= datos    
    const MontoTotalSinAgrupar= totalFonavi+totalPlanes+totalOperatoria2
    
    console.log("-".repeat(68))
    console.log(" CANT REG SIN AGRUPAR    [" +datos.length+ "]     MONTO: " + MontoTotalSinAgrupar.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}) )   
       
return {MontoTotalSinAgrupar,sinagrupar}

}

//////////////////////////////////////////////////
//////////////////////////////AGRUPA POR CODIGO DEBITO
//////////////////////////////////////////////////

function agruparCodigoDebito(datos){
   
    console.log("\n datos sin agrupar: "+ JSON.stringify(datos?datos[0]:"vacio")+"\n" )
    const codigo_debito = datos[0]? datos[0].COD_DEB:""
    console.log(codigo_debito)
    if (['25','7','11','48','55','5','17'].includes(codigo_debito)) {

    const agrupados = datos.reduce((acc, item) => {
        
        // KEY TERNANIO SI CODIGO DEBITO ES 11 UTILIZA EL STRING COMPUESTO - SINO NRO AGENTE
        // const key = codigo_debito === '11' ? `${item.SUCURSAL}-${item.NRO_AGENTE}`:`${item.NRO_AGENTE}`;

        let key;

        if (codigo_debito === '11') {
          key = `${item.SUCURSAL}-${item.NRO_AGENTE}`;
        } else if (["5","25"].includes(codigo_debito )) {
          key = `${item.DNI_DESC}-${item.NRO_AGENTE}-${item.APEYNOM}`;
        } else {
          key = `${item.NRO_AGENTE}`;
        }

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
                cantidad:   0,
                FECHA_VTO:  item.FECHA_VTO
            };
        }

        acc[key].MTO_CUO += Number(item.MTO_CUO) || 0;
        acc[key].cantidad += 1;

        return acc;
    }, {});
    
    // AGREGA IMPORTE POR GASTO ADMINISTRATIVO $200 
    if (codigo_debito === '11') { Object.values(agrupados).forEach(item => item.MTO_CUO += 200); }
    if (codigo_debito === '48') { Object.values(agrupados).forEach(item => item.MTO_CUO += 500); }
    
    datos = Object.values(agrupados);
    }

//////////////////////////////////////////////////
////////////////////////////// CAMBIO DE MAPEO DE DATOS SEGUN ORGANISMO
//////////////////////////////////////////////////

 
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
                                    cantidad:   1,
                                    FECHA_VTO:  item.FECHA_VTO
                            }
                    }
                )
    }
    // AGREGA IMPORTE POR GASTO ADMINISTRATIVO $1 
    if (['34','37'].includes(datos[0]?.COD_DEB)) {

         Object.values(datos).forEach(item => {
            item.MTO_CUO += 1;
            });
    }
    console.log("=".repeat(68))
    console.log(" CANTIDAD DE REGISTROS AGRUPADOS    [ "+Object.keys(datos).length+"]" )

    let MontoTotalAgrupados=0
    Object.values(datos).forEach(item => {
            MontoTotalAgrupados+=item.MTO_CUO ;
            });
    console.log(MontoTotalAgrupados)        
    return {datos,MontoTotalAgrupados}
 
}



const consultarDebitos = async (req,res)=>{
    let [codigo_debito, sigla] = req.query.enviosOrganismo.split('|');
    let periodo =       req.query.enviosPeriodo
    
    let {sinagrupar,MontoTotalSinAgrupar} = await generarDebitos(codigo_debito,periodo,sigla)
    let {datos,MontoTotalAgrupados}=  agruparCodigoDebito(sinagrupar)

    globalDatosSinAgrup =   sinagrupar
    globalDatosAgrup    =   datos
  
   
    let grabados= await consultaGrabados()


        return res.render('main/enviodebitos', {
            pagina :    "ENVIO DEBITOS",
            datos:      datos,
            Organismos: await ConsultarOrganismos(),
            Reg_SinAgrup: sinagrupar.length,
            total_SinAgrup: MontoTotalSinAgrupar.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}),
            Total_Agrup: MontoTotalAgrupados.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}),
            Reg_Agrup:   datos.length,
            tablaAux :  grabados
            
            })

}




// const seleccionarGrabados= async (req,res)=>{
//     let [codigo_debito, sigla] = req.query.enviosOrganismo.split('|');
//     GlobalenviosOrganismo= codigo_debito
//     Globalsigla= sigla
//     console.log("selecciono "+ GlobalenviosOrganismo)
        
//         return res.render('main/enviodebitos', {
//                 pagina :    "ENVIO DEBITOS",
//                 Organismos: await ConsultarOrganismos(),
//                 tablaAux :  await consultaGrabados(),
//                 selecion: "COD DEB: " + GlobalenviosOrganismo + " - SIGLA: "+Globalsigla

//                 })

// }


const seleccionarGrabados = async (req, res) => {
  let [codigo_debito, sigla] = req.query.enviosOrganismo.split('|');
  GlobalenviosOrganismo = codigo_debito;
  Globalsigla = sigla;

  const Organismos = await ConsultarOrganismos();
  const tablaAux = await consultaGrabados();

  return res.render('main/enviodebitos', {
    pagina: "ENVIO DEBITOS",
    Organismos,
    tablaAux,
    selecion: `COD DEB: ${GlobalenviosOrganismo} - SIGLA: ${Globalsigla}`
  });
};





async function generarExcel (req,res){

    console.log(GlobalenviosOrganismo+Globalperiodo)

    //let {datos} = await generarDebitos(GlobalenviosOrganismo,Globalperiodo,Globalsigla)
   let datos = await DebitosTotales.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
   

    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos - "+Globalsigla);
    //crear columnas de la hoja1
    worksheet.columns = [
    { header: 'FECHA',      key: 'FECHA',width: 15, style: { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'center' } } },
    { header: 'OPERATORIA', key: 'OPERATORIA',width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'CODIGO',     key: 'COD',width: 10, style: { alignment: { horizontal: 'center' } }},
    { header: 'CODIGO DEBITO', key: 'COD_DEB',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SIGLA',      key: 'SIGLA',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SUCURSAL',   key: 'SUCURSAL',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'NRO AGENTE', key: 'NRO_AGENTE',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'DNI',        key: 'DNI_DESC',width: 15, style: { alignment: { horizontal: 'center' } }  },
    { header: 'APELLIDO Y NOMBRE', key: 'APEYNOM',width: 40 },
    { header: 'MONTO CUOTA', key: 'MTO_CUO',width: 15 ,style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },
    { header: 'CANT',       key: 'cantidad', style: { numFmt: '0', alignment: { horizontal: 'center' } } }
    ];

    //agregar Filas
    datos.forEach(item=>{   worksheet.addRow(item)  })
    //guardar archivo
    const ruta = path.join(obtenerRutaDescargas(),`Debitos ${Globalsigla}.xls`)
    await workbook.xlsx.writeFile(ruta);
    console.log(`excel generado: ${ruta}`)
    //generar archivo descargable en el Navegador web
    res.download(ruta, `Debitos ${Globalsigla} - ${Globalperiodo} .xls`,

            (err) => {
                if (err) {
                    console.error('Error al descargar el archivo:', err);
                    res.status(500).send('Hubo un problema al descargar el archivo');
                }
            })
}





async function generarExcelFormateado (req,res){

    //let {datos} = await generarDebitos(GlobalenviosOrganismo,Globalperiodo,Globalsigla)
   let Aux = await DebitosTotales.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
   let {datos} = agruparCodigoDebito(Aux)
   
    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos - "+Globalsigla);
    
    ///////////////////
    /////EXCEL FORMATO DIO / EDU
    //////////////////
    let codigoAuxiliar 

    if (['2'].includes(GlobalenviosOrganismo)){ codigoAuxiliar = '257'} 
    if (['8'].includes(GlobalenviosOrganismo)){ codigoAuxiliar = '4721'}
    if(['2','8'].includes(GlobalenviosOrganismo)){
        //crear columnas de la hoja1
        worksheet.columns = [
            { header: 'CODIGO',         key: 'CODAUX',      width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'DOCUMENTO',      key: 'DNI_DESC',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'SEXO',           key: 'SEXO',       width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'FECHA',          key: 'FECHA',       width: 15,  style: { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'center' } } },
            { header: 'IMPORTE',        key: 'MTO_CUO',     width: 15,  style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },  
            { header: 'NUMERO CREDITO', key: 'NRO_AGENTE',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'NUMERO CUOTA',   key: 'CUOTA',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
        ];
        // agregar filas con CODIGO fijo en 257
        datos.forEach(item => {
            worksheet.addRow({
                CODAUX: codigoAuxiliar, // valor fijo
                DNI_DESC: item.DNI_DESC,
                SEXO: " * ",
                FECHA: item.FECHA,
                MTO_CUO: item.MTO_CUO,
                NRO_AGENTE : item.NRO_AGENTE
            });
        });
    }

    ///////////////////
    /////EXCEL FORMATO CAP / SEN
    //////////////////

     if(['7','55'].includes(GlobalenviosOrganismo)){
        //crear columnas de la hoja1
        worksheet.columns = [
            { header: 'NRO AGENTE',         key: 'NRO_AGENTE',      width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'APELLIDO Y NOMBRE',  key: 'APEYNOM',width: 40 },
            { header: 'DNI',                key: 'DNI_DESC',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'MONTO',              key: 'MTO_CUO',     width: 15,  style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },
            
        ];
        // agregar filas 
        datos.forEach(item=>{ worksheet.addRow(item) })
        
    }
    if(!['7','55','2','8'].includes(GlobalenviosOrganismo)){
     //crear columnas de la hoja1
    worksheet.columns = [
    { header: 'FECHA',      key: 'FECHA',width: 15, style: { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'center' } } },
    { header: 'OPERATORIA', key: 'OPERATORIA',width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'CODIGO',     key: 'COD',width: 10, style: { alignment: { horizontal: 'center' } }},
    { header: 'CODIGO DEBITO', key: 'COD_DEB',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SIGLA',      key: 'SIGLA',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SUCURSAL',   key: 'SUCURSAL',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'NRO AGENTE', key: 'NRO_AGENTE',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'DNI',        key: 'DNI_DESC',width: 15, style: { alignment: { horizontal: 'center' } }  },
    { header: 'APELLIDO Y NOMBRE', key: 'APEYNOM',width: 40 },
    { header: 'MONTO CUOTA', key: 'MTO_CUO',width: 15 ,style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },
    { header: 'CANT',       key: 'cantidad', style: { numFmt: '0', alignment: { horizontal: 'center' } } }
    ];

    //agregar Filas
        datos.forEach(item=>{   worksheet.addRow(item)  })

    }
    //guardar archivo
    const ruta = path.join(obtenerRutaDescargas(),`Debitos ${Globalsigla}.xls`)
    await workbook.xlsx.writeFile(ruta);
    console.log(`excel generado: ${ruta}`)
    
    //generar archivo descargable en el Navegador web
    res.download(ruta, `Debitos ${Globalsigla} - ${Globalperiodo} .xls`,
        (err) => {
                if (err) {
                    console.error('Error al descargar el archivo:', err);
                    res.status(500).send('Hubo un problema al descargar el archivo');
                }
            })

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
 




async function generarDbf(req, res) {
    reportePDFBasico()
//     const campos = [
//     { name: 'FECHA', type: 'D' },                      // Fecha DBF nativa
//     { name: 'OPERATORIA', type: 'C', size: 20 },
//     { name: 'COD', type: 'N', size: 10 },
//     { name: 'COD_DEB', type: 'N', size: 10 },
//     { name: 'SIGLA', type: 'C', size: 10 },
//     { name: 'NRO_AGENTE', type: 'N', size: 12 },
//     { name: 'DNI_DESC', type: 'N', size: 12 },
//     { name: 'APEYNOM', type: 'C', size: 50 },
//     { name: 'MTO_CUO', type: 'N', size: 15, decs: 2 }, // 👈 corregido
//     { name: 'cantidad', type: 'N', size: 8 },
//     ];



//     const rutaArchivo = path.join(
//         obtenerRutaDescargas(),
//         `Debitos ${Globalsigla} - ${Globalperiodo}.dbf`
//     );

//     // ⚡ Si ya existe, lo sobrescribe
//     const dbf = await DBFFile.create(rutaArchivo, campos);
//     console.log(`Archivo DBF creado: ${dbf.path}`);

//     // Buscar datos
//     let Aux = await DebitosTotales.findAll({
//         where: { COD_DEB: GlobalenviosOrganismo }
//     });
//     let { datos } = agruparCodigoDebito(Aux);

//     // Transformar registros
//     const registros = datos.map(d => ({
//         FECHA:      new Date(d.FECHA), // ✅ se guarda como Date
//         OPERATORIA: String(d.OPERATORIA ?? ""),
//         COD:        Number(d.COD) || 0,
//         COD_DEB:    Number(d.COD_DEB) || 0,
//         SIGLA:      String(d.SIGLA ?? ""),
//         NRO_AGENTE: Number(d.NRO_AGENTE) || 0,
//         DNI_DESC:   Number(d.DNI_DESC) || 0,
//         APEYNOM:    String(d.APEYNOM ?? ""),
//         MTO_CUO:    Number(d.MTO_CUO) || 0,
//         cantidad:   Number(d.cantidad) || 0
//     }));

//     // Insertar filas
//     await dbf.append(registros);
//     console.log(`Se agregaron ${registros.length} registros`);

//     // Enviar archivo al cliente
//     if (res) {
//         res.download(rutaArchivo, `Debitos ${Globalsigla} - ${Globalperiodo}.dbf`);
//   }
}
 




async function generartxt(req, res) {
  try {
    
    let Aux = await DebitosTotales.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
    let {datos} = agruparCodigoDebito(Aux)
       
    let totalPesos=0

    datos.map(item   => {
                  totalPesos += item.MTO_CUO}
                )

    //let { datos, totalPesos } = await generarDebitos(GlobalenviosOrganismo, Globalperiodo, Globalsigla);
    console.log(totalPesos)
    
    // Fechas
    let wfecha = datos.length > 0 ? new Date(datos[0].FECHA) : null;
    let ultimoDia =ultimoDiaDelMes(wfecha)
    const mes = String(wfecha.getMonth() + 1).padStart(2, "0");
    const dia = String(wfecha.getDate()).padStart(2,"0")
    const diaFin = String(ultimoDia.getDate()).padStart(2, "0");

    let filas

    //////////////////////////////////////////////////
    ////////////////////////////// TXT BANCO NACION
    //////////////////////////////////////////////////

    if(["11"].includes(GlobalenviosOrganismo)){
        // Encabezado
        const encabezado = `1315504660048000PE${mes}01${wfecha.getFullYear()}${mes}${diaFin}REE`;

        filas= [a128Caracteres(encabezado) + "\n"];

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
                return a128Caracteres(fila+"0".repeat(9))+"\n";
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
    }   

    //////////////////////////////////////////////////
    ////////////////////////////// TXT BANCO SANTIAGO
    //////////////////////////////////////////////////

    if(["34","37"].includes(GlobalenviosOrganismo)){
        // Encabezado
        const montoRaw = totalPesos ?? 0;               // Si viene null/undefined → 0
        const totalPesosEntero = Math.round(Number(montoRaw) * 100); 
        const monto=  String(totalPesosEntero).padStart(15, "0")
        const cantidad = String(datos.length).padStart(8, "0");
        // Fechas
        const anio= String(wfecha.getFullYear())
        const mes = String(wfecha.getMonth() + 1).padStart(2, "0");
        const diaInicio= "01"
        const diaFin = String(ultimoDia.getDate()).padStart(2, "0");
        let tipoCuenta
        let encabezado 
        if(["34"].includes(GlobalenviosOrganismo)){
            encabezado= `0848001${cantidad}${monto}`+" ".repeat(157);
            tipoCuenta= "50001"
        }
        else{
            encabezado= `0849001${cantidad}${monto}`+" ".repeat(157);
            tipoCuenta= "30290"
        }

            filas = [a188Caracteres(encabezado) + "\n"];
            // Orden de campos
            const prefijo= anio+mes+diaInicio+(anio+mes+diaFin).repeat(2)+"0".repeat(22)+anio+mes

            const orden = ["MTO_CUO", "COD","NRO_AGENTE"];

            filas.push(
            ...datos.map(obj => {
                const valoresOrdenados = orden.map(k => {
                
                if (k === "MTO_CUO") {
                    const montoEntero = Math.round(Number(obj[k] ?? 0) * 100); // centavos
                    return String(montoEntero).padStart(14, "0");
                }
                if (k === "COD") {
                return String(obj[k] ?? "").padStart(7, "0") + tipoCuenta
                }
                
                if (k === "NRO_AGENTE") {
                    return String(obj[k] ?? "").padStart(17, "0");
                }
            
                return obj[k] ?? "";
                });

                const fila = prefijo + valoresOrdenados.join("")+" ".repeat(90)+"02"
                return a188Caracteres(fila+"\n");
            }))
     
        }

    //////////////////////////////////////////////////
    ////////////////////////////// TXT BANCO GALICIA
    //////////////////////////////////////////////////

    if(["48"].includes(GlobalenviosOrganismo)){
        const montoRaw = totalPesos ?? 0;               // Si viene null/undefined → 0
        const totalPesosEntero = Math.round(Number(montoRaw) * 100); 
        
        // Encabezado

        const tiporeg = "0001"
        const nroprest = "0037"
        const servicio = "C"
        const fechagen = datos[0].FECHA? new Date(datos[0].FECHA).toISOString().split("T")[0].replaceAll("-", ""): "";
        const idarchivo = "1"
        const origen = "EMPRESA"
        const importetotal = String(totalPesosEntero).padStart(14, "0")
        const cantreg = String(datos.length).padStart(7,"0")
        const espacios = " ".repeat(304)
        const encabezado = tiporeg+nroprest+servicio+fechagen+idarchivo+origen+importetotal+cantreg+espacios
        
        filas= [encabezado + "\n"];

        // body
        filas.push(
                  ...datos.map((obj, index) => {
                    const tiporeg   = "0370";
                    const idcliente = String(obj.COD ?? "").padStart(8, "0");
                    const espacios  = " ".repeat(14)
                    const cbu       = String(obj.NRO_AGENTE ?? "").padStart(26, "0");
                    const coutaipv  = "CUOTAIPV"
                    const fecha1er  = obj.FECHA_VTO? new Date(obj.FECHA_VTO).toISOString().split("T")[0].replaceAll("-", ""): "";
                    const importe   =     String(Math.round(Number(obj.MTO_CUO+25 ?? 0) * 100)).padStart(14, "0");
                    const fecha2do  = "0".repeat(8)
                    const importe2do  = "0".repeat(14)
                    const fecha3ro  = "0".repeat(8)
                    const importe3  = "0".repeat(14)
                    const monedafactura= "0"
                    const motivorechazo= " ".repeat(3)
                    const tipodocumente= "0".repeat(4)
                    const numerodocumento= "0".repeat(11)
                    const nuevaidcliente= " ".repeat(22)  
                    const nuevacbu= "0".repeat(26)
                    const importeminimo= "0".repeat(14)
                    const espacios1= " ".repeat(136)
                    const linea = tiporeg + idcliente + espacios + cbu+ coutaipv +fecha1er+importe + fecha2do+importe2do+fecha3ro+importe3+monedafactura+motivorechazo
                                  +tipodocumente+numerodocumento+ nuevaidcliente+ nuevacbu + importeminimo +espacios1 
                    return linea + "\n";
                  })
                )
              
        // Pie de Pagina
              const tiporeg2="0001"
              const nroprestacion= "0037"
              const espacios304 = " ".repeat(304)
              const Pie =tiporeg2+nroprestacion+servicio+espacios304+fechagen+"1"+origen+importetotal+cantreg+espacios304

              filas.push(Pie)
              }
    //     // Construimos ruta con nombre de archivo .txt
        const ruta = path.join(
            obtenerRutaDescargas(),
            `Debitos ${Globalsigla} - ${Globalperiodo}.txt`
        );

        let datosaux = datos.map(obj => {
        const plain = obj.get ? obj.get({ plain: true }) : obj;
        return Object.values(plain).map(v => String(v ?? "")).join("\t");
        }).join("\n");
        // Escribimos el archivo

        //await writeFile(ruta,'Hola','utf8');
        await writeFile(ruta, (filas?filas:datosaux), 'utf8');
        console.log(`Archivo creado exitosamente: ${ruta}`);
        res.download(ruta,`Debitos ${Globalsigla} - ${Globalperiodo}.txt`)

  } catch (err) {
        console.error('Error al escribir el archivo:', err);
  }
}
 




async function grabardatos(req, res) {
  console.log("boton grabar");

  const t = await db_debitos.transaction();

  try {
    let sinagrupar = globalDatosSinAgrup;

    if (!sinagrupar || sinagrupar.length === 0) {
      throw new Error("No se encontraron registros en generarDebitos");
    }

    const inicio = primerDiaDelMes(wfecha).toISOString().split('T')[0];
    const final  = ultimoDiaDelMes(wfecha).toISOString().split('T')[0];

    // DELETE
    await DebitosTotales.destroy({
      where: {
        COD_DEB: sinagrupar[0].COD_DEB,
        FECHA: {
          [Op.between]: [inicio, final]
        }
      },
    });

    // Fecha a grabar
    const hoy = wfecha.toISOString().split("T")[0];

    sinagrupar = sinagrupar.map(item => ({
      ...item,
      FECHA: hoy
    }));

    // INSERT
    await DebitosTotales.bulkCreate(sinagrupar, {
      transaction: t,
      validate: true
    });

    // COMMIT
    await t.commit();

    res.render("templates/mensaje", {
      pagina: "DEBITOS GRABADO EN BASE DE DATOS",
      mensaje: "¡ Operación realizada satisfactoriamente!",
      ruta: "/main/enviodebitos"
    });

  } catch (error) {
    // 🔴 ROLLBACK OBLIGATORIO
    await t.rollback();

    console.error("Error en grabardatos:", error);

    res.status(500).render("templates/mensaje", {
      pagina: "ERROR",
      mensaje: "Ocurrió un error al grabar los débitos",
      ruta: "/main/enviodebitos"
    });
  }
}





async function consultaGrabados(){
  return await DebitosTotales.findAll({
      attributes: [
        'FECHA',
        'SIGLA',
        [Sequelize.fn('COUNT', Sequelize.col('SIGLA')), 'REGISTOS'],
        [Sequelize.fn('SUM', Sequelize.col('MTO_CUO')), 'MONTO']
      ],
      group: ['SIGLA','FECHA'],
      order: [
          ['FECHA', 'ASC'],   // primero por fecha ascendente
          ['SIGLA', 'ASC']    // luego por sigla ascendente
          ],
      raw: true
    }
  );
}
 




async function cierreEjercicio(req,res) {
  try {
    const [result] = await db_debitos.query(`
      INSERT INTO Debitos.dbo.DEBITOS_TOTAL
          (fecha,tipo,cod,cod_deb,sigla,sucursal,nro_agente,cuil,dni_desc,
          apeynom,monto, plazo, pago, NRO)
      SELECT
          FECHA,
          LEFT(OPERATORIA, 10) AS tipo,          -- truncar a 10 chars
          TRY_CAST(COD AS INT) AS cod,           -- string a int
          TRY_CAST(COD_DEB AS INT) AS cod_deb,   -- string a int
          LEFT(SIGLA, 3) AS sigla,               -- truncar a 3 chars
          TRY_CAST(SUCURSAL AS INT) AS sucursal, -- string a inttotalPesos
          LEFT(NRO_AGENTE, 25) AS nro_agente,    -- truncar a 25 chars
          NULL AS cuil,                          -- no viene de Aux
          TRY_CAST(DNI_DESC AS INT) AS dni_desc, -- string a int
          LEFT(APEYNOM, 35) AS apeynom,          -- truncar a 35 chars
          MTO_CUO AS monto,                      -- decimal ok
          TRY_CAST(cantidad AS INT) AS plazo,    -- mapear cantidad a plazo
          NULL AS pago,                          -- no viene de Aux
          0 AS NRO                               -- valor por defecto
      FROM Debitos.dbo.DebitosTotalesAux;
    `);
     // Paso 3: responder al cliente
    res.render("templates/mensaje", {
      pagina: "DEBITOS GRABADO EN BASE DE DATOS",
      mensaje: "¡ Operacion Realizada Satisfactoriamente!",
      ruta: "/main/enviodebitos"
    })
   
  } catch (err) {
    console.error("Error en cierreEjercicio:", err);

  }
}


async function NotasPDF (req, res) {
    try {
      // Obtener datos
      const Aux = await DebitosTotales.findAll({ 
        where: { COD_DEB: GlobalenviosOrganismo } 
      });
      let datosNota = await Organismos.findAll({where: { COD_DEB: GlobalenviosOrganismo }
      })
      console.log(datosNota)
      const { datos } = agruparCodigoDebito(Aux);

      let totalPesos=0

      datos.map(item   => {
                    totalPesos += item.MTO_CUO}
                  )
      
      if (!Aux || Aux.length === 0) {
        return res.status(404).send("No se encontraron datos");
      }
      const fecha = new Date(Aux[0].FECHA)

      
      // 1️⃣ Definir fuentes
      const fonts = {
        Helvetica: {
          normal: "Helvetica",
          bold: "Helvetica-Bold",
          italics: "Helvetica-Oblique",
          bolditalics: "Helvetica-BoldOblique",
        },
      };

      const printer = new PdfPrinter(fonts);

      // 2️⃣ Ruta del logotipo (asegurate que el archivo exista)
      const logoPath = path.join(process.cwd(), "public/img", "logo2.png");

      // 3️⃣ Definir el contenido del PDF
      const docDefinition = {
        pageMargins: [40, 100, 40, 60], // Izq, Top, Der, Abajo

      header: {
        margin:   [0, 20, 0, 0],
        columns:  [
                    {
                      width: "*", // ancho flexible
                      stack: [
                              {
                                image: logoPath, // 👈 ahora es Base64
                                width: 100,
                                alignment: "center",
                          
                              },
                              { 
                          
                                text: "\nInstituto Provincial de la Vivienda - Catamarca\n\n_______________________________________________",
                                alignment: "center",
                                bold: true,
                                fontSize: 12,
                                margin: [0, 0, 0, 0],

                              },
                      ],
                    },
                  ],
      },

      content: [
                  { text: `\n\n San Fernando del Valle de Catamarca , ${fecha.toLocaleDateString("es-AR",  {
                                                                                            day: "numeric",
                                                                                            month: "long",
                                                                                            year: "numeric"
                                                                                            })} \n\n`, alignment: "right" },

                  {
                  text: `\n\n ${datosNota[0].cargo}\n\n ${datosNota[0].responsable}\n\n Su Despacho:`,
                  bold: true,
                  margin: [0, 20, 0, 20],
                  },

                  {
                  text: "Me dirijo a Ud. a los efectos de remitirle el listado de los empleados públicos a los",
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: [60, 35, 0, 10], // sangría izquierda de 40pt, margen inferior 10pt
                  alignment: "justify"
                  },
                  {
                  text: "que se les deberá descontar de su sueldo el monto correspondiente a la cuota de su vivienda.\n\n",
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: [0, 0, 0, 10],
                  alignment: "justify"
                  },
                  
                  {
                  text: ` Periodo : ${fecha.toLocaleDateString("es-AR",  {
                                                                                                        
                                                                                                        month: "long",
                                                                                                        year: "numeric"
                                                                                                        })}\n Cantidad de Agentes a Descontar: ${datos.length}\n Monto Total a Descontar: ${totalPesos.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2})}`,
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: [0, 20, 0, 10],
                  alignment: "left"
                  },
                  {
                  text: "Sin otro particular saludo a Ud. atentamente\n\n",
                  fontSize: 12,
                  lineHeight: 1.5,
                  margin: [0, 20, 0, 10],
                  alignment: "right"
                  },
    
              ],

      defaultStyle: {
                  font: "Helvetica",
                  },
      };

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      // Configurar headers para descarga
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Reporte_${timestamp}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Pipe directamente a la respuesta
      pdfDoc.pipe(res);
      pdfDoc.end();

      // Esperar a que termine de generarse el PDF
      await new Promise((resolve, reject) => {
        pdfDoc.on('end', () => {
          console.log("PDF generado exitosamente");
          resolve();
        });
        pdfDoc.on('error', (error) => {
          console.error("Error al generar PDF:", error);
          reject(error);
        });
      });
      
  } catch (error) {
      console.error("Error al generar PDF:", error);
        if (!res.headersSent) {
          return res.status(500).send("Error interno del servidor");
        }
    }
}








async function reportePDFBasico(req, res) {
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  const printer = new PdfPrinter(fonts);
  
  try {
    // Obtener datos
    const Aux = await DebitosTotales.findAll({ 
      where: { COD_DEB: GlobalenviosOrganismo } 
    });
    
    if (!Aux || Aux.length === 0) {
      return res.status(404).send("No se encontraron datos");
    }

    const { datos } = agruparCodigoDebito(Aux);

    let totalPesos=0

    datos.map(item   => {
                  totalPesos += item.MTO_CUO}
                )
    

    if (!datos || datos.length === 0) {
      return res.status(404).send("No hay datos válidos");
    }

    // Encabezados y datos simples
    const encabezados = ["FECHA","OPERATORIA","COD","COD_DEB","SIGLA","SUCURSAL","NRO_AGENTE","DNI_DESC","APEYNOM","MTO_CUO"];
   
    const cuerpoTabla = datos.map(fila => 
      encabezados.map(encabezado => fila[encabezado]?.toString() || '')
    );

    const docDefinition = {
      content: [
        { 
          text: `DEBITOS IPV  `, 
          style: 'header' 
        },
        { 
          text: `ORGANISMO :${datos[0].SIGLA} FECHA: ${datos[0].FECHA}`, 
          style: 'subheader' 
        },
        '\n',
        {
          table: {
            headerRows: 1,
            widths: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', '*', 'auto'],
            body: [
              encabezados.map(encabezado => ({ text: encabezado, style: 'tableHeader' })),
              ...cuerpoTabla
            ]
          }
        },"\n\n",
        {text: `Registros: ${datos.length} - Totales: ${totalPesos.toLocaleString('es-AR', { 
        style: 'currency', 
        currency: 'ARS', 
        minimumFractionDigits: 2,
        
        })}`,
        style: 'totalLine',
        fontSize: 18,
        alignment: 'right', 
        bold: true

        }
      ],
      styles: {
        header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 10, alignment: 'center', margin: [0, 0, 0, 10] },
        tableHeader: { bold: true, fontSize: 10, fillColor: '#eeeeee' }
      },
      defaultStyle: { fontSize: 9, font: 'Helvetica' },
      pageOrientation: 'landscape'
    ,
    
      // 👇 PIE DE PÁGINA
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            { 
              text: `INSTITUTO PROVINCIAL DE LA VIVIENDA - CATAMARCA - ORGANISMO: ${datos[0].SIGLA} PERIODO : ${datos[0].FECHA}`, 
              alignment: 'left', 
              fontSize: 8, 
              margin: [20, 0, 0, 0] ,
              bold: true
            },
            { 
              text: `Numero de Registros: ${datos.length} - TOTALES: ${totalPesos.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2})} //  Página ${currentPage} de ${pageCount}`, 
              alignment: 'right', 
              fontSize: 8, 
              margin: [0, 0, 20, 0] ,
              bold: true
            }
          ]
        };
      }
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
    // Configurar headers para descarga
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Reporte_${timestamp}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Pipe directamente a la respuesta
    pdfDoc.pipe(res);
    pdfDoc.end();

    // Esperar a que termine de generarse el PDF
    await new Promise((resolve, reject) => {
      pdfDoc.on('end', () => {
        console.log("PDF generado exitosamente");
        resolve();
      });
      pdfDoc.on('error', (error) => {
        console.error("Error al generar PDF:", error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error("Error al generar PDF:", error);
    if (!res.headersSent) {
      return res.status(500).send("Error interno del servidor");
    }
  }
}



const paginainicio= async (req,res)=> {
    return res.render('main/index', {
         pagina : "GESTION DEBITOS",

         })

}
 




const debitosindex = async (req,res)=>{

    let Organismos = await ConsultarOrganismos();
    let grabados= await consultaGrabados()
    return res.render('main/enviodebitos', {
        pagina : "ENVIO DEBITOS",
        datos: null,
        Organismos,
        tablaAux : grabados
        })

}

export {
    paginainicio,
    generarExcel,
    debitosindex,
    generarDebitos,
    generartxt,
    consultarDebitos,
    generarDbf,
    grabardatos,
    cierreEjercicio,
    seleccionarGrabados,
    generarExcelFormateado,
    reportePDFBasico,
    NotasPDF

}
