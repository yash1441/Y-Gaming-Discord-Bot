const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const request = require("request-promise");
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
	organization: process.env.OPENAI_ORG,
	apiKey: process.env.OPENAI_KEY,
});
const openai = new OpenAIApi(configuration);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("chatgpt")
		.setDescription("Talk to ChatGPT")
		.addStringOption((option) =>
			option
				.setName("prompt")
				.setDescription("Your text prompt")
				.setRequired(true)
		),
	async execute(interaction, client) {
		await interaction.reply({ content: "Getting your login info..." });

		const gptResponse = await openai.createCompletion({
			model: "davinci",
			prompt: `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.\n\n${message.author.username}: Hello, who are you?\nAI: I am an AI created by OpenAI. How can I help you today?\n${message.author.username}: ${message.content}\nAI:`,
			temperature: 0.9,
			max_tokens: 100,
			stop: ["\n", `${message.author.username}:`, "AI:"],
		});

		await message.editReply(gptResponse.data.choices[0].text);
	},
};
