import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'


const recepcioDebitosIndex= (req,res)=> {
    return res.render('main/recepcioDebitos', {
         pagina : "RECEPCION DEBITOS",

         })

}
const subirDebitos = [
  upload.single('archivoExcel'),
  (req, res) => {
    try {
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

      let data //datos mapa formateados
      let Organismo= ""
      console.log(encabezados); // encabezados
      if (JSON.stringify(encabezados) == JSON.stringify(MunCapital))
        {
          console.log("DEBITOS CAPITAL")
          //Mapeo Datos MUN CAPITAL
          Organismo= "MUN CAPITAL "
          data = datos.map(item   => { 
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
          console.log(datos[0],datos[1],datos[2],datos[3])
          //Mapeo Datos DIO
          Organismo= "DIO "
          data =   datos.slice(4).map(item   => { 
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
      else{ 
          console.log("diputados")
          console.log(encabezados)
          
         }
  
      res.render('main/resultadoTabla', { data, pagina : Organismo});

    } catch (error) {
      console.error(error);
      res.send('Error al procesar el archivo');
    }
  }
];

export {
    recepcioDebitosIndex,
    subirDebitos


}