import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'
import RecepcionDebitosAux from '../models/RecepcionDebitosAux.js'
import { db_debitos,db_vistaDebitos } from '../config/db.js';


global.globalData= ""

const recepcioDebitosIndex= (req,res)=> {
    return res.render('main/recepcioDebitos', {
         pagina : "RECEPCION DEBITOS",

         })

}
const subirDebitos = [
  upload.single('archivoExcel'),
  (req, res) => {
    try {
      const nombreOriginal = req.file.originalname;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const datos = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { defval: "" }
      );
      const encabezados= Object.keys(datos[0])
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
      const Diputados= [ 'NRO_AGENTE','APEYNOM', 'CUIL','MONTO','COD','PAGO','TIPO','DNI_DESC']

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
      const PoderJudicial = [ 'CUIL', 'NRO_AGENTE', 'APEYNOM', 'MONTO','COD','PAGO','TIPO','DNI_DESC']

      let data //datos mapa formateados
      let Organismo= ""
      console.log(encabezados); // encabezados
      if (JSON.stringify(encabezados) == JSON.stringify(MunCapital))
        {
          console.log("DEBITOS CAPITAL")
          //Mapeo Datos MUN CAPITAL
          Organismo= "MUN CAPITAL "
          data = datos.slice(0, -1).map(item   => { 
          return {
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

          Organismo= "DIPUTADOS "
          data =   datos.map(item   => { 
          return {
                      PERIODO:    nombreOriginal,
                      NRO_AGENTE: item.NRO_AGENTE,
                      DNI_DESC:   item.DNI_DESC,
                      APEYNOM:    item.APEYNOM,                                
                      MONTO:      item.MONTO,                            
                 
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
                      PERIODO:    nombreOriginal,
                      NRO_AGENTE: item.NRO_AGENTE,
                      DNI_DESC:   String(item.CUIL).substring(2, 10),
                      APEYNOM:    item.APEYNOM,                                
                      MONTO:      Number(item.MONTO),                            
                 
                  }
                })
          
         }
      globalData= data   
      res.render('main/resultadoTabla', { data, pagina : Organismo, archivo : nombreOriginal});

    } catch (error) {
      console.error(error);
      res.send('Error al procesar el archivo');
    }
  }
];
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


export {
    recepcioDebitosIndex,
    subirDebitos,
    grabarDebitos


}