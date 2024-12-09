import { Sequelize, DataTypes } from "sequelize";

export const sequelize = new Sequelize('webapp', 'root', '54285123fox', {
    dialect: 'mysql',
    host: '139.224.44.26',
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