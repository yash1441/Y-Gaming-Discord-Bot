const { SlashCommandBuilder } = require("discord.js");
const logger = require("../Logger/logger.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ai")
		.setDescription("Say something to the AI.")
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("Enter your prompt here")
				.setRequired(true)
		),
	async execute(interaction) {
		await interaction.reply({ content: `Reading your prompt...`, ephemeral: false });

		const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});

        const prompt = interaction.options.getString("prompt");
        const result = await model.generateContent(prompt).catch();
        if (!result) return await interaction.editReply({ content: "Sorry! I am currently unavailable." });
        const response = result.response;
        const text = response.text();

		await interaction.editReply({ content: text });
	},
};
