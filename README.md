# POC -- Get Colors from Figma API

This repo demonstrates how to fetch design tokens, specifically colors, from a Figma file and generate theme files in JavaScript format.

## Prerequisites

- Node.js
- Yarn
- Figma API Access Token

## Setup

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install the dependencies:

   ```bash
    yarn
   ```

3. Set your Figma Access Token & File ID:

   - Create a `.env` file in the root of the project.
   - Add the following content to the `.env` file:

     ```env
     FIGMA_ACCESS_TOKEN=<your-figma-access-token>
     FIGMA_FILE_ID=<your-figma-file-id>
     ```

   Replace `<your-figma-access-token>` with your Figma access token and `<your-figma-file-id>` with the Figma file ID you want to fetch colors from.

   To get the Figma file ID, open the Figma file in the browser and copy the file ID from the URL. The file ID is the last part of the URL after the `/file/` path.

   For example, if the Figma file URL is `https://www.figma.com/file/abc123/My-Design-File`, the file ID is `abc123`.

## Usage

To run the script and generate the theme files, use the following command:

```bash
Copy code
yarn start
```
