import { Sequelize, DataTypes } from "sequelize";
import { MysqlDialect } from '@sequelize/mysql'

export const sequelize = new Sequelize({
    dialect: MysqlDialect,
    database: 'webapp',
    user: 'root',
    password: '54285123fox',
    host: 'localhost',
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