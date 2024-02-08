// OllamaStrategy.js
const fs = require("fs");
const { saveJsonToFile } = require("../../../../library/utils/file.js");
const IBackendStrategy = require("../IAgentStrategy.js");
const { ChatOllama } = require("@langchain/community/chat_models/ollama");
const {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ChatMessage,
} = require("@langchain/core/messages");
const path = require("path");

const {
  DEBUG_design_component_new_from_description,
  SKIP_design_component_new_from_description,

  DEBUG_generate_component_new,
  SKIP_generate_component_new,
} = require("../../../../library/utils/debug.js");

class OllamaStrategy extends IBackendStrategy {
  constructor() {
    super();
    // Setup Ollama client with baseUrl pointing to your local Ollama server
    this.ollama = new ChatOllama({
      baseUrl: process.env.BACKEND_BASE_URL, // Assuming this is where your Ollama server is running
      model: process.env.BACKEND_MODEL,
      temperature: parseFloat(process.env.BACKEND_TEMPERATURE),
    });
  }

  /**
   * Ollama returns a string with JSON component context
   * @param {*} req
   * @returns string
   */
  async design_component_new_from_description(req) {
    let completion = "";

    // If SKIP is enabled return content from file
    if (SKIP_design_component_new_from_description) {
      const filePath = path.normalize(
        path.join(
          __dirname,
          "..",
          "..",
          "passes",
          "design-component-new-from-description",
          "gptReply.json"
        )
      );
      completion = fs.readFileSync(filePath).toString();
      return completion;
    }

    let context = [
      {
        role: `user`,
        content:
          `Your task is to design a new ${req.query.framework} component for a web app, Description of the component is \`\`\`${req.query.description}\`\`\`.\n` +
          `If you judge it is relevant to do so, you can specify pre-made library components to use in the task.\n` +
          +`You can also specify the use of icons if you see that the user's request requires it.`,
      },
      {
        role: `user`,
        content:
          "Multiple library components can be used while creating a new component in order to help you do a better design job, faster.\n\nAVAILABLE LIBRARY COMPONENTS:\n```\n" +
          req.LIBRARY_COMPONENTS_MAP[req.query.framework][req.query.components]
            .map((e) => {
              return `${e.name} : ${e.description};`;
            })
            .join("\n") +
          "\n```" +
          "\nIMPORTANT: You can not import anything other than above mentioned components from this library. \n",
      },
      {
        role: `user`,
        content:
          "\n\n Your answer should be without any explaination and must contain only and only valid JSON of the following schema wrapped in ```json\n <Your_answer>\n```. \n" +
          `${JSON.stringify(req.components_schema)}` +
          "\n",
      },
    ];

    // Save the context object as a JSON file for debugging purposes
    if (DEBUG_design_component_new_from_description) {
      const filePath = path.normalize(
        path.join(
          __dirname,
          "..",
          "..",
          "passes",
          "design-component-new-from-description",
          "gptPrompt.json"
        )
      );
      console.log(`Saving prompt to ${filePath}`);
      saveJsonToFile(context, filePath);
    }

    completion = this.generateChat({ ...req, context });

    return completion;
  }

  /**
   * Ollama returns a string which contains the code according to the framework.
   * @param {*} req
   * @returns string
   */
  async generate_component_new(req) {
    let completion = "";

    // If SKIP is enabled return content from file
    if (SKIP_generate_component_new) {
      // var func_name = arguments.callee.toString();
      // func_name = func_name.substring("function ".length);
      // func_name = func_name.substring(0, func_name.indexOf("("));

      const filePath = path.normalize(
        path.join(
          __dirname,
          "..",
          "..",
          "passes",
          "generate-component-new",
          "gptReply.json"
        )
      );
      completion = fs.readFileSync(filePath).toString();
      return completion;
    }

    completion = this.generateChat(req);

    return completion;
  }

  async generateChat(req) {
    let context = req.context.map((e) => {
      if (e.role == "user") {
        return new HumanMessage(e.content);
      } else if (e.role == "system") {
        return new HumanMessage(e.content);
      } else if (e.role == "assistant") {
        return new AIMessage(e.content);
      } else {
        return new ChatMessage(e.content);
      }
    });

    let completion = "";

    // Stream the context through the Ollama chat model to generate a response
    const stream = await this.ollama.stream(context);

    // Process each part of the stream
    for await (const part of stream) {
      try {
        // Write the content to stdout for debugging and accumulate it in the completion string
        process.stdout.write(part.content || "");
        const chunk = part.content || "";
        completion += chunk;
        // Write the chunk to the request stream
        req.stream.write(chunk);
      } catch (e) {
        // Handle any errors that occur during streaming
        false;
      }
    }

    return completion;
  }
}

module.exports = OllamaStrategy;
