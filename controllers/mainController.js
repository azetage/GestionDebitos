import fs from 'fs';
import readline from 'readline'
import ExcelJS from 'exceljs';
import { db_debitos,db_vistaDebitos } from '../config/db.js';
import path from 'path';
import Organismos from '../models/Organismos.js';
import DebitosTotalesAux from '../models/DebitosTotalesAux.js';
import { DBFFile } from 'dbffile';
import { writeFile } from 'fs/promises';
import { BIGINT, INTEGER, NUMBER, Op, Sequelize} from "sequelize";
import PdfPrinter from 'pdfmake';
import axios from "axios";
import { PDFDocument } from "pdf-lib";





//////////////////////////////////////////////////
////////////////////////////// VARIABLES GLOBALES
//////////////////////////////////////////////////

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
    let organismos = await Organismos.findAll({
      where: { FORMA: 'AUTOMATICA' },
      order: [['REGISTRA', 'ASC']]
    })
    
    
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
//////////////////////////////FUNCIONES  
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
////////////////////////////// DEBITOS FONAVI
// //////////////////////////////////////////////////
// `SELECT * FROM VISTA_ENVIODEBITOS 
//             WHERE COD_DEB = :codigoDebito
//             AND LEN(NRO_AGENTE) > 1
//             AND FEC_ENVIO <= :ultimodiaSQL 
//             ORDER BY NRO_AGENTE ASC`
    // consulta Vista EnvioDebitos
      const datosfonavi = await db_debitos.query(
      `SELECT * FROM VISTA_ENVIODEBITOS 
             WHERE COD_DEB = :codigoDebito
             AND LEN(NRO_AGENTE) > 1
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
                      CUIL:       item.CUIL ? item.CUIL:"0",
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
        --AND CONF_PLAN <= :ultimodiaSQL
        --AND VTO_PLAN >=  :fechaSQL
       -- ORDER BY N_TARJETA ASC`,
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
                      CUIL:       item.CUIL ? item.CUIL:"0",
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
        let nro_agente
        let sucursal = 0

        if(codigo_debito==11){
          sucursal = Number(item.agente_debito? item.agente_debito.slice(0, 4): 0)
          nro_agente = Number(item.agente_debito.slice(4))
        }
        else{
          nro_agente =  item.agente_debito
          sucursal =    item.sucursal
        }
        return{
                              
                FECHA:      wfecha.toISOString().split('T')[0],
                OPERATORIA: item.operatoria,
                COD:        item.codigo,
                COD_DEB:    codigo_debito,
                SIGLA:      sigla,
                SUCURSAL:   sucursal,
                NRO_AGENTE: nro_agente,
                DNI_DESC:   item.dni,
                CUIL:       item.CUIL ? item.CUIL:"0",
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

   datos.forEach(item => {
    item.NRO_AGENTE = Number(item.NRO_AGENTE);
    item.COD        = Number(item.COD);
    item.COD_DEB    = Number(item.COD_DEB);

    item.CUIL       = item.CUIL ? Number(item.CUIL) : null;
    item.DNI_DESC   = item.DNI_DESC ? Number(item.DNI_DESC) : null;

    const monto = parseFloat(item.MTO_CUO);
    item.MTO_CUO = isNaN(monto) ? 0 : Number(monto.toFixed(2));
});

const agentes = datos.map(d => d.NRO_AGENTE);

const resultados = await db_debitos.query(
  `SELECT nro_agente, cuil
   FROM Debitos.dbo.DEBITOS_TOTAL
   WHERE CAST(nro_agente AS BIGINT) IN (:agentes)
   AND cod_deb = :codigoDebito`,
  {
    replacements: { agentes, codigoDebito: codigo_debito },
    type: db_debitos.QueryTypes.SELECT
  }
);

   const mapaCuil = {};
   resultados.forEach(r => {
   mapaCuil[r.nro_agente] = r.cuil;
 });
datos = datos.map(item => ({
  ...item,
  CUIL: mapaCuil[item.NRO_AGENTE] || null
}));

    const sinagrupar= datos    
    const MontoTotalSinAgrupar= totalFonavi+totalPlanes+totalOperatoria2
    
    console.log("-".repeat(68))
    console.log(" CANT REG SIN AGRUPAR    [" +datos.length+ "]     MONTO: " + MontoTotalSinAgrupar.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}) )   
       
