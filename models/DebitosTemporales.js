import {db_debitos } from "../config/db.js";
import {DataTypes} from 'sequelize'

const DebitosTemp = db_debitos.define('DebitosTemporales',{
    FEC_VTO:            {       type: DataTypes.STRING,     allowNull:false},
    CBU:                {       type: DataTypes.STRING,     allowNull:false}, 
    CBU2:               {       type: DataTypes.STRING,     allowNull:false},
    NRO_AGENTE:         {       type: DataTypes.STRING,     allowNull:false,primaryKey: false  ,autoIncrement: false },//DOMICILIO
    MONTO:              {       type: DataTypes.INTEGER,     allowNull:false},//DOMICILIO
    CODIGO:             {       type: DataTypes.STRING,     allowNull:false},
    
    },
    {
        timestamps: false,

    }
)

export default DebitosTemp;