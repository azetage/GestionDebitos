import XLSX from 'xlsx'
import upload from '../middlewares/upload.js'
import RecepcionDebitosAux from '../models/RecepcionDebitosAux.js'
import { db_debitos } from '../config/db.js';
import { Sequelize } from "sequelize";
import { QueryTypes } from 'sequelize';
import fs from "fs";
import path from 'path';

global.globalData = ""

async function ConsultarOrganismosDebito() {
    let organismos = await RecepcionDebitosAux.findAll({
        attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('ORGANISMO')), 'ORGANISMO']
        ],
        order: [['ORGANISMO', 'ASC']]
    });
    return organismos;
}

const recepcioDebitosIndex = async (req, res) => {
    let organismos = await ConsultarOrganismosDebito();
    return res.render('main/recepcioDebitos', {
        pagina: "RECEPCION DEBITOS",
        Organismos: organismos,
        tablaAux: await ConsultarDebitosRecibidos()
    })
}

const TipoDocumento = [
    upload.single('archivoExcel'),
    (req, res, next) => {
        if (!req.file) {
            return res.status(400).send('No se subió ningún archivo');
        }
        const extension = path.extname(req.file.originalname).toLowerCase();
        if (['.xls', '.xlsx'].includes(extension)) req.tipo = 'excel';
        else if (extension === '.txt') req.tipo = 'txt';
        else if (extension === '.dbf') req.tipo = 'dbf';
        else return res.status(400).send('Formato no soportado');
        next();
    }
];

// Función para detectar si es archivo de Senadores
function esArchivoSenadores(encabezados) {
    // Los archivos de Senadores suelen tener __EMPTY, __EMPTY_1, __EMPTY_2, etc.
    // pero el valor de __EMPTY_1 puede variar
    if (encabezados[0] === '__EMPTY' && encabezados.length >= 10) {
        // Verificar que la mayoría son __EMPTY_X
        let emptyCount = 0;
        for (let i = 0; i < Math.min(encabezados.length, 11); i++) {
            if (encabezados[i] === '__EMPTY' || encabezados[i]?.startsWith('__EMPTY_')) {
                emptyCount++;
            }
        }
        // Si más del 70% son __EMPTY, es probable que sea Senadores u otro similar
        return emptyCount / Math.min(encabezados.length, 11) > 0.7;
    }
    return false;
}

