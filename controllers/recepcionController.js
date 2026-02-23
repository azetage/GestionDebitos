import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'
import RecepcionDebitosAux from '../models/RecepcionDebitosAux.js'
import { db_debitos,db_vistaDebitos } from '../config/db.js';
import fs from "fs";

import path from 'path';
import { ro } from 'date-fns/locale';


global.globalData= ""

const recepcioDebitosIndex= (req,res)=> {
    return res.render('main/recepcioDebitos', {
         pagina : "RECEPCION DEBITOS",

         })
}


const TipoDocumento = [
  upload.single('archivoExcel'), // 👈 SOLO AQUÍ

  (req, res, next) => {
    const extension = path.extname(req.file.originalname).toLowerCase();

    if (['.xls', '.xlsx'].includes(extension)) req.tipo = 'excel';
    else if (extension === '.txt') req.tipo = 'txt';
    else if (extension === '.dbf') req.tipo = 'dbf';
    else return res.status(400).send('Formato no soportado');

    next();
  }
];



const subirDebitos = (req, res) => {
  const workbook = XLSX.readFile(req.file.path);
    try {
      const nombreOriginal = req.file.originalname;
      
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const datos = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { defval: "" }
      );
      const encabezados= Object.keys(datos[0])
      const Unca = [ 'LEGAJO', 'APELLIDO', 'NOMBRE', 'DOCUMENTO', 'IMPORTE', 'CODIGO' ]
      const MunCapital= ['Legajo','Apellido y nombres','Documento','Mes','Año','Importe']
      const Dio = [ '__EMPTY',    '__EMPTY_1',  '__EMPTY_2',
                    '__EMPTY_3',  '__EMPTY_4',  '__EMPTY_5',
                    '__EMPTY_6',  '__EMPTY_7',  '__EMPTY_8',
                    '__EMPTY_9',  '__EMPTY_10', '__EMPTY_11',
                    '__EMPTY_12', '__EMPTY_13', '__EMPTY_14',
                    '__EMPTY_15', '__EMPTY_16', '__EMPTY_17',
                    '__EMPTY_18', '__EMPTY_19', '__EMPTY_20',
                    '__EMPTY_21', '__EMPTY_22', '__EMPTY_23',
                    '__EMPTY_24', '__EMPTY_25', '__EMPTY_26',
                    '__EMPTY_27', '__EMPTY_28', '__EMPTY_29']

      const Diputados = [ 'Nro. Legajo', 'Apellido', 'Nombre', 'C.U.I.L.', 'INSTITUTO PROV. DE LA VIVIENDA']

      const Educacion= [
                    '__EMPTY',    '__EMPTY_1',
                    '__EMPTY_2',  '__EMPTY_3',
                    '__EMPTY_4',  '__EMPTY_5',
                    '__EMPTY_6',  '__EMPTY_7',
                    '__EMPTY_8',  '__EMPTY_9',
                    '__EMPTY_10', '__EMPTY_11',
                    '__EMPTY_12', '__EMPTY_13',
                    '__EMPTY_14', '__EMPTY_15',
                    '__EMPTY_16', '__EMPTY_17',
                    '__EMPTY_18', '__EMPTY_19'
                    ]
      
      const PoderJudicial = [
                              'CUIL',       'NRO_AGENTE',
                              'NOMBRE',     'DESCUENTO',
                              'DESCONTADO', 'DISPONIBLE',
                              'CODIGO',     'AÑO',
                              'MES'
                            ]

      const Senadores = [
                          '__EMPTY',
                          'REPORTE DE DESCUENTOS CAMARA DE SENADORES\r\n' +
                            'LIQUIDACION: ENERO 2026\r\n' +
                            'ORGANISMO: I P V',
                          '__EMPTY_1',
                          '__EMPTY_2',
                          '__EMPTY_3',
                          '__EMPTY_4',
                          '__EMPTY_5',
                          '__EMPTY_6',
                          '__EMPTY_7',
                          '__EMPTY_8',
                          '__EMPTY_9'
                        ]
      let data //datos mapa formateados
      let Organismo= ""
      console.log(encabezados); // encabezados
      
      
      
      
      if (JSON.stringify(encabezados) == JSON.stringify(Unca)) {
 
          console.log("UNCa")
          console.log(encabezados)

          Organismo= "UNCa"
          data =   datos.map(item   => { 
          return {    
                      ORGANISMO: Organismo,
                      PERIODO:    nombreOriginal,
                      NRO_AGENTE: item.LEGAJO,
                      DNI_DESC:   String(item.DOCUMENTO),//.substring(2, 10),
                      APEYNOM:    `${item.APELLIDO} ${item.NOMBRE}`,                                
                      MONTO:      Number(item.IMPORTE),                            
                 
                  }
                })
          
        }

      else if (JSON.stringify(encabezados) == JSON.stringify(MunCapital))
        {
          console.log("DEBITOS CAPITAL")
          //Mapeo Datos MUN CAPITAL
          Organismo= "MUN CAPITAL "
          data = datos.slice(0, -1).map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    `${item.Año}-${item.Mes}`,
                      NRO_AGENTE: item.Legajo,
                      DNI_DESC:   item.Documento,
                      APEYNOM:    item['Apellido y nombres'],                                
                      MONTO:      item.Importe,                            
                 
                  }
                })
        }
 
      
      else if (JSON.stringify(encabezados) == JSON.stringify(Dio)) 
         {
          console.log("DEBITOS DIO")
          const periodo = datos[2]['__EMPTY_8']
          //Mapeo Datos DIO
          Organismo= "DIO "
          data =   datos.slice(4,-2).map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    periodo,
                      NRO_AGENTE: item.__EMPTY_5,
                      DNI_DESC:   item.__EMPTY,
                      APEYNOM:    item.__EMPTY_9,                                
                      MONTO:      item.__EMPTY_28,                            
                 
                  }
                })
                         // console.log(data)
        }

      else if (JSON.stringify(encabezados) == JSON.stringify(Diputados)) {
 
          console.log("diputados")
          console.log(encabezados)

          Organismo= "Diputados "
          data =   datos.map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    nombreOriginal,
                      NRO_AGENTE: item['Nro. Legajo'],
                      DNI_DESC:   String(item['C.U.I.L.']).substring(2, 10),
                      APEYNOM:    `${item.Apellido} ${item.Nombre}`,                                
                      MONTO:      item['INSTITUTO PROV. DE LA VIVIENDA']*-1,                            
                 
                  }
                })
          
        }
      
      else if (JSON.stringify(encabezados) == JSON.stringify(Educacion)) {
 
          console.log("Educacion")
          console.log(encabezados)
          console.log(datos[0],datos[1],datos[2],datos[3],datos[4])

          Organismo= "EDUCACION "
          const periodo = datos[2]['__EMPTY_7']

          data =   datos.slice(4,-2).map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    periodo,
                      NRO_AGENTE: item.__EMPTY,
                      DNI_DESC:   item.__EMPTY,
                      APEYNOM:    item.__EMPTY_2,                                
                      MONTO:      Number(item.__EMPTY_17),                            
                 
                  }
                })
          
        }

      else if (JSON.stringify(encabezados) == JSON.stringify(PoderJudicial)) {
 
          console.log("PoderJudicial")
          console.log(encabezados)

          Organismo= "PODER JUDICIAL "
          data =   datos.map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    `${item.AÑO}-${item.MES}` ,
                      NRO_AGENTE: item.NRO_AGENTE,
                      DNI_DESC:   String(item.CUIL).substring(2, 10),
                      APEYNOM:    item.NOMBRE,                                
                      MONTO:      Number(item.DESCUENTO),                            
                 
                  }
                })
          
        }

      else if (JSON.stringify(encabezados) == JSON.stringify(Senadores)) {
 
          console.log("Senadores")
          console.log(encabezados)
   




          Organismo= " Senadores "
          data =   datos.slice(1).map(item   => { 
          return {
                      ORGANISMO: Organismo,
                      PERIODO:    item.__EMPTY ,
                      NRO_AGENTE: item.__EMPTY_1,
                      DNI_DESC:   item.__EMPTY_1,
                      APEYNOM:    `${item.__EMPTY_3} ${item.__EMPTY_4}`,                                
                      MONTO:      Number(item.__EMPTY_5),                            
                 
                  }
                })
          
        }
         
      else{
              throw new error
         }
      
      globalData= data   
      res.render('main/resultadoTabla', { data, pagina : Organismo, archivo : nombreOriginal});

    } catch (error) {
      console.error(error);
      res.send('Error al procesar el archivo');
    }
  }

  const subirDebitosBanco = async (req, res) => {
  try {
    let Organismo
    let codigoDebito
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió archivo TXT' });
    }

    const contenido = fs.readFileSync(req.file.path, 'utf8');
    let data
    const lineas = contenido.split(/\r?\n/).filter(l => l.trim())

    if(lineas[0].includes("REE")){
      console.log("BANCO NACION")   
      Organismo = "BANCO NACION" 
      codigoDebito = 11
      data = lineas.slice(1,-1).map(l => {
      return {
        registro:l.slice(0,1),
        sucursal: l.slice(1, 5),
        tipo: l.slice(5, 7),
        nro_agente: l.slice(7, 18),
        importe: Number(l.slice(18, 33)) / 100,
        fecha: l.slice(33, 41),
        estado: l.slice(41, 42),
        observacion:l.slice(42, 72),
      }
    })
    }
    else if(lineas[0].includes("848"))
    { console.log("BSE JUBILADOS")
      Organismo = "BSE JUBILADOS"
      codigoDebito = 34

      data = lineas.map(l => {
        return {
          ttipo:l.slice(0,1),
          cod_emp: l.slice(1, 5),
          cod_serv: l.slice(5, 8),
          desde: l.slice(8, 16),
          hasta: l.slice(16,24),
          venc: l.slice(24,32),
          cbu_1:l.slice(32,40),
          cbu_2:l.slice(40,54),
          nro_agente:l.slice(43,53),
          periodo:l.slice(54,60),
          importe: Number(l.slice(60, 74)) / 100,
          comprobante: l.slice(74, 81),
          fecha_cobro: l.slice(81, 89),
          estado: l.slice(89, 90),
          observacion: l.slice(90, 210),
        }
      })
    }
    else if(lineas[0].includes("849")){
      console.log("BSE SUELDOS")
      Organismo = "BSE SUELDOS"
      codigoDebito = 37


      data = lineas.map(l => {
        return {
          tipo:l.slice(0,1),
          cod_emp: l.slice(1, 5),
          cod_serv: l.slice(5, 8),
          desde: l.slice(8, 16),
          hasta: l.slice(16,24),
          venc: l.slice(24,32),
          cbu_1:l.slice(32,40),
          cbu_2:l.slice(40,54),
          nro_agente:l.slice(43,53),
          periodo:l.slice(54,60),
          importe: Number(l.slice(60, 74)) / 100,
          comprobante: l.slice(74, 81),
          fecha_cobro: l.slice(81, 89),
          estado: l.slice(89, 90),
          observacion: l.slice(90, 210),
          
        }
      })
    }
    console.log(Object.keys(data[0]))


  const agentes = data
  .map(x => String(Number(x.nro_agente)))
  .filter(a => a && a !== "NaN");

const rows = await db_debitos.query(
  `SELECT nro_agente, dni_desc, apeynom
   FROM Debitos.dbo.DEBITOS_TOTAL
   WHERE nro_agente IN (:agentes)
   AND cod_deb = :codigoDebito`,
  {
    replacements: { agentes, codigoDebito },
    type: db_debitos.QueryTypes.SELECT
  }
);

// 👉 convertir a mapa por nro_agente
const mapa = Object.fromEntries(
  rows.map(r => [String(r.nro_agente), r])
);

// 👉 UNA sola iteración real
data = data.map(item => {
  const info = mapa[String(Number(item.nro_agente))] || {};

  return {
    ORGANISMO: Organismo,
    PERIODO: item.periodo || item.fecha,
    NRO_AGENTE: item.nro_agente,
    DNI_DESC: info.dni_desc || "",
    APEYNOM: info.apeynom || "",
    MONTO: Number(item.importe)
  };
});


    let suma = 0,cantidad =0;
    data.forEach(item => {
      suma += item.MONTO,
      cantidad = cantidad +1
    });

  res.render('main/resultadoTablatxt', { data , archivo : Organismo, suma: suma.toLocaleString('es-AR', {style: 'currency',currency: 'ARS',minimumFractionDigits: 2}), cantidad: cantidad});

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
  };



async function grabarDebitos(req, res) {
  try {
    const debitos = globalData;

    if (!Array.isArray(debitos) || debitos.length === 0) {
      throw new Error("No se encontraron registros en generarDebitos");
    }

    await db_debitos.transaction(async (t) => {
      await RecepcionDebitosAux.bulkCreate(debitos, {
        transaction: t,
        validate: true
      });
    });

    return res.render("templates/mensaje", {
      pagina: "DEBITOS GRABADOS EN BASE DE DATOS",
      mensaje: "¡Operación realizada satisfactoriamente!",
      ruta: "/main/recepcionDebitos"
    });

  } catch (error) {
    console.error("Error en grabarDebitos:", error);

    return res.status(500).render("templates/mensaje", {
      pagina: "ERROR",
      mensaje: error.parent?.message || error.message,
      ruta: "/main/recepcionDebitos"
    });
  }
}

async function compararDebitos(req,res) {

  let DatosDebitosTotales = db_debitos
  
}
export {
    recepcioDebitosIndex,
    subirDebitos,
    subirDebitosBanco,
    grabarDebitos,
    TipoDocumento
    


}