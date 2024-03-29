const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, bold, italic, hyperlink } = require("discord.js");
//const { decodeCrosshairShareCode, crosshairToConVars } = require("csgo-sharecode");
const CSGO = require('../Utils/cs-stuff.js');
const logger = require("../Logger/logger.js");

let choices = null, wears = null;

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
        /*.addSubcommand((subcommand) =>
            subcommand
                .setName("crosshair")
                .setDescription("Get the crosshair settings.")
                .addStringOption((option) =>
                    option
                        .setName("crosshair-code")
                        .setDescription("Enter the crosshair code.")
                        .setRequired(true)
                )
        )*/
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
                .addStringOption((option) =>
                    option
                        .setName("item-wear")
                        .setDescription("Enter the item wear.")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("stattrak")
                        .setDescription("Whether the item is StatTrak™.")
                        .setRequired(false)
                )
        ),
    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const focusedValue = interaction.options.getFocused();
        const words = focusedValue.toLowerCase().split(" ");
        if (focusedOption.name === 'item-name') {
            await fetchChoices('names', false);
            const filtered = choices.filter(choice => {
                const choiceLower = choice.toLowerCase();
                return words.every(word => choiceLower.includes(word)) || words.some(word => choiceLower.includes(word));
            });
            filtered.sort((a, b) => {
                const aScore = words.reduce((score, word) => score + (a.toLowerCase().includes(word) ? 1 : 0), 0);
                const bScore = words.reduce((score, word) => score + (b.toLowerCase().includes(word) ? 1 : 0), 0);
                return bScore - aScore;
            });

            let options;
            if (filtered.length > 25) {
                options = filtered.slice(0, 25);
            } else {
                options = filtered;
            }
            await interaction.respond(
                options.map(choice => ({ name: choice, value: choice })),
            ).then(() => { wears = null });
        } else if (focusedOption.name === 'item-wear') {
            const itemName = interaction.options.getString("item-name");
            if (!itemName || !choices.includes(itemName)) {
                wears = ['NA'];
            } else {
                await fetchChoices('wears', itemName);
                const filtered = wears.filter(wears => {
                    const wearsLower = wears.toLowerCase();
                    return words.every(word => wearsLower.includes(word)) || words.some(word => wearsLower.includes(word));
                });

                filtered.sort((a, b) => {
                    const aScore = words.reduce((score, word) => score + (a.toLowerCase().includes(word) ? 1 : 0), 0);
                    const bScore = words.reduce((score, word) => score + (b.toLowerCase().includes(word) ? 1 : 0), 0);
                    return bScore - aScore;
                });

                await interaction.respond(
                    filtered.map(wear => ({ name: wear, value: wear })),
                );
            }
        }
    },
    async execute(interaction) {
        const subCommand = interaction.options.getSubcommand();

        if (subCommand === "rank") {
            await interaction.deferReply();
            const steamId = interaction.options.getString("steam-id");
            if (!steamId.startsWith("STEAM_")) {
                return await interaction.editReply({ content: `\`${steamId}\` is an invalid Steam ID.` });
            }

            const embeds = await CSGO.getPlayerEmbeds(steamId);

            if (embeds == 0) return await interaction.editReply({ content: `No matches have been added for \`${steamId}\`.` });
            if (embeds == -1) return await interaction.editReply({ content: `An error occured while fetching data for \`${steamId}\`.` });
            await interaction.editReply({ content: "", embeds: embeds });
        } /*else if (subCommand === "crosshair") {
            await interaction.reply({ content: "Checking if it is a valid crosshair code..." });

            const shareCode = interaction.options.getString("crosshair-code");
            try {
                const crosshairConfig = decodeCrosshairShareCode(shareCode)
                const crosshairConVars = crosshairToConVars(crosshairConfig);
                await interaction.editReply({ content: `\`\`\`js\n${crosshairConVars}\n\`\`\`` });
            } catch {
                await interaction.editReply({ content: `Invalid crosshair code.` });
            }
        }*/ else if (subCommand === "item") {
            await interaction.deferReply({ ephemeral: false });
            const itemName = interaction.options.getString("item-name");
            const itemWear = interaction.options.getString("item-wear");
            const statTrak = interaction.options.getBoolean("stattrak") ?? false;

            if (!choices.includes(itemName) && !wears.includes(itemWear)) return await interaction.editReply({ content: 'Invalid item! Please try again.' });
            let skin = (wears.includes('NA')) ? itemName : itemName + ' (' + itemWear + ')';

            if (statTrak) {
                skin = 'StatTrak™ ' + skin;
            }
            if (skin.includes('Knife')) {
                skin = '★ ' + skin;
            }
            const skinData = await CSGO.getSkinData(skin, true);

            if (!skinData || skinData.error) return await interaction.editReply({ content: skinData.error });

            const embed = new EmbedBuilder()
                .setTitle(skinData.name)
                .setDescription(italic('1CN¥ = ₹11.5'))
                .addFields(
                    { name: 'Buff Price (BUY)', value: '₹' + (parseInt(skinData.buyPrice) * 11.5).toString(), inline: true },
                    { name: 'Buff Price (SELL)', value: '₹' + (parseInt(skinData.sellPrice) * 11.5).toString(), inline: true },
                    { name: 'Steam Price', value: '₹' + (parseInt(skinData.steamPrice) * 11.5).toString(), inline: false },
                )
                .setThumbnail(skinData.image)
                .setFooter({ text: 'Item ID: ' + skinData.itemId.toString() })
                .setColor('#FFFFFF');

            const button1 = new ButtonBuilder()
                .setLabel('Screenshot')
                .setEmoji({ animated: false, name: 'buff', id: '1139648328024477697' })
                .setStyle(ButtonStyle.Link);

            if (skinData.inspectUrl) {
                button1.setURL(skinData.inspectUrl);
            } else{
                button1.setURL('https://y-gaming.in');
                button1.setDisabled(true);
            }

            const button2 = new ButtonBuilder()
                .setLabel('Steam Market')
                .setEmoji({ animated: true, name: 'steam', id: '1139647383085514883' })
                .setStyle(ButtonStyle.Link);

            if (skinData.steamUrl) {
                button2.setURL(skinData.steamUrl);
            } else{
                button2.setURL('https://y-gaming.in');
                button2.setDisabled(true);
            }

            const row = new ActionRowBuilder().addComponents(button1, button2);

            await interaction.editReply({ content: '', embeds: [embed], components: [row] });
        }
    },
};

async function fetchChoices(check, skinName) {
    if (check == 'names' && choices === null) {
        choices = await CSGO.getSkinNamesList();
    } else if (check == 'wears' && (wears === null || wears.includes('NA'))) {
        wears = await CSGO.getSkinWearsList(skinName);
    }
}