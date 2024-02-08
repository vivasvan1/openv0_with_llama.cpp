const path = require("path");
const fs = require("fs");
const tiktoken = require("@dqbd/tiktoken");
const tiktokenEncoder = tiktoken.get_encoding("cl100k_base");
require("dotenv").config();

const BackendContextSingleton = require("../../agents/BackendContextSingleton.js");

const backendContext = BackendContextSingleton.getInstance();

const {
  DEBUG_generate_component_new: DEBUG,
} = require("../../../../library/utils/debug.js");
const {
  saveJsonToFile,
  extract_generated_code,
} = require("../../../../library/utils/file.js");

const FRAMEWORKS_EXTENSION_MAP = {
  react: `tsx`,
  next: `tsx`,
  svelte: `svelte`,
};

function _titleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

async function run(req) {
  console.log("> init : " + __dirname.split(path.sep).slice(-2).join(`/`));

  const design_task = req.pipeline.stages["component-design-task"].data;

  let context = [
    {
      role: `system`,
      content:
        `You are an expert at writing ${_titleCase(
          req.query.framework
        )} components.\n` +
        `Your task is to write a new ${_titleCase(
          req.query.framework
        )} component for a web app, according to the provided task details.\n` +
        `The ${_titleCase(
          req.query.framework
        )} component you write can make use of Tailwind classes for styling.\n` +
        `If you judge it is relevant to do so, you can use library components and icons.\n\n` +
        `You will write the full ${_titleCase(
          req.query.framework
        )} component code, which should include all imports.` +
        `Your generated code will be directly written to a .${
          FRAMEWORKS_EXTENSION_MAP[req.query.framework]
        } ${_titleCase(
          req.query.framework
        )} component file and used in production.`,
    },
    ...req.pipeline.stages[`component-design-context`].data,
    {
      role: `user`,
      content:
        `- COMPONENT NAME : ${design_task.name}\n\n` +
        `- COMPONENT DESCRIPTION :\n` +
        "```\n" +
        design_task.description.user +
        "\n```\n\n" +
        `- additional component suggestions :\n` +
        "```\n" +
        design_task.description.llm +
        "\n```\n\n\n" +
        `Write the full code for the new ${req.query.framework} web component, which uses Tailwind classes if needed (add tailwind dark: classes too if you can; backgrounds in dark: classes should be black), and optionally, library components and icons, based on the provided design task.\n` +
        "The full code of the new " +
        _titleCase(req.query.framework) +
        " component that you write will be written directly to a ." +
        FRAMEWORKS_EXTENSION_MAP[req.query.framework] +
        " file inside the " +
        _titleCase(req.query.framework) +
        " project. Make sure all necessary imports are done, and that your full code is enclosed with ```" +
        FRAMEWORKS_EXTENSION_MAP[req.query.framework] +
        " blocks.\n" +
        "Answer with generated code only. DO NOT ADD ANY EXTRA TEXT DESCRIPTION OR COMMENTS BESIDES THE CODE. Your answer contains code only ! component code only !\n" +
        `Important :\n` +
        `- You must use component's import statement exactly as shown in the above examples! Its very important for my career that you import correctly.` +
        `- Make sure you import provided components libraries and icons that are provided to you if you use them !\n` +
        `- Tailwind classes should be written directly in the elements class tags (or className in case of React). DO NOT WRITE ANY CSS OUTSIDE OF CLASSES. DO NOT USE ANY <style> IN THE CODE ! CLASSES STYLING ONLY !\n` +
        `- Do not use libraries or imports except what is provided in this task; otherwise it would crash the component because not installed. Do not import extra libraries besides what is provided above !\n` +
        `- DO NOT HAVE ANY DYNAMIC DATA OR DATA PROPS ! Components are meant to be working as is without supplying any variable to them when importing them ! Only write a component that render directly with placeholders as data, component not supplied with any dynamic data.\n` +
        `- DO NOT HAVE ANY DYNAMIC DATA OR DATA PROPS ! ` +
        `- Only write the code for the component; Do not write extra code to import it! The code will directly be stored in an individual ${_titleCase(
          req.query.framework
        )} .${FRAMEWORKS_EXTENSION_MAP[req.query.framework]} file !\n` +
        `${
          req.query.framework != "svelte"
            ? "- Very important : Your component should be exported as default !\n"
            : ""
        }` +
        `Write the ${_titleCase(
          req.query.framework
        )} component code as the creative genius and ${_titleCase(
          req.query.framework
        )} component genius you are - with good ui formatting.\n`,
    },
  ];
  console.dir({
    context: context.map((e) => {
      return { role: e.role, content: e.content.slice(0, 200) + " ..." };
    }),
  });

  // Save the context object as a JSON file for debugging purposes
  DEBUG && saveJsonToFile(context, path.join(__dirname, "gptPrompt.json"));

  const context_prompt_tokens = tiktokenEncoder.encode(
    context.map((e) => e.content).join("")
  ).length;
  console.log(
    `> total context prompt tokens (estimate) : ${context_prompt_tokens}`
  );

  let completion = await backendContext.generate_component_new({
    ...req,
    context,
  });

  DEBUG && saveJsonToFile(completion, path.join(__dirname, "gptReply.json"));

  req.stream.write(`\n`);

  let generated_code = ``;

  if (completion.length < 2)
    return {
      type: `component-code`,
      success: false,
      data: `No code generated`,
    };

  generated_code = extract_generated_code(completion, [
    ...Object.values(FRAMEWORKS_EXTENSION_MAP),
    "typescript",
  ]);
  return {
    type: `component-code`,
    success: true,
    data: generated_code,
  };
}

module.exports = {
  run,
};
