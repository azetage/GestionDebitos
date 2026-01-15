import { Router } from 'express'
import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'

const router = Router()

router.post('/upload', upload.single('archivoExcel'), (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
    console.log(Object.keys(data[0]))
    const firstkey = Object.keys(data[0])[0]
    console.log(data[0][firstkey])
    res.render('main/resultadoTabla', { data })

  } catch (error) {
    console.error(error)
    res.send('Error al procesar el archivo')
  }
})

export default router
