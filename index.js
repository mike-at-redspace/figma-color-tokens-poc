import chalk from "chalk";
import axios from "axios";
import fs from "fs";
import path from "path";

const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY;
const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const BASE_PATH = "./theme";

function rgbaToCssValue(colors, opacity = 1) {
  const { r = 0, g = 0, b = 0 } = colors || {};

  const red = Math.round(r * 255);
  const green = Math.round(g * 255);
  const blue = Math.round(b * 255);

  const validOpacity =
    !isNaN(opacity) || (opacity >= 0 && opacity <= 1) ? opacity : 1;

  if (validOpacity < 1) {
    return `rgba(${red}, ${green}, ${blue}, ${validOpacity})`;
  } else {
    const toHex = (val) => Math.round(val).toString(16).padStart(2, "0");
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }
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
  return key.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

async function updateOrCreateThemeFile(
  category,
  baseName,
  modifier,
  values,
  subDirectory = ""
) {
  const dirPath = path.join(
    BASE_PATH,
    subDirectory,
    sanitizeFileName(category)
  );
  const fileName = `${sanitizeFileName(baseName)}.js`;
  const filePath = path.join(dirPath, fileName);

  ensureDirectoryExistence(filePath);

  let fileContent = {};
  if (fs.existsSync(filePath)) {
    console.log(
      chalk.magentaBright(`Updating ${chalk.white.bold(filePath)}...`)
    );
    const data = await import(path.resolve(filePath));
    fileContent = data.default;
  } else {
    console.log(chalk.greenBright(`Creating ${chalk.white.bold(filePath)}...`));
  }

  const key = sanitizeKey(modifier || baseName);
  fileContent[key] = values;

  const fileContentString = `export default ${JSON.stringify(
    fileContent,
    null,
    2
  )};\n`;

  fs.writeFileSync(filePath, fileContentString);
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
      const styleData = await getStyleById(style.node_id);
      if (!styleData) {
        continue;
      }

      const parts = style.name.split("/");
      const category = parts.length > 1 ? parts[0] : "uncategorized";
      const name = parts[parts.length - 1];
      const [baseName, ...modifiers] = name.split("-");
      const modifier = modifiers.join("_");

      switch (style.style_type) {
        case "TEXT":
          const {
            fontFamily,
            fontSize,
            fontWeight,
            lineHeightPercentFontSize,
            transform,
          } = styleData.style;
          const textStyles = {
            fontFamily,
            fontSize: `${fontSize / 10}rem`,
            fontWeight,
            lineHeight: lineHeightPercentFontSize
              ? `${lineHeightPercentFontSize}%`
              : "normal",
            transform: transform ? transform.toLowerCase() : "none",
          };

          await updateOrCreateThemeFile(
            category,
            baseName,
            modifier,
            textStyles,
            "fonts"
          );
        case "FILL":
          const ignoreFonts = [
            "Body",
            "Body Variations",
            "Headings L",
            "Headings M",
            "Headings S",
            "Inline",
          ];
          if (styleData.fills?.[0]?.color && !ignoreFonts.includes(category)) {
            const { color, opacity } = styleData.fills[0];
            const hexColor = rgbaToCssValue(color, opacity);
            await updateOrCreateThemeFile(
              category,
              baseName,
              modifier,
              hexColor,
              "colors"
            );
          }
          break;
        case "EFFECT":
          const effect = styleData.effects[0];
          switch (effect.type) {
            case "DROP_SHADOW":
              const { color, offset, radius } = effect;
              const shadowColor = `rgba(${Math.round(
                color.r * 255
              )}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${
                Math.round(color.a * 100) / 100 || 1
              })`;
              const offsetX = offset.x || 0;
              const offsetY = offset.y || 0;
              const blurRadius = radius || 0;
              const boxShadow = `${offsetX}px ${offsetY}px ${blurRadius}px ${shadowColor}`;
              await updateOrCreateThemeFile(
                category,
                baseName,
                modifier,
                boxShadow
              );
              break;
          }
          break;
        default:
          break;
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
