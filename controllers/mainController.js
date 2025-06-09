import fs from 'fs';
import readline from 'readline'
import DebitosTemp from '../models/DebitosTemporales.js';

const paginainicio = async (req, res) => {
 
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




    res.render('main/index', {
        pagina : "GESTION DEBITOS",
        datos
    })
    
    // DebitosTemp.bulkCreate(datos)
    // datos.map(async(dato,i)=> {
    //         await DebitosTemp.create({
    //             FEC_VTO:    dato.fec_vto,
    //             CBU:        dato.cbu,
    //             CBU2:       dato.cbu2,
    //             NRO_AGENTE: dato.nro_agente,
    //             MONTO:      dato.monto,
    //             CODIGO:     dato.codigo
    //         })}
    // )
}

export {
    paginainicio
}
