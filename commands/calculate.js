const { SlashCommandBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("calculate")
		.setDescription("Calculate a given math expression.")
		.addStringOption((option) =>
			option
				.setName("math")
				.setDescription("Math expression to calculate")
				.setRequired(true)
		),
	async execute(interaction, client) {
		await interaction.deferReply({ ephemeral: true });

		let math = interaction.options.getString("math");
        const compute = (math = '') => {
            let total = 0;
            math = math.match(/[+\−]*(\.\d+|\d+(\.\d+)?)/g) || [];
            while (math.length) {
                total += parseFloat(math.shift());
            };
            return total.toString();
        };

		await interaction.editReply({ content: compute(math), ephemeral: true });
	},
};
