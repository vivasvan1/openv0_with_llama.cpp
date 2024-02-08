// IBackendStrategy.js

class IAgentStrategy {
  async design_component_new_from_description(req) {
    throw new Error(
      "Method design_component_new_from_description() must be implemented"
    );
  }
  async generate_component_new(req) {
    throw new Error(
      "Method generate_component_new() must be implemented"
    );
  }

  async generateChat(req) {
    throw new Error("Method generateComponentDesign() must be implemented");
  }
}
module.exports = IAgentStrategy;
