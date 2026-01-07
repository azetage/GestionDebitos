import {db_debitos } from "../config/db.js";
import {DataTypes} from 'sequelize'

const Organismos = db_debitos.define('DEBITOS',{
        COD_DEB:        {       type: DataTypes.STRING,     allowNull:false, primaryKey: true  ,autoIncrement: false },
        REGISTRA:       {       type: DataTypes.STRING,     allowNull:false},
        FORMA:          {       type: DataTypes.STRING,     allowNull:false},   
        ENVIO:          {       type: DataTypes.STRING,     allowNull:false},
        PORC_INT:       {       type: DataTypes.STRING,     allowNull:false},
        SIGLA:          {       type: DataTypes.STRING,     allowNull:false},
        TIPO_DEB:       {       type: DataTypes.STRING,     allowNull:false},
        segun:          {       type: DataTypes.STRING,     allowNull:false},
        cargo:          {       type: DataTypes.STRING,     allowNull:false},
        responsable:    {       type: DataTypes.STRING,     allowNull:false},
        USUARIO:        {       type: DataTypes.STRING,     allowNull:false},
    },
    {
        timestamps: false,
        freezeTableName: true


    }
)

export default Organismos;