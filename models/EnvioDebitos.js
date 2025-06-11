import {db_viviendas_fonavi } from "../config/db.js";
import {DataTypes} from 'sequelize'

const EnvioDebitos = db_viviendas_fonavi.define('ENVIO_DEBITO',{
    COD:           {       type: DataTypes.STRING,     allowNull:false},
    COD_DEB:       {       type: DataTypes.STRING,     allowNull:false},
    SUCURSAL:      {       type: DataTypes.STRING,     allowNull:false},
    NRO_AGENTE:    {       type: DataTypes.STRING,     allowNull:false},
    APEYNOM:       {       type: DataTypes.STRING,     allowNull:false},
    DNI_DESC:      {       type: DataTypes.STRING,     allowNull:false,primaryKey: true  ,autoIncrement: false },
    TAREA:         {       type: DataTypes.STRING,     allowNull:false},
    MTO_TOTAL:     {       type: DataTypes.STRING,     allowNull:false},
    PLAZO:         {       type: DataTypes.STRING,     allowNull:false},
    MTO_CUO:       {       type: DataTypes.STRING,     allowNull:false},
    DESC_PT:       {       type: DataTypes.STRING,     allowNull:false},
    MTO_ADIC:      {       type: DataTypes.STRING,     allowNull:false},
    MTO_INT:       {       type: DataTypes.STRING,     allowNull:false},
    MTO_DEUDA:     {       type: DataTypes.STRING,     allowNull:false},
    MTO_SEG:       {       type: DataTypes.STRING,     allowNull:false},
    GTS_ADM:       {       type: DataTypes.STRING,     allowNull:false},
    FEC_ENVIO:     {       type: DataTypes.DATE,     allowNull:false},  
    FEC_VTO:       {       type: DataTypes.DATE,     allowNull:false},
    OBSERV:        {       type: DataTypes.STRING,     allowNull:false},
    CUO_DES:       {       type: DataTypes.STRING,     allowNull:false},
    CUO_HAS:       {       type: DataTypes.STRING,     allowNull:false},
    USUARIO:       {       type: DataTypes.STRING,     allowNull:false},
    FECHA_PROCESO: {       type: DataTypes.STRING,     allowNull:false},
    EQUIPO:        {       type: DataTypes.STRING,     allowNull:false},
    NRO:           {       type: DataTypes.STRING,     allowNull:false},
    CON_DEUDA:     {       type: DataTypes.STRING,     allowNull:false},
    UVI:           {       type: DataTypes.STRING,     allowNull:false},
    FECHA_UVI:     {       type: DataTypes.DATE,     allowNull:false},

    },
    {
        timestamps: false,
        freezeTableName: true


    }
)

export default EnvioDebitos;