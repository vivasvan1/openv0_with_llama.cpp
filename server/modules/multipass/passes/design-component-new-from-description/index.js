const fs = require("fs");
const { Schema } = require("mongoose");
const schema = require("schm");
const { validate } = schema;
require("dotenv").config();
const path = require("path");

const { saveJsonToFile } = require("../../../../library/utils/file.js");
const {
  DEBUG_design_component_new_from_description: DEBUG,
} = require("../../../../library/utils/debug.js");

const BackendContextSingleton = require("../../agents/BackendContextSingleton.js");

const backendContext = BackendContextSingleton.getInstance();

function _randomUid(length) {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

LIBRARY_COMPONENTS_MAP = {};
fs.readdirSync(`./library/components`)
  .filter((e) => !e.includes(`.`))
  .map((framework) => {
    LIBRARY_COMPONENTS_MAP[framework] = {};
    fs.readdirSync(`./library/components/${framework}`)
      .filter((e) => !e.includes(`.`))
      .map((components) => {
        LIBRARY_COMPONENTS_MAP[framework][components] = require(
          `../../../../library/components/${framework}/${components}/dump.json`
        ).map((e) => {
          return {
            name: e.name,
            description: e.description,
          };
        });
      });
  });

async function run(req) {
  console.log("> init : " + __dirname.split(path.sep).slice(-2).join(`/`));

  const components_schema = {
    new_component_name: { type: String, required: true },
    new_component_description: {
      type: String,
      required: true,
    },
    new_component_icons_elements: {
      does_new_component_need_icons_elements: { type: Boolean, required: true },
      if_so_what_new_component_icons_elements_are_needed: {
        type: [{ icon_name: { type: String } }],
      },
    },
    use_library_components: [
      {
        library_component_name: {
          type: String,
          enum: LIBRARY_COMPONENTS_MAP[req.query.framework][
            req.query.components
          ].map((e) => e.name),
        },
        library_component_usage_reason: { type: String },
      },
    ],
  };

  // Build appropriate context and fetch AI Response
  let completion = await backendContext.design_component_new_from_description({
    ...req,
    LIBRARY_COMPONENTS_MAP,
    components_schema,
  });

  // Save the completion string as a JSON file for debugging purposes
  DEBUG && saveJsonToFile(completion, path.join(__dirname, "gptReply.json"));
  DEBUG && console.log(completion);

  // Write a newline character to the request stream for formatting
  req.stream.write(`\n`);

  // Replace escaped underscores with actual underscores in the completion string
  completion = completion.replaceAll("\\_", "_");

  // Initialize variables for extracting the generated code from the completion string
  let generated_code = ``;
  let start = false;

  // Iterate over each line of the completion string
  for (let l of completion.split("\n")) {
    let skip = false;
    // Check if the line indicates the start or end of a code block
    if (["```", "```json"].includes(l.toLowerCase().trim())) {
      start = !start;
      skip = true;
    }
    // If within a code block and not skipping, append the line to the generated code
    if (start && !skip) generated_code += `${l}\n`;
  }
  // Trim any leading or trailing whitespace from the generated code
  generated_code = generated_code.trim();

  if (generated_code.length == 0) {
    generated_code = completion;
  }

  // Save the extracted generated code as a JSON file for debugging purposes
  DEBUG && saveJsonToFile(generated_code, __dirname + "/generated_code.json");

  // Initialize an empty object to hold the parsed JSON
  let json = {};
  try {
    // Attempt to parse the generated code as JSON
    json = JSON.parse(generated_code);
  } catch (e) {
    // If parsing fails, rethrow the error
    throw e;
  }

  const component_design = {
    ...{
      new_component_name: false,
      new_component_description: false,
      new_component_icons_elements: false,
      use_library_components: false,
    },
    ...eval(`(${generated_code})`),
  };

  const component_task = {
    name: `${component_design.new_component_name}_${_randomUid(5)}`,
    description: {
      user: req.query.description,
      llm: component_design.new_component_description,
    },
    icons: !component_design.new_component_icons_elements
      ? false
      : !(
            component_design.new_component_icons_elements
              .does_new_component_need_icons_elements &&
            component_design.new_component_icons_elements
              .if_so_what_new_component_icons_elements_are_needed &&
            component_design.new_component_icons_elements
              .if_so_what_new_component_icons_elements_are_needed.length
          )
        ? false
        : component_design.new_component_icons_elements.if_so_what_new_component_icons_elements_are_needed.map(
            (e) => e.icon_name.toLowerCase()
          ),
    components: !component_design.use_library_components
      ? false
      : component_design.use_library_components.map((e) => {
          return {
            name: e.library_component_name,
            usage: e.library_component_usage_reason,
          };
        }),
  };

  return {
    type: `component-design-task`,
    success: true,
    data: component_task,
  };
}

module.exports = {
  run,
};
