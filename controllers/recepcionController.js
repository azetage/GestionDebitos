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
      const data = XLSX.utils.sheet_to_json(
        workbook.Sheets[sheetName],
        { defval: "" }
      );

      console.log(Object.keys(data[0])); // encabezados
      const firstKey = Object.keys(data[0])[0];
      console.log(data[0][firstKey]);     // valor primera columna

      res.render('main/resultadoTabla', { data });

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