import nodemailer from 'nodemailer'

const emailRegistro = async (datos) => {
  const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
          auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
          }
        }
  );
  console.log(datos)

  const {nombre, email, token}= datos

// enviar el email
  await transport.sendMail({
      from:     "ipv-SistemaGestionEscrituras",
      to:       email,
      subject:  "Bienvenido al Sistema de Gestión de Escrituras - Confirma tu cuenta",
      text:     "Bienvenido al Sistema de Gestión de Escrituras - Confirma tu cuenta",
      html:     `
<p> 
                
Estimado/a ${nombre}, <br><br>
¡Bienvenido/a al Sistema de Gestión de Escrituras! Nos alegra que hayas decidido unirte a nuestra plataforma.
<br> Este sistema ha sido diseñado para facilitar y optimizar la gestión documental, asegurando una experiencia más eficiente y segura.
<br>Para comenzar a utilizar todas las funcionalidades del sistema, es necesario que confirmes tu cuenta. 
<br>Por favor, haz clic en el siguiente enlace para activarla:
</p> 
                <a href="${process.env.BACKEND_URL}:${process.env.PORT??3000}/auth/confirmar/${token}" >
                Confirmar Cuentas </a>
</p>
<p>
Si tienes alguna pregunta o necesitas ayuda durante este proceso, no dudes en contactarnos a través del correo electrónico 
<br>[guillermoavilazamora@gmail.ocm] o llamándonos al [3834-387171]. Estamos aquí para ayudarte.
<br><br>Agradecemos tu confianza en nosotros y esperamos que disfrutes utilizando nuestro sistema.
<br><br>Atentamente,
<br>[Guillermo Avila Zamora]
<br> Equipo del Sistema de Gestión de Escrituras
                
</p> 
     <br><br>       
<p> si tu no creaste esta cuenta puedes ignorar el mensaje</p>


            `   
      })
}



const emailOlvidePassword = async (datos) => {
    
  const transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
          auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
          }
        }
  );

  const {nombre, email, token}= datos

    //enviar el email
  await transport.sendMail({
      from:     "BienesRaices.com",
      to:       email,
      subject:  "reestablece tu Password en BienesRaices.com",
      text:     "reestablece tu Password en BienesRaices.com",
      html:     `
                <p> Hola ${nombre}, Has Solicitado restablecer tu clave en BienesRaices.com </p> 
            
                <p> sigue en el siguiente enlace para generar una nueva clave:</p>
                <a href="${process.env.BACKEND_URL}:${process.env.PORT??3000}/auth/confirmar/${token}" >
                Confirmar Cuentas </a></p>

                <p> si tu no creaste esta cuenta puedes ignorar el mensaje</p>


            `   
      })
}

export{
    emailRegistro
}