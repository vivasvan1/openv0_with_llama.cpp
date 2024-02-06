const fs = require("fs");
const { Schema } = require("mongoose");
const schema = require("schm");
const { validate } = schema;
require("dotenv").config();
const path = require("path");

const { ChatOllama } = require("@langchain/community/chat_models/ollama");
const { HumanMessage } = require("@langchain/core/messages");
const { saveJsonToFile } = require("../../../../library/utils/file.js");
const {
  DEBUG_design_component_new_from_description: DEBUG,
  SKIP_design_component_new_from_description: SKIP,
} = require("../../../../library/utils/debug.js");

// Setup Ollama client with baseUrl pointing to your local Ollama server
const ollama = new ChatOllama({
  baseUrl: "http://localhost:11434", // Assuming this is where your Ollama server is running
  model: "mistral:instruct",
  temperature: 1.1,
});

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
        LIBRARY_COMPONENTS_MAP[framework][components] =
          require(`../../../../library/components/${framework}/${components}/dump.json`).map(
            (e) => {
              return {
                name: e.name,
                description: e.description,
              };
            }
          );
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
        library_component_usage_reason: String,
      },
    ],
  };

  const context = [
    new HumanMessage({
      content:
        `Your task is to design a new ${req.query.framework} component for a web app, Description of the component is \`\`\`${req.query.description}\`\`\`.\n` +
        `If you judge it is relevant to do so, you can specify pre-made library components to use in the task.\n` +
        +`You can also specify the use of icons if you see that the user's request requires it.`,
    }),
    new HumanMessage({
      content:
        "Multiple library components can be used while creating a new component in order to help you do a better design job, faster.\n\nAVAILABLE LIBRARY COMPONENTS:\n```\n" +
        LIBRARY_COMPONENTS_MAP[req.query.framework][req.query.components]
          .map((e) => {
            return `${e.name} : ${e.description};`;
          })
          .join("\n") +
        "\n```",
    }),
    new HumanMessage({
      content:
        "\n\n Your answer should be without any explaination and must contain only and only valid JSON of the following schema wrapped in ```json\n <Your_answer>```. \n" +
        `${JSON.stringify(components_schema)}` +
        "\n",
    }),

    // new HumanMessage({
    //   content: "Output:",
    // }),
  ];

  // Save the context object as a JSON file for debugging purposes
  DEBUG && saveJsonToFile(context, __dirname + "/" + "gptPrompt.json");

  let completion = "";
  if (!SKIP) {
    // Stream the context through the Ollama chat model to generate a response
    const stream = await ollama.stream(context);

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
    // Save the completion string as a JSON file for debugging purposes
    DEBUG && saveJsonToFile(completion, path.join(__dirname, "gptReply.json"));
  } else {
    completion = fs
      .readFileSync(path.join(__dirname, "gptReply.json"))
      .toString();
  }
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

  // Save the extracted generated code as a JSON file for debugging purposes
  saveJsonToFile(generated_code, __dirname + "/generated_code.json");

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
