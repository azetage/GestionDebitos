import {db_viviendas_fonavi } from "../config/db.js";
import {DataTypes} from 'sequelize'

const Consultas = db_viviendas_fonavi.define('CONSULTA',{
    TIPO_DOC:           {       type: DataTypes.STRING,     allowNull:false},
    DNI:                {       type: DataTypes.STRING,     allowNull:false, primaryKey: true  ,autoIncrement: false },
    ADJUDICATARIO:      {       type: DataTypes.STRING,     allowNull:false},
    BARRIO:             {       type: DataTypes.STRING,     allowNull:false},
    CASA:               {       type: DataTypes.STRING,     allowNull:false},
    DEPARTAMENTO:       {       type: DataTypes.STRING,     allowNull:false},
    COTITULAR:          {       type: DataTypes.STRING,     allowNull:false},
    TDOC_COT:           {       type: DataTypes.STRING,     allowNull:false},
    DNI_COT:            {       type: DataTypes.STRING,     allowNull:false},
    PARENTESCO:         {       type: DataTypes.STRING,     allowNull:false},
    RES:                {       type: DataTypes.STRING,     allowNull:false},
    FEA:                {       type: DataTypes.DATE,     allowNull:false},
    nom_loc:            {       type: DataTypes.STRING,     allowNull:false},
    ACTUALIZA_VV:       {       type: DataTypes.STRING,     allowNull:false}, //ACTUALIZACION VALOR VIVIENDA
    modolic:            {       type: DataTypes.STRING,     allowNull:false}, // MODO LICITACION
    nrolic:             {       type: DataTypes.STRING,     allowNull:false}, //NUMERO DE LICITACION
    CAS1:               {       type: DataTypes.STRING,     allowNull:false}, //DESCRIPCION DE CASA DEPARTAMENTO 1ER PISO TORRE
    CAT:                {       type: DataTypes.STRING,     allowNull:false},//TIPOLOGIA
    CDO:                {       type: DataTypes.STRING,     allowNull:false},//CANTIDAD DORMITORIO
    DOM:                {       type: DataTypes.STRING,     allowNull:false},//DOMICILIO
    BAJA:               {       type: DataTypes.STRING,     allowNull:false},//DOMICILIO
    SITUACION:          {       type: DataTypes.STRING,     allowNull:false},
    TENENCIA:            {       type: DataTypes.STRING,     allowNull:false},
    
    },
    {
        timestamps: false,

    }
)

export default Consultas;