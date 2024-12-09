import { Sequelize, DataTypes } from "sequelize";
import config from 'config'

const dbuser = config.get("mysql.user")
const dbpass = config.get("mysql.password")
const host = config.get("mysql.host")

export const sequelize = new Sequelize('webapp', dbuser, dbpass, {
    dialect: 'mysql',
    host: host,
    port: 3306,
})

//定义User
export const User = sequelize.define('User', {
    //每一列的定义
    id: {
        primaryKey: true,
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    //指定表名
    tableName: 'user'
});