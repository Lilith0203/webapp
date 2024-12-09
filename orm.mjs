import { Sequelize, DataTypes } from "sequelize";

let sqlConfig = {
    host: 'localhost',
    user: 'root',
    password: '54285123fox',
    database: 'webapp',
    port: 3306
}

if (process.env.NODE_ENV !== 'production') {
    sqlConfig = {
        host: '139.224.44.26',
        user: 'root',
        password: '54285123fox',
        database: 'webapp',
        port: 3306
    }
}

export const sequelize = new Sequelize('webapp', 'root', '54285123fox', {
    dialect: 'mysql',
    host: sqlConfig.host,
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