return {MontoTotalSinAgrupar,sinagrupar}

}

////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////AGRUPA POR CODIGO DEBITO
////////////////////////////////////////////////////////////////////////////////////////////////////

function agruparPorNroAgente(datos){
   
    console.log("\n datos sin agrupar: "+ JSON.stringify(datos?datos[0]:"vacio")+"\n" )
    const codigo_debito = datos[0]? datos[0].COD_DEB:""
    console.log(codigo_debito)
    if (['25','7','11','48','55','5','17'].includes(codigo_debito)) {

    const agrupados = datos.reduce((acc, item) => {
                
        let key;

        if (codigo_debito === '11') {
           key = `${item.NRO_AGENTE}`;
        } 
        else if (["25"].includes(codigo_debito )) {
            key = `${item.DNI_DESC}-${item.NRO_AGENTE}-${item.APEYNOM}`;
        }
        // else if (["17"].includes(codigo_debito )) {
        //     key = item.CUIL ? `${item.CUIL}`:`${item.NRO_AGENTE}`;
        // }  

        
        else {
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
                CUIL:       item.CUIL,
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
    // AGREGA IMPORTE POR GASTO ADMINISTRATIVO $500 
    if (codigo_debito === '48') { Object.values(agrupados).forEach(item => item.MTO_CUO += 500); }
    
    datos = Object.values(agrupados);
    }

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////// CAMBIO DE MAPEO DE DATOS SEGUN ORGANISMO
////////////////////////////////////////////////////////////////////////////////////////////////////

 
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
                                    CUIL:       item.CUIL,
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
    let {datos,MontoTotalAgrupados}=  agruparPorNroAgente(sinagrupar)

    globalDatosSinAgrup =   sinagrupar
    globalDatosAgrup    =   datos

    console.log("FUNCION CONSULTA DEBITOS")
    console.log(datos[0])
   
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
   let datos = await DebitosTotalesAux.findAll({
    where: { COD_DEB: GlobalenviosOrganismo }
});

datos.forEach(item => {
    item.NRO_AGENTE = Number(item.NRO_AGENTE);
    item.COD        = Number(item.COD);
    item.COD_DEB    = Number(item.COD_DEB);

    item.CUIL       = item.CUIL ? Number(item.CUIL) : null;
    item.DNI_DESC   = item.DNI_DESC ? Number(item.DNI_DESC) : null;

    const monto = parseFloat(item.MTO_CUO);
    item.MTO_CUO = isNaN(monto) ? 0 : Number(monto.toFixed(2));
});


    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos - "+Globalsigla);
    //crear columnas de la hoja1
    worksheet.columns = [
    { header: 'FECHA',      key: 'FECHA',width: 15, style: { numFmt: 'dd/mm/yyyy', alignment: { horizontal: 'center' } } },
    { header: 'OPERATORIA', key: 'OPERATORIA',width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'CODIGO',     key: 'COD',width: 10, style: { numFmt: '0',alignment: { horizontal: 'center' } }},
    { header: 'CODIGO DEBITO', key: 'COD_DEB',width: 10,style: {numFmt: '0', alignment: { horizontal: 'center' } }  },
    { header: 'SIGLA',      key: 'SIGLA',width: 10,style: { alignment: { horizontal: 'center' } }  },
    { header: 'SUCURSAL',   key: 'SUCURSAL',width: 10,style: { numFmt: '0',alignment: { horizontal: 'center' } }  },
    { header: 'NRO AGENTE', key: 'NRO_AGENTE',width: 10,style: {numFmt: '0', alignment: { horizontal: 'center' } }  },
    { header: 'DNI',        key: 'DNI_DESC',width: 15, style: { numFmt: '0',alignment: { horizontal: 'center' } }  },
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
    
   let Aux = await DebitosTotalesAux.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
   let {datos} = agruparPorNroAgente(Aux)
   console.log(datos[0])
   
    //crear archivo excel
    const workbook= new ExcelJS.Workbook();
    const worksheet= workbook.addWorksheet("Debitos - "+Globalsigla);
    
    /////////////////////////////////////////////////////////////////////
    /////     EXCEL FORMATO UNCA
    /////////////////////////////////////////////////////////////////////

    if(['5'].includes(GlobalenviosOrganismo)){
        //crear columnas de la hoja1
        worksheet.columns = [
            { header: 'numero legajo',    key: 'NRO_AGENTE',      width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: '',                 key: 'DNI_DESC',        width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'apellido y nombre',key: 'APEYNOM',         width: 45,  style: { alignment: { horizontal: 'left' } }  },
            { header: 'importe',          key: 'MTO_CUO',         width: 15,  style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },  
            ];

        // agregar filas con CODIGO fijo en 257
      datos.forEach(item => {
        const fecha = new Date(item.FECHA);
        
        const periodo = (fecha.getMonth() +2) + '' + fecha.getFullYear();

        worksheet.addRow({
            NRO_AGENTE: item.NRO_AGENTE,
            DNI_DESC: "",
            SEXO: " * ",
            APEYNOM: item.APEYNOM,
            MTO_CUO: item.MTO_CUO,
        });
    });
    }



    
    /////////////////////////////////////////////////////////////////////
    /////     EXCEL FORMATO DIO / EDU
    /////////////////////////////////////////////////////////////////////
    let codigoAuxiliar 

    if (['2'].includes(GlobalenviosOrganismo)){ codigoAuxiliar = '257'} 
    if (['8'].includes(GlobalenviosOrganismo)){ codigoAuxiliar = '4721'}
    
    if(['2','8'].includes(GlobalenviosOrganismo)){
        //crear columnas de la hoja1
        worksheet.columns = [
            { header: 'CODIGO',         key: 'CODAUX',      width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'DOCUMENTO',      key: 'DNI_DESC',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'SEXO',           key: 'SEXO',       width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'FECHA',          key: 'FECHA',       width: 15,  style: { numFmt: 'mm/yyyy', alignment: { horizontal: 'center' } } },
            { header: 'IMPORTE',        key: 'MTO_CUO',     width: 15,  style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },  
            { header: 'NUMERO CREDITO', key: 'CODIGO',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'NUMERO CUOTA',   key: 'CUOTA',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
        ];
        // agregar filas con CODIGO fijo en 257
      datos.forEach(item => {
        const fecha = new Date(item.FECHA);
        
        const periodo = (fecha.getMonth() +2) + '' + fecha.getFullYear();

        worksheet.addRow({
            CODAUX: codigoAuxiliar,
            DNI_DESC: item.DNI_DESC,
            SEXO: " * ",
            FECHA: periodo,
            MTO_CUO: item.MTO_CUO,
            CODIGO: item.COD
        });
    });
    }

    /////////////////////////////////////////////////////////////////////
    /////EXCEL FORMATO CAP / SEN
    /////////////////////////////////////////////////////////////////////

     if(['7','55'].includes(GlobalenviosOrganismo)){
       let label=""
       const fecha = new Date(datos[0].FECHA);
        const periodo = (fecha.getMonth() + 2) + '/' + fecha.getFullYear();
      if(['7'].includes(GlobalenviosOrganismo)){
          label= "Mun. Capital"
      }else if (['55'].includes(GlobalenviosOrganismo)){
          label= "Camara Senadores"
      }

        //crear columnas de la hoja1
        worksheet.columns = [
            { header: 'Nº Agente',          key: 'NRO_AGENTE',      width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'Nombre y Apellido',  key: 'APEYNOM',width: 40 },
            { header: 'Nº Doc',             key: 'DNI_DESC',    width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: 'Monto Cuota',        key: 'MTO_CUO',     width: 15,  style: { numFmt: '"$"#,##0.00', alignment: { horizontal: 'right' } } },
            
        ];

        worksheet.insertRow(1, []);
        worksheet.insertRow(2, []);
        worksheet.insertRow(3, []);
        worksheet.insertRow(4, ['Instituto Provincial de la Vivienda - Catamarca']);
        worksheet.mergeCells('A4:D4');
        worksheet.getCell('A4').font = { bold: true, size: 14 };
        worksheet.getCell('A4').alignment = { horizontal: 'center' };
        worksheet.insertRow(5, []);
        worksheet.insertRow(6, []);
        worksheet.insertRow(7, [`DEBITOS ENVIADOS EN EL PERIODO: ${periodo}`]);
        worksheet.mergeCells('A7:D7');
        worksheet.getCell('A7').font = { bold: false, size: 14 };
        worksheet.getCell('A7').alignment = { horizontal: 'center' };
        worksheet.insertRow(8, []); // fila vacía
        worksheet.insertRow(9, []); // fila vacía
        worksheet.insertRow(10, [label]);
        worksheet.mergeCells('A10:D10');
        worksheet.getCell('A10').font = { bold: true, size: 10 };
        worksheet.getCell('A10').alignment = { horizontal: 'center' };
        worksheet.insertRow(11, []); // fila vacía

        
        

        let total = 0;
        // agregar filas
        datos.forEach(item => { 
          total += item.MTO_CUO;
          worksheet.addRow(item);
        });

        // calcular última fila (dejando una fila en blanco antes del total)
        const ultimaFila = worksheet.lastRow.number + 2;

        // insertar fila vacía
        worksheet.insertRow(ultimaFila, []);

        // 🔹 TEXTO "TOTAL" (columnas A a C combinadas)
        worksheet.mergeCells(`A${ultimaFila}:C${ultimaFila}`);

        const labelCell = worksheet.getCell(`A${ultimaFila}`);
        labelCell.value = `Cantidad de Registros: ${datos.length}  Monto Total:`;
        labelCell.font = { bold: true, size: 10 };
        labelCell.alignment = { horizontal: 'center' };

        // 🔹 VALOR NUMÉRICO (columna D)
        const totalCell = worksheet.getCell(`D${ultimaFila}`);
        totalCell.value = total;
        totalCell.font = { bold: false };
        totalCell.alignment = { horizontal: 'right' };

        // 💰 FORMATO MONEDA ARGENTINO
        totalCell.numFmt = '"$"#.##0,00';

        // (opcional) línea superior tipo reporte
        totalCell.border = {
          top: { style: 'thin' }
        };
        labelCell.border = {
          top: { style: 'thin' }
        };

        console.log(total);
      }
    /////////////////////////////////////////////////////////////////////
    /////EXCEL FORMATO DIPUTADOS
    /////////////////////////////////////////////////////////////////////

     if(['25'].includes(GlobalenviosOrganismo)){
      datos.forEach(item => {
        item.MTO_CUO = Math.round(item.MTO_CUO * 100);
      });

      let label="Camara de Diputados"
      
      const [anio, mes, dia] = datos[0].FECHA.split('-');
      const fecha= new Date(anio, mes - 1, dia);

      const periodo = `${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
     
      const cod = "10"

        //crear columnas de la hoja1
        worksheet.columns = [
            { header: '',        key: 'NRO_AGENTE',      width: 10,  style: { alignment: { horizontal: 'center' } }  },
            { header: '',        key: 'codaux',          width: 15 },
            { header: '',        key: 'FECHA',           width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: '',        key: 'cod',             width: 15,  style: { alignment: { horizontal: 'center' } }  },
            { header: '',        key: 'MTO_CUO',         width: 15,  style: { alignment: { horizontal: 'right' } } },
            
        ];

        worksheet.insertRow(1, []);
        worksheet.insertRow(2, []);
        worksheet.insertRow(3, []);
        worksheet.insertRow(4, [label]);
        worksheet.mergeCells('A4:D4');
        worksheet.getCell('A4').font = { bold: false, size: 14 };
        worksheet.getCell('A4').alignment = { horizontal: 'center' };
        worksheet.insertRow(5, []);
        worksheet.insertRow(6, []);
        worksheet.insertRow(7, [`LISTADO DE ENVIO DE DEBITOS`]);
        worksheet.mergeCells('A7:D7');
        worksheet.getCell('A7').font = { bold: true, size: 14 };
        worksheet.getCell('A7').alignment = { horizontal: 'center' };
        worksheet.insertRow(8, []); // fila vacía
        worksheet.insertRow(9, []); // fila vacía
        worksheet.insertRow(10, [label +` ${periodo}`]);
        worksheet.mergeCells('A10:D10');
        worksheet.getCell('A10').font = { bold: true, size: 10 };
        worksheet.getCell('A10').alignment = { horizontal: 'center' };
        worksheet.insertRow(11, []); // fila vacía

        
        
        
        // agregar filas 
        datos.forEach(item=>{  
           worksheet.addRow({
            NRO_AGENTE: item.NRO_AGENTE,
            codaux: "5257",
            FECHA: fecha,
            MTO_CUO: item.MTO_CUO,
            cod: "10"
        });
        })
        
    }
 /////////////////////////////////////////////////////////////////////
 /////SI NO SON ESTOS CODIGOS DE DEBITO NO GENERA EL EXCEL
 /////////////////////////////////////////////////////////////////////

    if(!['11','7','55','2','8',"5",'25'].includes(GlobalenviosOrganismo)){
     return res.render("templates/mensaje", {
      pagina: "DEBITOS",
      mensaje: "¡EL ORGANISMO SELECIONADO NO GENERA ARCHIVO FORMATO EXCEL!",
      ruta: "/main/enviodebitos"
    });
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
  try {
    if (['17'].includes(GlobalenviosOrganismo)) {
      console.log("generarDBF");

      const campos = [
        { name: 'NRO_AGENTE', type: 'C', size: 11 },
        { name: 'CUIL',       type: 'C', size: 11 },
        { name: 'NOMBRE',     type: 'C', size: 30 },

        { name: 'DESCUENTO',  type: 'N', size: 16, decs: 2 },
        { name: 'DESCONTADO', type: 'N', size: 16, decs: 2 },
        { name: 'DISPONIBLE', type: 'N', size: 16, decs: 2 },

        { name: 'CODIGO',     type: 'N', size: 3 },
        { name: 'MES',        type: 'N', size: 2 },
        { name: 'ANIO',       type: 'N', size: 4 },

        
      ];

      // Nombre único
      const nombreArchivo = `Debitos-${Globalsigla}-${Globalperiodo}-${Date.now()}.dbf`;

      const rutaArchivo = path.join(
        obtenerRutaDescargas(),
        nombreArchivo
      );

      // Borrar si existe
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
      }

      // Crear DBF
      const dbf = await DBFFile.create(rutaArchivo, campos);
      console.log(`Archivo DBF creado: ${rutaArchivo}`);

      // Obtener datos
      const aux = await DebitosTotalesAux.findAll({
        where: { COD_DEB: GlobalenviosOrganismo },
        raw: true
      });

      const { datos } = agruparPorNroAgente(aux);

      if (!datos || datos.length === 0) {
        return res.status(404).send("No hay datos para generar el DBF");
      }

      // Mapear datos correctamente
      const registros = datos.map(d => {
        const fecha = d.FECHA ? new Date(d.FECHA) : null;

        return {
          NRO_AGENTE: String(d.NRO_AGENTE ?? ""),
          CUIL:       String(d.CUIL ?? ""),
          NOMBRE:     String(d.APEYNOM ?? ""),

          DESCUENTO:  Number(d.MTO_CUO) || 0,
          DESCONTADO: null,
          DISPONIBLE: null,

          CODIGO:     257,

          MES:  fecha ? fecha.getMonth() + 2 : 0,
          ANIO: fecha ? fecha.getFullYear() : 0,

        };
      });

      // Insertar registros
      await dbf.appendRecords(registros);
      console.log(`Se agregaron ${registros.length} registros`);

      // Headers descarga
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${nombreArchivo}"`
      );

      // Descargar archivo
      res.download(rutaArchivo, nombreArchivo, (err) => {
        // Eliminar archivo temporal
        fs.unlink(rutaArchivo, () => {});
        if (err) console.error(err);
      });

    }else {
      return res.render("templates/mensaje", {
      pagina: "DEBITOS",
      mensaje: "¡EL ORGANISMO SELECIONADO NO GENERA ARCHIVO FORMATO DBF!",
      ruta: "/main/enviodebitos"
    })}
  
  } catch (error) {
    console.error("Error al generar DBF:", error);
    return res.status(500).send("Error interno al generar el DBF");
  }
}

async function generartxt(req, res) {
  try {
    if (['48','34','37','11','25',].includes(GlobalenviosOrganismo)) {
    let Aux = await DebitosTotalesAux.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
    let {datos} = agruparPorNroAgente(Aux)
    let totalPesos=0

    datos.map(item   => {
                  totalPesos += item.MTO_CUO}
                )

    console.log(totalPesos)
    
    // Fechas
    let wfecha = datos.length > 0 ? new Date(datos[0].FECHA) : null;
    let ultimoDia =ultimoDiaDelMes(wfecha)
    const anio =String(wfecha.getFullYear())
    const mes = String(wfecha.getMonth() + 2).padStart(2, "0");
    const dia = String(wfecha.getDate()).padStart(2,"0")
    const diaFin = String(ultimoDia.getDate()).padStart(2, "0");

    let filas = []



    //////////////////////////////////////////////////
    ////////////////////////////// TXT CAMARA DIPUTADOS
    //////////////////////////////////////////////////
    if(["25"].includes(GlobalenviosOrganismo)){
      filas.push(
                  ...datos.map((obj, index) => {
                    const NRO_AGENTE    = obj.NRO_AGENTE.padStart(11, "0")
                    const CODAUX        = 5257
                    const periodo       = `01${mes}${anio}`
                    const codigo        = "10    "
                    const monto         = String(Math.round(Number(obj.MTO_CUO ?? 0) * 100)).padStart(12, "0");
                    const linea         = NRO_AGENTE +CODAUX+periodo+codigo+monto+"0000000"   
                    return linea + "\n";
                  })
                )
    }


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
  }
  else{
     return res.render("templates/mensaje", {
      pagina: "DEBITOS",
      mensaje: "¡EL ORGANISMO SELECIONADO NO GENERA ARCHIVO FORMATO DBF!",
      ruta: "/main/enviodebitos"
    })
  }
  } catch (err) {
        console.error('Error al escribir el archivo:', err);
  }
}
 




async function grabardatos(req, res) {
  console.log("boton grabar");
  
  const t = await db_debitos.transaction();

  try {
    let sinagrupar = globalDatosSinAgrup;

    if(!sinagrupar || sinagrupar.length === 0) {
      throw new Error("No se encontraron registros en generarDebitos");
      }

    const inicio = primerDiaDelMes(wfecha).toISOString().split('T')[0];
    const final  = ultimoDiaDelMes(wfecha).toISOString().split('T')[0];

    // DELETE
    await DebitosTotalesAux.destroy({
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
    await DebitosTotalesAux.bulkCreate(sinagrupar, {
      transaction: t,
      validate: true
    });

    await db_debitos.query( `EXEC dbo.CargarCuil`,
      {
        transaction: t,
        type: db_debitos.QueryTypes.SELECT
      }
    );


    // COMMIT
    await t.commit();

    res.render("templates/mensaje", {
      pagina: "DEBITOS GRABADO EN BASE DE DATOS",
      mensaje: "¡ Operación realizada satisfactoriamente!",
      ruta: "/main/enviodebitos"
    });

  } catch (error) {
    // ROLLBACK OBLIGATORIO
    await t.rollback();

    console.error("Error en grabardatos:", error);

    res.status(500).render("templates/mensaje", {
      pagina: "ERROR",
      mensaje: "Ocurrió un error al grabar los débitos",
      ruta: "/main/enviodebitos"
    });
  }
}



function guardarCuil(req,res){
  const id = req.body.id
  const cuil = req.body.cuil
  
  
  
  
  console.log(id +"-"+ cuil)
  const indice = globalDatosSinAgrup.findIndex(item => item.NRO_AGENTE == id);
  
  console.log (globalDatosSinAgrup[indice])
  globalDatosSinAgrup[indice].CUIL = cuil
  console.log (globalDatosSinAgrup[indice])
  
}

async function consultaGrabados(){
  return await DebitosTotalesAux.findAll({
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
    const Aux = await DebitosTotalesAux.findAll({ 
      where: { COD_DEB: GlobalenviosOrganismo } 
    });
    
    if (!Aux || Aux.length === 0) {
      return res.status(404).send("No se encontraron datos");
    }

    const { datos } = agruparPorNroAgente(Aux);

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


const ReporteBancoSantiago = async (req, res) => {
    console.log("reporteBSE_SUELDO");
    

    try {
        const response = await axios.get(
          'http://54.94.40.190/jasperserver/rest_v2/reports/Reports/Debitos/BSE/BSENotaEnvio.pdf',
          {
              auth: {
                  username: 'jasperadmin',
                  password: 'WNIVpb1Cgcx=',
              },
              responseType: 'arraybuffer',
              params: {
                  codigoenvio: GlobalenviosOrganismo
              }
          }
      );

        // 👇 Headers CLAVE
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=reporte.pdf");
        res.setHeader("Content-Length", response.data.length);

        return res.send(response.data);

    } catch (error) {
    const data = error.response?.data;

    if (data) {
        const mensaje = Buffer.from(data).toString("utf-8");
        console.error("ERROR JASPER:", mensaje);
    }

    return res.status(500).json({
        error: "No se pudo generar el reporte"
    });
}
};


const ReporteBancoNacion = async (req, res) => {
       console.log("reporteBNA");

       try {
        // 🔹 Traer ambos PDFs en paralelo
        const [notaRes, debitosRes] = await Promise.all([
            axios.get(
                'http://54.94.40.190/jasperserver/rest_v2/reports/Reports/Debitos/BNA/BNANotaEnvios.pdf',
                {
                    auth: {
                        username: 'jasperadmin',
                        password: 'WNIVpb1Cgcx=',
                    },
                    responseType: 'arraybuffer',
                    params: { codigoenvio: 11 }
                }
            ),
            axios.get(
                'http://54.94.40.190/jasperserver/rest_v2/reports/Reports/Debitos/BNA/BNAReporteDebitos.pdf',
                {
                    auth: {
                        username: 'jasperadmin',
                        password: 'WNIVpb1Cgcx=',
                    },
                    responseType: 'arraybuffer'
                }
            )
        ]);

        // 🔹 Crear PDF final
        const pdfFinal = await PDFDocument.create();

        // 🔹 Cargar PDFs
        const pdfNota = await PDFDocument.load(notaRes.data);
        const pdfDebitos = await PDFDocument.load(debitosRes.data);

        // 🔹 Copiar páginas del primero
        const pagesNota = await pdfFinal.copyPages(
            pdfNota,
            pdfNota.getPageIndices()
        );
        pagesNota.forEach(page => pdfFinal.addPage(page));

        // 🔹 Copiar páginas del segundo
        const pagesDebitos = await pdfFinal.copyPages(
            pdfDebitos,
            pdfDebitos.getPageIndices()
        );
        pagesDebitos.forEach(page => pdfFinal.addPage(page));

        // 🔹 Generar PDF final
        const pdfBytes = await pdfFinal.save();

        // 🔹 Enviar al cliente
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=BNA_Completo.pdf");

        return res.send(Buffer.from(pdfBytes));

    } catch (error) {
        const data = error.response?.data;

        if (data) {
            const mensaje = Buffer.from(data).toString("utf-8");
            console.error("ERROR JASPER:", mensaje);
        } else {
            console.error("ERROR:", error.message);
        }

        return res.status(500).json({
            error: "No se pudieron generar los reportes"
        });
    }

 
};


async function ReporteOrganismo (req, res) {
  
  console.log("reporte ORGANISMOS");

    try {
        const response = await axios.get(
          'http://54.94.40.190/jasperserver/rest_v2/reports/Reports/Debitos/ORGANISMOS/NotaEnvioOrganismos.pdf',
          {
              auth: {
                  username: 'jasperadmin',
                  password: 'WNIVpb1Cgcx=',
              },
              responseType: 'arraybuffer',
              params: {
                  codigodebito: GlobalenviosOrganismo
              }
          }
      );

        // 👇 Headers CLAVE
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=reporte.pdf");
        res.setHeader("Content-Length", response.data.length);

        return res.send(response.data);

    } catch (error) {
    const data = error.response?.data;

    if (data) {
        const mensaje = Buffer.from(data).toString("utf-8");
        console.error("ERROR JASPER:", mensaje);
    }

    return res.status(500).json({
        error: "No se pudo generar el reporte"
    });
}
  }




const GenerarNotas = (req, res) => {

  if (['34','37'].includes(GlobalenviosOrganismo)) {

    console.log("notas banco santiago");
    return ReporteBancoSantiago(req, res);

  } else if (['11'].includes(GlobalenviosOrganismo)) {

    console.log("nota banco nacion");
    return ReporteBancoNacion(req, res);

  }else{
    console.log("notas organismos");
    return ReporteOrganismo(req, res);
  }
  

  
}

export {
    paginainicio,
       
    debitosindex,
    
    generarDebitos,
    generartxt,
    generarDbf,
    
    consultarDebitos,
    
    grabardatos,
    cierreEjercicio,
    seleccionarGrabados,

    generarExcel,
    generarExcelFormateado,
    
    reportePDFBasico,
    ReporteOrganismo,
    ReporteBancoSantiago,
    ReporteBancoNacion,
    guardarCuil,
    GenerarNotas,
    agruparPorNroAgente

}