const subirDebitos = (req, res) => {
    try {
        const PeriodoRecepcion = req.body.recepcionPeriodo;
        const nombreOriginal = req.file.originalname;

        console.log('Procesando archivo:', nombreOriginal);
        
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const datos = XLSX.utils.sheet_to_json(
            workbook.Sheets[sheetName],
            { defval: "" }
        );
        
        if (!datos || datos.length === 0) {
            throw new Error('El archivo está vacío');
        }
        
        const encabezados = Object.keys(datos[0]);
        console.log('Encabezados encontrados:', encabezados);
        console.log('Primera fila de datos:', datos[0]);

        let data = [];
        let Organismo = "";
        let codigo_debito_envios = 0;

        // UNCa
        const Unca = [ 'APELLIDO', 'NOMBRE', 'DOCUMENTO', 'IMPORTE', 'LEGAJO', 'CODIGO' ];
        
        // MunCapital
        const MunCapital = ['Legajo', 'Apellido y nombres', 'Documento', 'Mes', 'Año', 'Importe'];
        
        // DIO
        const Dio = ['__EMPTY', '__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4', '__EMPTY_5',
            '__EMPTY_6', '__EMPTY_7', '__EMPTY_8', '__EMPTY_9', '__EMPTY_10', '__EMPTY_11',
            '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17',
            '__EMPTY_18', '__EMPTY_19', '__EMPTY_20', '__EMPTY_21', '__EMPTY_22', '__EMPTY_23',
            '__EMPTY_24', '__EMPTY_25', '__EMPTY_26', '__EMPTY_27', '__EMPTY_28', '__EMPTY_29'];

        // Diputados
        const Diputados = ['Nro. Legajo', 'Apellido', 'Nombre', 'C.U.I.L.', 'INSTITUTO PROV. DE LA VIVIENDA'];

        // Educacion
        const Educacion = ['__EMPTY', '__EMPTY_1', '__EMPTY_2', '__EMPTY_3', '__EMPTY_4', '__EMPTY_5',
            '__EMPTY_6', '__EMPTY_7', '__EMPTY_8', '__EMPTY_9', '__EMPTY_10', '__EMPTY_11',
            '__EMPTY_12', '__EMPTY_13', '__EMPTY_14', '__EMPTY_15', '__EMPTY_16', '__EMPTY_17',
            '__EMPTY_18', '__EMPTY_19'];

        // PoderJudicial
        const PoderJudicial = ['CUIL', 'NRO_AGENTE', 'NOMBRE', 'DESCUENTO', 'DESCONTADO', 'DISPONIBLE', 'CODIGO', 'AÑO', 'MES'];

        // Comparaciones exactas
        if (JSON.stringify(encabezados) === JSON.stringify(Unca)) {
            console.log("UNCa");
            Organismo = "UNCa";
            codigo_debito_envios = 5;
            
            data = datos.map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item.LEGAJO),
                DNI_DESC: Number(item.DOCUMENTO),
                APEYNOM: `${item.APELLIDO} ${item.NOMBRE}`,
                MONTO: Number(item.IMPORTE)
            }));
        }
        else if (JSON.stringify(encabezados) === JSON.stringify(MunCapital)) {
            console.log("DEBITOS CAPITAL");
            Organismo = "MUN CAPITAL";
            codigo_debito_envios = 7;
            data = datos.slice(0, -1).map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item.Legajo),
                DNI_DESC: Number(item.Documento),
                APEYNOM: item['Apellido y nombres'],
                MONTO: Number(item.Importe)
            }));
        }
        else if (JSON.stringify(encabezados) === JSON.stringify(Dio)) {
            console.log("DEBITOS DIO");
            Organismo = "DIO";
            codigo_debito_envios = 2;
            data = datos.slice(4, -2).map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item.__EMPTY_5),
                DNI_DESC: Number(item.__EMPTY),
                APEYNOM: item.__EMPTY_9,
                MONTO: Number(item.__EMPTY_28)
            }));
        }
        else if (JSON.stringify(encabezados) === JSON.stringify(Diputados)) {
            console.log("DIPUTADOS");
            Organismo = "DIPUTADOS";
            codigo_debito_envios = 25;
            data = datos.slice(0, -1).map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item['Nro. Legajo']),
                DNI_DESC: String(item['C.U.I.L.']).substring(2, 10),
                APEYNOM: `${item.Apellido} ${item.Nombre}`,
                MONTO: Number(item['INSTITUTO PROV. DE LA VIVIENDA'] * -1)
            }));
        }
        else if (JSON.stringify(encabezados) === JSON.stringify(Educacion)) {
            console.log("EDUCACION");
            Organismo = "EDUCACION";
            codigo_debito_envios = 8;
            data = datos.slice(4, -2).map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item.__EMPTY),
                DNI_DESC: Number(item.__EMPTY),
                APEYNOM: item.__EMPTY_2,
                MONTO: Number(item.__EMPTY_17)
            }));
        }
        else if (JSON.stringify(encabezados) === JSON.stringify(PoderJudicial)) {
            console.log("PODER JUDICIAL");
            Organismo = "PODER JUDICIAL";
            codigo_debito_envios = 17;
            data = datos.map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item.NRO_AGENTE),
                DNI_DESC: Number(String(item.CUIL).substring(2, 10)),
                CUIL: item.CUIL,
                APEYNOM: item.NOMBRE,
                MONTO: Number(item.DESCUENTO)
            }));
        }
        // DETECCIÓN DINÁMICA PARA SENADORES
        else if (esArchivoSenadores(encabezados)) {
            console.log("SENADORES (detección dinámica)");
            console.log("Encabezados de Senadores:", encabezados);
            
            Organismo = "SENADORES";
            codigo_debito_envios = 55;
            
            // Usar los encabezados dinámicamente como en tu código original
            const SenadoresHeaders = [
                '__EMPTY',
                encabezados[1],  // Esto es dinámico
                '__EMPTY_1',
                '__EMPTY_2',
                '__EMPTY_3',
                '__EMPTY_4',
                '__EMPTY_5',
                '__EMPTY_6',
                '__EMPTY_7',
                '__EMPTY_8',
                '__EMPTY_9'
            ];
            
            console.log("Headers dinámicos para Senadores:", SenadoresHeaders);
            
            data = datos.slice(1, -1).map(item => ({
                ORGANISMO: Organismo,
                COD_DEB: codigo_debito_envios,
                PERIODO: PeriodoRecepcion,
                NRO_AGENTE: Number(item[SenadoresHeaders[1]] || item.__EMPTY_1 || 0),
                DNI_DESC: Number(item[SenadoresHeaders[1]] || item.__EMPTY_1 || 0),
                APEYNOM: `${item.__EMPTY_3 || ''} ${item.__EMPTY_4 || ''}`.trim(),
                MONTO: Number(item.__EMPTY_5 || 0)
            })).filter(item => item.NRO_AGENTE > 0); // Filtrar registros inválidos
        }
        else {
            console.error("Encabezados no reconocidos:", encabezados);
            throw new Error(`Formato de archivo no reconocido. Encabezados: ${encabezados.join(', ')}`);
        }

        if (data.length === 0) {
            throw new Error('No se pudieron procesar registros válidos');
        }

        globalData = data;

        let suma = 0;
        data.forEach(item => {
            suma += item.MONTO || 0;
        });

        res.render('main/resultadoTabla', {
            data,
            pagina: Organismo,
            archivo: nombreOriginal,
            suma: suma.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }),
            cantidad: data.length
        });

    } catch (error) {
        console.error('Error en subirDebitos:', error);
        res.status(400).send(`Error al procesar el archivo: ${error.message}`);
    }
}

