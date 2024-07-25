const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FIGMA_FILE_KEY = "gbbtofXtzmtsamECuD1ZqR";
const FIGMA_ACCESS_TOKEN = "figd_YOUR_FIGMA_ACCESS_TOKEN";

function rgbaToHex({ r, g, b, a }) {
  const toHex = (val) =>
    Math.round(val * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${a !== undefined ? toHex(a) : ""}`;
}

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function sanitizeKey(key) {
  return key.replace(/[^a-zA-Z0-9_]/g, "_");
}

async function getFigmaDesignTokens() {
  try {
    const {
      data: {
        meta: { styles },
      },
    } = await axios.get(
      `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/styles`,
      {
        headers: {
          "X-Figma-Token": FIGMA_ACCESS_TOKEN,
        },
      }
    );

    for (const style of styles) {
      if (style.style_type === "FILL") {
        const styleData = await getStyleById(style.node_id);
        if (styleData.fills?.[0].color) {
          const color = styleData.fills[0].color;
          const hexColor = rgbaToHex(color);

          const parts = style.name.split("/");
          const category = parts.length > 1 ? parts[0] : "uncategorized";
          const name = parts[parts.length - 1];

          const [baseName, ...modifiers] = name.split("-");
          const modifier = modifiers.join("_");

          const dirPath = path.join("./theme/", sanitizeFileName(category));
          const filePath = path.join(
            dirPath,
            `${sanitizeFileName(baseName)}.js`
          );

          ensureDirectoryExistence(filePath);

          let fileContent = {};
          if (fs.existsSync(filePath)) {
            fileContent = require(path.resolve(filePath));
          }

          const key = sanitizeKey(modifier || baseName);
          fileContent[key] = { color: hexColor };

          const fileContentString = `module.exports = ${JSON.stringify(
            fileContent,
            null,
            2
          )};\n`;

          fs.writeFileSync(filePath, fileContentString);
        }
      }
    }

    console.log("Theme files generated successfully!");
  } catch (error) {
    console.error(
      "Error fetching design tokens:",
      error.response ? error.response.data : error.message
    );
  }
}

async function getStyleById(nodeId) {
  try {
    const {
      data: { nodes },
    } = await axios.get(
      `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/nodes?ids=${nodeId}`,
      {
        headers: {
          "X-Figma-Token": FIGMA_ACCESS_TOKEN,
        },
      }
    );
    return nodes[nodeId].document;
  } catch (error) {
    console.error(
      `Error fetching style ${nodeId}:`,
      error.response ? error.response.data : error.message
    );
    return null;
  }
}

getFigmaDesignTokens();
