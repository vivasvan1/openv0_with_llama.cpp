// DEBUG_* means save GptPrompt.json, GptReply.json after generation using AI
// SKIP_* means skip read local GptReply.json and don't generate using AI

// Enable/Disable All
const DEBUG_ALL = null;
const SKIP_ALL = null;


const DEBUG_design_component_new_from_description   = DEBUG_ALL || true;
const DEBUG_generate_component_new                  = DEBUG_ALL || true;
const DEBUG_validate_check_generated_component      = DEBUG_ALL || false;
const DEBUG_validate_fix_generated_component        = DEBUG_ALL || false;


const SKIP_design_component_new_from_description    = SKIP_ALL || false;
const SKIP_generate_component_new                   = SKIP_ALL || false;
const SKIP_validate_check_generated_component       = SKIP_ALL || false;
const SKIP_validate_fix_generated_component         = SKIP_ALL || false;

module.exports = {
  // design-component-new-from-description
  DEBUG_design_component_new_from_description,
  SKIP_design_component_new_from_description,

  // generate-component-new
  DEBUG_generate_component_new,
  SKIP_generate_component_new,

  // validate-fix-generated-component
  DEBUG_validate_fix_generated_component,
  SKIP_validate_fix_generated_component,

  // validate-check-generated-component
  DEBUG_validate_check_generated_component,
  SKIP_validate_check_generated_component,
};