const subirDebitosBanco = async (req, res) => {
    try {
        const periodo = req.body.recepcionPeriodo;
        let Organismo;
        let codigoDebito;
        let data = [];

        if (!req.file) {
            return res.status(400).json({ error: 'No se subió archivo TXT' });
        }

        const contenido = fs.readFileSync(req.file.path, 'utf8');
        const lineas = contenido.split(/\r?\n/).filter(l => l.trim());

        if (lineas.length === 0) {
            throw new Error('El archivo TXT está vacío');
        }

        console.log('Primera línea del TXT:', lineas[0].substring(0, 50));

        if (lineas[0].includes("REE")) {
            console.log("BANCO NACION");
            Organismo = "BANCO NACION";
            codigoDebito = 11;
            data = lineas.slice(1, -1).map(l => ({
                registro: l.slice(0, 1),
                sucursal: l.slice(1, 5),
                tipo: l.slice(5, 7),
                nro_agente: l.slice(7, 18),
                importe: Number(l.slice(18, 33)) / 100,
                fecha: l.slice(33, 41),
                estado: l.slice(41, 42),
                observacion: l.slice(42, 72),
            }));
        }
        else if (lineas[0].includes("848")) {
            console.log("BSE JUBILADOS");
            Organismo = "BSE JUBILADOS";
            codigoDebito = 34;
            data = lineas.map(l => ({
                ttipo: l.slice(0, 1),
                cod_emp: l.slice(1, 5),
                cod_serv: l.slice(5, 8),
                desde: l.slice(8, 16),
                hasta: l.slice(16, 24),
                venc: l.slice(24, 32),
                cbu_1: l.slice(32, 40),
                cbu_2: l.slice(40, 54),
                nro_agente: l.slice(43, 53),
                periodo: periodo,
                importe: Number(l.slice(60, 74)) / 100,
                comprobante: l.slice(74, 81),
                fecha_cobro: l.slice(81, 89),
                estado: l.slice(89, 90),
                observacion: l.slice(90, 210),
            }));
        }
        else if (lineas[0].includes("849")) {
            console.log("BSE SUELDOS");
            Organismo = "BSE SUELDOS";
            codigoDebito = 37;
            data = lineas.map(l => ({
                tipo: l.slice(0, 1),
                cod_emp: l.slice(1, 5),
                cod_serv: l.slice(5, 8),
                desde: l.slice(8, 16),
                hasta: l.slice(16, 24),
                venc: l.slice(24, 32),
                cbu_1: l.slice(32, 40),
                cbu_2: l.slice(40, 54),
                nro_agente: l.slice(43, 53),
                periodo: periodo,
                importe: Number(l.slice(60, 74)) / 100,
                comprobante: l.slice(74, 81),
                fecha_cobro: l.slice(81, 89),
                estado: l.slice(89, 90),
                observacion: l.slice(90, 210),
            }));
        }
        else {
            throw new Error('Formato de archivo TXT no reconocido. Primeros caracteres: ' + lineas[0].substring(0, 10));
        }

        if (data.length === 0) {
            throw new Error('No se pudieron procesar registros del archivo TXT');
        }

        const agentes = data
            .map(x => String(Number(x.nro_agente)))
            .filter(a => a && a !== "NaN");

        if (agentes.length > 0) {
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

            const mapa = Object.fromEntries(
                rows.map(r => [String(r.nro_agente), r])
            );

            data = data.map(item => {
                const info = mapa[String(Number(item.nro_agente))] || {};
                return {
                    ORGANISMO: Organismo,
                    COD_DEB: codigoDebito,
                    PERIODO: periodo,
                    NRO_AGENTE: item.nro_agente,
                    DNI_DESC: info.dni_desc || "",
                    APEYNOM: info.apeynom || "",
                    MONTO: Number(item.importe)
                };
            });
        }

        let suma = 0;
        data.forEach(item => {
            suma += item.MONTO || 0;
        });

        globalData = data;

        res.render('main/resultadoTablatxt', {
            data,
            archivo: Organismo,
            suma: suma.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }),
            cantidad: data.length
        });

    } catch (error) {
        console.error('Error en subirDebitosBanco:', error);
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
            mensaje: `¡Operación realizada satisfactoriamente! Se grabaron ${debitos.length} registros.`,
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

async function compararDebitos(req, res) {
  try {
    const codigodebito = req.body.cod_deb;
    const periodo = req.body.periodo;

    const DatosEnvios = await db_debitos.query(`
      SELECT 
        nro_agente,
        MAX(apeynom) as apeynom,
        MAX(cuil) as cuil,
        SUM(monto) as monto_envio,
        COUNT(*) as cantidad_registros
      FROM Debitos.dbo.DEBITOS_TOTAL
      WHERE cod_deb = :codigodebito
        AND fecha >= CAST(:periodo + '-01' AS DATE)
        AND fecha < DATEADD(MONTH, 1, CAST(:periodo + '-01' AS DATE))
      GROUP BY nro_agente
    `, {
      replacements: {
        codigodebito,
        periodo
      },
      type: QueryTypes.SELECT
    });

    const DatosRecepcion = await RecepcionDebitosAux.findAll({
      where: {
        COD_DEB: codigodebito,
        PERIODO: periodo
      },
      raw: true
    });

    const mapaRecepcion = new Map();

    DatosRecepcion.forEach(rec => {
      mapaRecepcion.set(
        String(rec.NRO_AGENTE).trim(),
        rec
      );
    });

    const coincidencias = DatosEnvios.map(envio => {
      const recepcion = mapaRecepcion.get(
        String(envio.nro_agente).trim()
      );

      const montoEnvio = Number(envio.monto_envio) || 0;
      const montoRecepcion = Number(recepcion?.MONTO) || 0;

      return {
        periodo,
        cod_deb: codigodebito,
        nro_agente: envio.nro_agente,
        apeynom: envio.apeynom,
        cuil: envio.cuil,
        cantidad_registros: envio.cantidad_registros,
        monto_envio: montoEnvio,
        monto_recepcion: montoRecepcion,
        coincide: recepcion
          ? montoEnvio <= montoRecepcion
          : false,
        existe_en_recepcion: !!recepcion
      };
    });

    const resultado = await actualizarPagados(
      coincidencias,
      codigodebito,
      periodo
    );
    console.log("llamado return ")
    return res.json({
      data: coincidencias,
      mensaje: "¡Operación realizada satisfactoriamente!",
      pagados: resultado.pagados,
      noPagados: resultado.noPagados
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message
    });
  }
}


async function actualizarPagados(
  data,
  codigodebito,
  periodo
) {
  const agentesSi = [...new Set(
    data
      .filter(x => x.coincide)
      .map(x => String(x.nro_agente).trim())
      .filter(Boolean)
  )];

  const agentesNo = [...new Set(
    data
      .filter(x => !x.coincide)
      .map(x => String(x.nro_agente).trim())
      .filter(Boolean)
  )];

  if (agentesSi.length) {
    await db_debitos.query(`
      UPDATE Debitos.dbo.DEBITOS_TOTAL
      SET pago = 'SI'
      WHERE cod_deb = :codigodebito
        AND nro_agente IN (:agentesSi)
        AND fecha >= CAST(:periodo + '-01' AS DATE)
        AND fecha < DATEADD(MONTH, 1, CAST(:periodo + '-01' AS DATE))
    `, {
      replacements: {
        agentesSi,
        codigodebito,
        periodo
      },
      type: QueryTypes.UPDATE
    });
  }

  if (agentesNo.length) {
    await db_debitos.query(`
      UPDATE Debitos.dbo.DEBITOS_TOTAL
      SET pago = 'NO'
      WHERE cod_deb = :codigodebito
        AND nro_agente IN (:agentesNo)
        AND fecha >= CAST(:periodo + '-01' AS DATE)
        AND fecha < DATEADD(MONTH, 1, CAST(:periodo + '-01' AS DATE))
    `, {
      replacements: {
        agentesNo,
        codigodebito,
        periodo
      },
      type: QueryTypes.UPDATE
    });
  }

  console.log("Débitos actualizados");
  console.log("Pagados:", agentesSi.length);
  console.log("No pagados:", agentesNo.length);

  return {
    pagados: agentesSi.length,
    noPagados: agentesNo.length
  };
}

async function ConsultarDebitosRecibidos() {
    const debitos = await RecepcionDebitosAux.findAll({
        attributes: [
            'PERIODO',
            'ORGANISMO',
            'COD_DEB',
            [Sequelize.fn('COUNT', Sequelize.col('COD_DEB')), 'REGISTROS'],
            [Sequelize.fn('SUM', Sequelize.col('MONTO')), 'MONTO_TOTAL']
        ],
        group: ['PERIODO', 'ORGANISMO', 'COD_DEB'],
        order: [['ORGANISMO', 'ASC']],
        raw: true
    });

    return debitos;
}

export {
    recepcioDebitosIndex,
    subirDebitos,
    subirDebitosBanco,
    grabarDebitos,
    TipoDocumento,
    compararDebitos,
    actualizarPagados
}