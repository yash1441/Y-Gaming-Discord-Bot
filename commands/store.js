const {
	SlashCommandBuilder,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require("discord.js");
const HenrikDevValorantAPI = require("unofficial-valorant-api");
const vapi = new HenrikDevValorantAPI();
const axios = require("axios");
const logger = require("../Logger/logger.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("store")
		.setDescription("Check store in Valorant"),
	async execute(interaction, client) {
		await interaction.deferReply();
		let store;
		await vapi
			.getFeaturedItems({
				version: "v2",
			})
			.then((response) => {
				store = response;
			})
			.catch((error) => {
				logger.error(error);
			});

		const embeds = [];

		for (const bundle of store.data) {
			const bundleUUID = bundle.bundle_uuid;
			const bundleData = await axios.get(
				`https://valorant-api.com/v1/bundles/${bundleUUID}`
			);
			const embed = new EmbedBuilder()
				.setTitle(bundleData.data.data.displayName)
				.setColor("FA4454")
				.setImage(bundleData.data.data.displayIcon);

			if (
				bundleData.data.data.promoDescription !=
				bundleData.data.data.extraDescription
			) {
				embed.setDescription(
					bundleData.data.data.extraDescription +
						"\n\n" +
						bundleData.data.data.promoDescription
				);
			} else if (bundleData.data.data.extraDescription) {
				embed.setDescription(bundleData.data.data.extraDescription);
			}

			embeds.push(embed);
		}

		await interaction.editReply({ embeds: embeds });
	},
};
