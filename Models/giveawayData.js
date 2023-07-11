module.exports = (sequelize, DataTypes) => {
    return sequelize.define('giveawayData', {
        message_id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        channel_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        server_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        host: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        prize: DataTypes.STRING,
        ends_at: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            allowNull: false,
        },
        role_whitelist: {
            type: DataTypes.STRING,
            defaultValue: "0",
            allowNull: false,
        },
        role_blacklist: {
            type: DataTypes.STRING,
            defaultValue: "0",
            allowNull: false,
        },
        role_multiplier: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false,
        }
    }, {
        timestamps: false,
    });
};