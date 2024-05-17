import { DataTypes } from 'sequelize'
import sequelize from '../config/sequelize.js'

const ScrubRecords = sequelize.define('ScrubRecords', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    date: {
        type: DataTypes.STRING,
        allowNull: false
    },
    uploaded_file: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    scrubbed_against_states: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    scrubbed_against_options: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    total_numbers: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    clean_numbers: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    bad_numbers: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    cost: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    matching_file: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    non_matching_file: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'scrub_records'
})

export { ScrubRecords }