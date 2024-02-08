// BackendContext.js

const IAgentStrategy = require("./IAgentStrategy");

class BackendContext extends IAgentStrategy {
  constructor(strategy) {
    super();
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  async design_component_new_from_description(req) {
    return this.strategy.design_component_new_from_description(req);
  }

  async generate_component_new(req) {
    return this.strategy.generate_component_new(req);
  }

  async generateChat(req) {
    return this.strategy.generateChat(req);
  }
}

module.exports = BackendContext;
