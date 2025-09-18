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
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

function ultimoDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
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
    console.log("=".repeat(68))

//////////////////////////////////////////////////
//////////////////////////////GENERAR DEBITOS FONAVI
//////////////////////////////////////////////////

// `SELECT * FROM VISTA_ENVIODEBITOS 
//    WHERE COD_DEB = :codigoDebito 
//      AND FEC_ENVIO <= :ultimodiaSQL 
//      AND FEC_VTO >= :fechaSQL
//    ORDER BY NRO_AGENTE ASC`,

    let datos
    let totalFonavi= 0
    let totalPlanes = 0
    let totalOperatoria2=0
    
    // MAPEO FONAVI
    const datosfonavi = await db_debitos.query(
    `SELECT * FROM VISTA_ENVIODEBITOS 
        WHERE COD_DEB = :codigoDebito
        AND FEC_ENVIO <= :ultimodiaSQL 
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
                
    console.log(" CONSULTA FONAVI          [" + datosfonavi.length + "]     MONTO: " + totalFonavi.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))

//////////////////////////////////////////////////
//////////////////////////////DEBITOS PLANES
//////////////////////////////////////////////////
 
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
    console.log(" CONSULTA PLANES          [" + datos1.length + "]     MONTO: "+totalPlanes.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    datos.push(...datos1)

//////////////////////////////////////////////////
////////////////////////////// DEBITOS OPERATORIAS2
//////////////////////////////////////////////////

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
    console.log(" CONSULTA OPERATORIAS2    [" + datos2.length + "]     MONTO: " + totalOperatoria2.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    
    datos.push(...datos2) 

    let sinagrupar= datos    
    let total= totalFonavi+totalPlanes+totalOperatoria2
    
    console.log("-".repeat(68))
    console.log(" CANT REG SIN AGRUPAR    [" +datos.length+ "]     MONTO: " + total.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}) )   
    const totalPesos = total //total.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2});
    

//    await DebitosTotales.bulkCreate(datos)
//////////////////////////////////////////////////
//////////////////////////////AGRUPA POR CODIGO DEBITO
//////////////////////////////////////////////////

    if (['25','7','11'].includes(codigo_debito)) {

    const agrupados = datos.reduce((acc, item) => {
        
        // KEY TERNANIO SI CODIGO DEBITO ES 11 UTILIZA EL STRING COMPUESTO - SINO NRO AGENTE
        // const key = codigo_debito === '11' ? `${item.SUCURSAL}-${item.NRO_AGENTE}`:`${item.NRO_AGENTE}`;

        const key = codigo_debito === '11' ? `${item.SUCURSAL}-${item.NRO_AGENTE}`:`${item.NRO_AGENTE}`;
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
                cantidad:   0
            };
        }

        acc[key].MTO_CUO += Number(item.MTO_CUO) || 0;
        acc[key].cantidad += 1;

        return acc;
    }, {});
    
    // AGREGA IMPORTE POR GASTO ADMINISTRATIVO $200 
    if (codigo_debito === '11') { Object.values(agrupados).forEach(item => item.MTO_CUO += 200); }

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
                                    cantidad:   1
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
    console.log(" CANTIDAD DE REGISTROS    [ "+Object.keys(datos).length +"]--- TOTAL " + totalPesos.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}))
    console.log("=".repeat(68))

    return {datos,totalPesos,sinagrupar}

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
  const campos = [
    { name: 'FECHA', type: 'C', size: 8 },
    { name: 'OPERATORIA', type: 'C', size: 20 },
    { name: 'COD', type: 'N', size: 20 },
    { name: 'COD_DEB', type: 'N', size: 20 },
    { name: 'SIGLA', type: 'C', size: 20 },
    { name: 'NRO_AGENTE', type: 'N', size: 20 },
    { name: 'DNI_DESC', type: 'N', size: 20 },
    { name: 'APEYNOM', type: 'C', size: 20 },
    { name: 'MTO_CUO', type: 'N', size: 20, decimals: 2 },
    { name: 'cantidad', type: 'N', size: 10 },
  ];

  const rutaArchivo = path.join(obtenerRutaDescargas(), `Debitos ${Globalsigla} - ${Globalperiodo}.dbf`);
  const dbf = await DBFFile.create(rutaArchivo, campos);

  console.log(`Archivo DBF creado: ${dbf.path}`);

  let datos = await DebitosTotales.findAll({where:{COD_DEB: GlobalenviosOrganismo }})


  const registros = datos.map(d => ({
    FECHA:      String(d.FECHA),
    OPERATORIA: String(d.OPERATORIA),
    COD:        Number(d.COD) || 0,
    COD_DEB:    Number(d.COD_DEB),
    SIGLA:      String(d.SIGLA),
    NRO_AGENTE: Number(d.NRO_AGENTE),
    DNI_DESC:   Number(d.DNI_DESC),
    APEYNOM:    String(d.APEYNOM),
    MTO_CUO:    Number(d.MTO_CUO) || 0,
    cantidad:   Number(d.cantidad) || 0
  }));

  await dbf.appendRecords(registros);
  console.log(`Se agregaron ${registros.length} registros`);

  if (res) {
    res.download(rutaArchivo, `Debitos ${Globalsigla} - ${Globalperiodo}.dbf`);
  }
  
  //generarDbf().catch(console.error);
}

async function generartxt(req, res) {
  try {
    let datos = await DebitosTotales.findAll({where:{COD_DEB: GlobalenviosOrganismo }})
    let totalPesos=0
    datos.map(item   => {
                  totalPesos += item.MTO_CUO}
                )

    //let { datos, totalPesos } = await generarDebitos(GlobalenviosOrganismo, Globalperiodo, Globalsigla);
    console.log(totalPesos)
    // Fechas
    const mes = String(wfecha.getMonth() + 1).padStart(2, "0");
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
    
    // Construimos ruta con nombre de archivo .txt
        const ruta = path.join(
            obtenerRutaDescargas(),
            `Debitos ${Globalsigla} - ${Globalperiodo}.txt`
        );
       let datosaux = datos.map(obj => {
            const plain = obj.get({ plain: true });
            return Object.values(plain).map(v => String(v ?? "")).join("\t"); // tab en vez de espacio
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

  try {
    let { sinagrupar } = await generarDebitos(GlobalenviosOrganismo, Globalperiodo, Globalsigla);
    // Paso 1: borrar coincidencias por COD_DEB y FECHA
    const inicio= primerDiaDelMes(wfecha)
    const final = ultimoDiaDelMes(wfecha)
    

    await DebitosTotales.destroy({
        where: {
            COD_DEB: sinagrupar[0].COD_DEB,
            FECHA: {
            [Op.between]: [inicio, final]
            }
        }
        }
    )

    // Paso 2: insertar todos los nuevos registros
    const hoy = new Date().toISOString().split("T")[0]; // fecha YYYY-MM-DD
    sinagrupar = sinagrupar.map((item) => ({
        ...item,
        FECHA: hoy, // actualiza el campo FECHA
        }));
    
        await DebitosTotales.bulkCreate(sinagrupar);

    // Paso 3: responder al cliente
    res.render("templates/mensaje", {
      pagina: "DEBITOS GRABADO EN BASE DE DATOS",
      mensaje: "¡ Operacion Realizada Satisfactoriamente!",
      ruta: "/main/enviodebitos"
    });
  } catch (error) {
    console.error("Error en grabardatos:", error);

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
    raw: true
  });
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
          TRY_CAST(SUCURSAL AS INT) AS sucursal, -- string a int
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
    cierreEjercicio
}
