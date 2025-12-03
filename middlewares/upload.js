import multer from 'multer'

const upload = multer({
  dest: './public/subidas/'
})

export default upload
