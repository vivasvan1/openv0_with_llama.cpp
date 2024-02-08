// OpenAIStrategy.js

const IBackendStrategy = require("../IAgentStrategy");
const { OpenAI } = require("openai");

class OpenAIStrategy extends IBackendStrategy {
  constructor(apiKey) {
    super();
    this.openai = new OpenAI({ apiKey });
  }

  async design_component_new_from_description(req) {
    const context = [
      {
        role: `system`,
        content:
          `Your task is to design a new ${req.query.framework} component for a web app, according to the user's request.\n` +
          `If you judge it is relevant to do so, you can specify pre-made library components to use in the task.\n` +
          `You can also specify the use of icons if you see that the user's request requires it.`,
      },
      {
        role: `user`,
        content:
          "Multiple library components can be used while creating a new component in order to help you do a better design job, faster.\n\nAVAILABLE LIBRARY COMPONENTS:\n```\n" +
          LIBRARY_COMPONENTS_MAP[req.query.framework][req.query.components]
            .map((e) => {
              return `${e.name} : ${e.description};`;
            })
            .join("\n") +
          "\n```",
      },
      {
        role: `user`,
        content:
          "USER QUERY : \n```\n" +
          req.query.description +
          "\n```\n\n" +
          `Design the new ${req.query.framework} web component task for the user as the creative genius you are`,
      },
    ];
  }

  async generateChat(req) {
    // Implementation for OpenAI
  }
}

module.exports = OpenAIStrategy;
