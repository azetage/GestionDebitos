
const TipoContratacionLabel= (numero) =>{

    var contratacion= 'VACIO'
    
    switch (numero){
        case 1:  
            contratacion = 'LICITACION PUBLICA' 
            break;
        case 2:  
            contratacion = 'CONCURSO DE PRECIOS' 
            break;
        case 3:  
            contratacion = 'CONTRATACION DIRECTA' 
            break;
        case 4:  
            contratacion = 'LICITACION PRIVADA' 
            break;    
    }
    return contratacion;
}


// BOTON VOLVER INICIO a.text-gray-500.px-10.font-semibold.py-3.border-2.border-solid.shadow-md.cursor-pointer.rounded-sm.justify-items-end(class= "shadow-lg shadow-blue-500/50" href="/inicio/inicio") INICIO

export {

    TipoContratacionLabel
}



// table.table-auto.text-sm.border-collapse.border.border-slate-600(class="shadow-lg shadow-gray-500/50")
// thead.bg-gray-200
//     tr
//         th.border.border-slate-300.px-4 TIPO DOC
//         th.border.border-slate-300.px-4 DNI TITULAR
//         th.border.border-slate-300.px-4 ADJUDICATARIO
//         th.border.border-slate-300.px-4 COTITULAR
//         th.border.border-slate-300.px-4 TIPO DOC COTITULAR
//         th.border.border-slate-300.px-4 DNI COTITULAR
//         th.border.border-slate-300.px-4 PARENTESTO
//         th.border.border-slate-300.px-4 DTPO  
//         th.border.border-slate-300.px-3 LOC
//         th.border.border-slate-300.px-4 BARRIO 
//         th.border.border-slate-300.px-4 DOMICILIO
//         th.border.border-slate-300.px-4 CASA
//         th.border.border-slate-300.px-4 RES
//         th.border.border-slate-300.px-4 FECHA ADJ 
        
        
// tbody
    
//     each item in existeConsulta? existeConsulta:''    

        
//         tr
//             td.border.border-slate-300.px-4= item.TIPO_DOC
//             td.border.border-slate-300.px-4= item.DNI
//             td.border.border-slate-300.px-4= item.ADJUDICATARIO
//             td.border.border-slate-300.px-4= item.COTITULAR
//             td.border.border-slate-300.px-4= item.TDOC_COT
//             td.border.border-slate-300.px-4= item.PARENTESCO 
//             td.border.border-slate-300.px-4= item.DEPARTAMENTO 
//             td.border.border-slate-300.px-4= item.nom_loc 
//             td.border.border-slate-300.px-4= item.BARRIO 
//             td.border.border-slate-300.px-4= item.DOM 
//             td.border.border-slate-300.px-4= item.CASA 
//             td.border.border-slate-300.px-4= item.RES 
//             td.border.border-slate-300.px-4= item.FEA
            
            