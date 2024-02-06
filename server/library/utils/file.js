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

module.exports.saveJsonToFile = saveJsonToFile;
