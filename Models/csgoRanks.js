module.exports = (sequelize, DataTypes) => {
	return sequelize.define('csgoRanks', {
        steam_id: {
            type: DataTypes.STRING,
            primaryKey: true,
        },
        current_rank: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        best_rank: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        current_rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        best_rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
	}, {
		timestamps: true,
	});
};