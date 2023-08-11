const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { decodeCrosshairShareCode, crosshairToConVars } = require("csgo-sharecode");
const CSGO = require('../Utils/cs-stuff.js');
const logger = require("../Logger/logger.js");

let choices = null;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cs")
        .setDescription("Commands related to Counter-Strike.")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("rank")
                .setDescription("Get the rank of a player.")
                .addStringOption((option) =>
                    option
                        .setName("steam-id")
                        .setDescription("Enter the Steam ID of the player. Example: STEAM_1:1:123456789")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("crosshair")
                .setDescription("Get the crosshair settings.")
                .addStringOption((option) =>
                    option
                        .setName("crosshair-code")
                        .setDescription("Enter the crosshair code.")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("item")
                .setDescription("Show information about an in-game item.")
                .addStringOption((option) =>
                    option
                        .setName("item-name")
                        .setDescription("Enter the item name.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        await fetchChoices();
		const filtered = choices.filter(choice => {
            const words = focusedValue.toLowerCase().split(" ");
            return words.every(word => choiceLower.includes(word)) || words.some(word => choiceLower.includes(word));
        });
        let options;
        if (filtered.length > 25) {
            options = filtered.slice(0, 25);
        } else {
            options = filtered;
        }
		await interaction.respond(
			options.map(choice => ({ name: choice, value: choice })),
		);
    },
    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();

        if (subCommand === "rank") {
            await interaction.reply({ content: "Checking if it is a valid Steam ID..." });
            const steamId = interaction.options.getString("steam-id");
            if (!steamId.startsWith("STEAM_")) {
                return await interaction.editReply({ content: `\`${steamId}\` is an invalid Steam ID.` });
            }

            const embed = await CSGO.getPlayerEmbed(steamId);

            if (embed == 0) return await interaction.editReply({ content: `No matches have been added for \`${steamId}\`.` });
            if (embed == -1) return await interaction.editReply({ content: `An error occured while fetching data for \`${steamId}\`.` });
            await interaction.editReply({ content: "", embeds: [embed] });
        } else if (subCommand === "crosshair") {
            await interaction.reply({ content: "Checking if it is a valid crosshair code..." });

            const shareCode = interaction.options.getString("crosshair-code");
            try {
                const crosshairConfig = decodeCrosshairShareCode(shareCode)
                const crosshairConVars = crosshairToConVars(crosshairConfig);
                await interaction.editReply({ content: `\`\`\`js\n${crosshairConVars}\n\`\`\`` });
            } catch {
                await interaction.editReply({ content: `Invalid crosshair code.` });
            }
        } else if (subCommand === "item") {
            await interaction.deferReply({ ephemeral: true });
            const itemName = interaction.options.getString("item-name");
            await interaction.editReply({ content: itemName });
        }
    },
};

async function fetchChoices() {
    if (choices === null) {
        choices = await CSGO.getSkinNamesList();
    }
}