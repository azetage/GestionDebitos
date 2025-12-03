import { Router } from 'express'
import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'

const router = Router()

router.post('/upload', upload.single('archivoExcel'), (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
    console.log(data)
    res.render('main/resultadoTabla', { data })

  } catch (error) {
    console.error(error)
    res.send('Error al procesar el archivo')
  }
})

export default router
