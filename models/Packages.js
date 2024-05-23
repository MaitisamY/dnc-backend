import { DataTypes } from 'sequelize'
import sequelize from '../config/sequelize.js'

const Packages = sequelize.define('PACKAGES', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    duration: {
        type: DataTypes.STRING,
        allowNull: false
    },
    benefits: {
        type: DataTypes.JSON,
        allowNull: true
    },
    detail: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
}, {
    timestamps: false,
    tableName: 'packages'
})

export { Packages }