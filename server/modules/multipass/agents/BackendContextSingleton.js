// BackendContextSingleton.js

const BackendContext = require("./BackendContext");
const OpenAIStrategy = require("./openai/index");
const OllamaStrategy = require("./ollama/index");

class BackendContextSingleton {
  constructor() {
    throw new Error("Use BackendContextSingleton.getInstance()");
  }

  /**
   * Fetch the singleton instance of BackendContext
   * @returns {BackendContext} Returns a BackendContext object
   */
  static getInstance() {
    if (!BackendContextSingleton.instance) {
      const strategy = BackendContextSingleton.initializeStrategy();
      BackendContextSingleton.instance = new BackendContext(strategy);
    }
    return BackendContextSingleton.instance;
  }

  static initializeStrategy() {
    if (process.env.BACKEND === "openai") {
      return new OpenAIStrategy(process.env.OPENAI_API_KEY);
    } else if (process.env.BACKEND === "ollama") {
      return new OllamaStrategy();
    } else {
      throw new Error("Invalid backend configuration");
    }
  }
}

module.exports = BackendContextSingleton;
