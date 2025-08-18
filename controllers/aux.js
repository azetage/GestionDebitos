const generarDebitos = async (codigo_debito, periodo, sigla)=>{

    GlobalenviosOrganismo= codigo_debito
    Globalperiodo=periodo
    Globalsigla= sigla

    console.log("codigo debito "+ codigo_debito+" periodo :" +periodo )

    const [year, month, day] = periodo.split('-').map(Number)

    console.log ("FECHA SEPADARA", year, month, day)

    const wfecha = new Date(year, month-1, day)

    console.log ("NUEVA DATE DESDE FECHA SEPARADA", wfecha.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))

    const ultimoDia = ultimoDiaDelMes(wfecha);
 
    console.log("ULTIMO DIA DEL MES ",ultimoDia.toLocaleDateString('es-AR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }))
    /////////////////////////////////////DEBITOS FONAVI /////////////////////////////////////////////////////////////////////////

// `SELECT * FROM VISTA_ENVIODEBITOS 
//    WHERE COD_DEB = :codigoDebito 
//      AND FEC_ENVIO <= :ultimodiaSQL 
//      AND FEC_VTO >= :fechaSQL
//    ORDER BY NRO_AGENTE ASC`,

    //
    let datos
    
    // consulta recupero mapao datos
    const datosfonavi = await db_debitos.query(
    `SELECT * FROM VISTA_ENVIODEBITOS 
        WHERE COD_DEB = :codigoDebito
        AND FEC_ENVIO <= :ultimodiaSQL
        AND FEC_VTO >= :fechaSQL
        ORDER BY NRO_AGENTE ASC`,

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    datos = datosfonavi.map(item   => { 
                    const suma = item.MTO_CUO+item.MTO_ADIC+item.MTO_DEUDA
                    totalFonavi += suma
                    return {
                                FECHA: wfecha.toISOString().split('T')[0],
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.DNI_DESC,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   0
                            }
                    }
                )
    console.log("elementos Fonavi" + datos.length)
     /////////////////////////////////////DEBITOS PLANES /////////////////////////////////////////////////////////////////////////
    // consulta planes agrear a datos con mapeo                
    let datosPlanes = await db_debitos.query(
        `SELECT * FROM VISTA_ENVIOPLANES 
        WHERE COD_DEB = :codigoDebito
        AND FEC_ENVIO <= :ultimodiaSQL
        AND FEC_VTO >= :fechaSQL
        ORDER BY N_TARJETA ASC`,

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    let datos1 = datosPlanes.map(item   => {
         const suma = item.MTO_CUO + item.MTO_ADIC + item.INT_CUO
         totalPlanes += suma
                 return {

                         
                                FECHA: wfecha,
                                OPERATORIA: 'ADJUD',
                                COD:        item.COD,
                                COD_DEB:    codigo_debito,
                                SIGLA:      sigla,    
                                NRO_AGENTE: item.N_TARJETA,
                                DNI_DESC:   item.DNI_DESC,
                                APEYNOM:    item.APEYNOM,                                
                                MTO_CUO:    suma,                            
                                cantidad:   0  // ← contador de registros
                    }

                }
            )
    console.log("elementos Planes" + datos1.length)
    
    datos.push(...datos1)
    /////////////////////////////////////DEBITOS OPERATORIAS /////////////////////////////////////////////////////////////////////////  
    
    let datosOperatorias2 = await db_vistaDebitos.query(
        `SELECT * FROM v_debitos 
        WHERE COD_DEB = :codigoDebito
        AND FEC_ENVIO <= :ultimodiaSQL
        AND FEC_VTO >= :fechaSQL
        ORDER BY agente_debito ASC`,

    {
        replacements: {
            codigoDebito: codigo_debito,
            fechaSQL: wfecha.toISOString().split('T')[0],           // 'YYYY-MM-DD'
            ultimodiaSQL: ultimoDia.toISOString().split('T')[0] // 'YYYY-MM-DD'
        },
        type: db_debitos.QueryTypes.SELECT
    });

    const datos2 = datosOperatorias2.map(item=>{
        totalOperatoria2 += item.imp_cuota
        return{
                              
                FECHA: wfecha,
                OPERATORIA: item.operatoria,
                COD:        item.codigo,
                COD_DEB:    codigo_debito,
                SIGLA:      sigla,    
                NRO_AGENTE: item.agente_debito,
                DNI_DESC:   item.dni,
                APEYNOM:    item.nombre,                                
                MTO_CUO:    item.imp_cuota,                            
                cantidad: 0  // ← contador de registros
                        }

        })

    datos.push(...datos2)
    
    
}