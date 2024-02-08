const fs = require("fs");
const path = require("path");

/**
 * Saves a JSON object to a file.
 *
 * @param {Object} json - The JSON object to save.
 * @param {string} filePath - The path of the file to save the JSON to.
 */
function saveJsonToFile(json, filePath) {
  // Write gptPrompt to the file
  fs.writeFileSync(
    filePath,
    typeof json == "string" ? json : JSON.stringify(json)
  );
}

/**
 *
 * @param {string} completion - String to extract the generated code from
 * @param {string[]} possible_extensions - Map of framework extensions to their start markers.
 * @returns {string}
 */
function extract_generated_code(completion, possible_extensions) {
  let generated_code = ``;

  // Method 1: Find index of start and end markers and extract the code between them
  let locateStart;
  const possibleContainerStartMarkers = [
    ...possible_extensions.map((e) => "```" + e),
    "```",
  ];

  for (let index = 0; index < possibleContainerStartMarkers.length; index++) {
    const element = possibleContainerStartMarkers[index];
    if (completion.includes(element)) {
      locateStart = completion.indexOf(element) + element.length;
      break;
    }
  }

  let locateEnd;
  const possibleContainerEndMarkers = ["```"];

  for (let index = 0; index < possibleContainerEndMarkers.length; index++) {
    const element = possibleContainerEndMarkers[index];
    if (completion.includes(element)) {
      locateEnd = completion.indexOf(element, locateStart);
      break;
    }
  }
  console.log(locateStart, locateEnd);
  // Method 2: If above method fails fall back to default method

  if (!locateStart || !locateEnd) {
    for (let l in completion.split("\n")) {
      let skip = false;
      if (
        possibleContainerStartMarkers.includes(completion.substring(0, index))
      ) {
        start = !start;
        skip = true;
      }
      if (start && !skip) generated_code += `${l}\n`;
    }
  } else {
    generated_code = completion.substring(locateStart, locateEnd);
  }
  generated_code = generated_code.trim();
  return generated_code;
}

module.exports = { saveJsonToFile, extract_generated_code };
