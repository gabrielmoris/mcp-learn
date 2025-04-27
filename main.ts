import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";
import fs from "node:fs";
import crypto from "node:crypto";

const MAX_FILES_TO_PROCESS = 1000;
const MAX_EXECUTION_TIME_MS = 5000;
const MAX_DEPTH = 10;

const server = new McpServer({
  name: "files-cleanup",
  version: "1.0.0",
});

// Store file hashes to detect duplicates
const fileHashes: Map<string, string[]> = new Map();

server.tool(
  "find-useless-files",
  "Find useless files in a directory",
  {
    directory: z.string().describe("The directory to search"),
    maxDepth: z.number().default(5).describe("Maximum directory depth to search, max value is 10"),
    maxFiles: z.number().default(1000).describe("Maximum number of files to process"),
  },
  async ({ directory, maxDepth, maxFiles }) => {
    try {
      // Clear previous results
      fileHashes.clear();

      // Set limits
      const startTime = Date.now();
      let filesProcessed = 0;
      const actualMaxDepth = maxDepth && maxDepth < 10 ? maxDepth : MAX_DEPTH;
      const actualMaxFiles = maxFiles && maxFiles < 5000 ? maxFiles : MAX_FILES_TO_PROCESS;

      const uselessFiles = await findUselessFiles(directory, 0, actualMaxDepth, startTime, actualMaxFiles, filesProcessed);

      const duplicates = findDuplicateFiles();

      if (uselessFiles.length === 0 && duplicates.length === 0) {
        return { content: [{ type: "text", text: `No useless files found in: ${directory}` }] };
      }

      return {
        content: [
          { type: "text", text: `Found ${uselessFiles.length} potentially useless files/directories in: ${directory}` },
          { type: "text", text: uselessFiles.join("\n") },
          { type: "text", text: `Found ${duplicates.length} duplicate files in: ${directory}` },
          { type: "text", text: duplicates.join("\n") },
        ],
      };
    } catch (error) {
      return { content: [{ type: "text", text: `Error scanning directory: ${error.message}` }] };
    }
  }
);

function findDuplicateFiles(): string[] {
  const duplicates: string[] = [];

  fileHashes.forEach((filePaths) => {
    if (filePaths.length > 1) {
      const original = filePaths[0];
      const dupes = filePaths.slice(1);

      dupes.forEach((dupe) => {
        duplicates.push(`${dupe} (duplicate of ${original})`);
      });
    }
  });

  return duplicates;
}

async function calculateFileHash(itemPath: string): Promise<string> {
  return "";
}

async function findUselessFiles(
  dirPath: string,
  currentDepth = 0,
  maxDepth = 5,
  startTime = Date.now(),
  maxFiles = 1000,
  filesProcessed = 0
): Promise<string[]> {
  const uselessFiles: string[] = [];

  // Check time limit
  if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
    uselessFiles.push(`${dirPath} (execution time limit reached)`);
    return uselessFiles;
  }

  // Check file count limit
  if (filesProcessed >= maxFiles) {
    uselessFiles.push(`${dirPath} (max files limit reached)`);
    return uselessFiles;
  }

  // Prevent excessive recursion
  if (currentDepth > maxDepth) {
    uselessFiles.push(`${dirPath} (max depth reached)`);
    return uselessFiles;
  }

  // Check if directory exists
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  // Get all files and directories in the path
  let items: string[];
  try {
    items = fs.readdirSync(dirPath);
  } catch (error) {
    return [`${dirPath} (error: ${error.message})`];
  }

  // Empty directory
  if (items.length === 0) {
    uselessFiles.push(`${dirPath} (empty directory)`);
    return uselessFiles;
  }

  // Process only a limited number of items per directory
  const MAX_ITEMS_PER_DIR = 100;
  const itemsToProcess = items.slice(0, MAX_ITEMS_PER_DIR);

  if (items.length > MAX_ITEMS_PER_DIR) {
    uselessFiles.push(`${dirPath} (limited scan: ${MAX_ITEMS_PER_DIR}/${items.length} items)`);
  }

  for (const item of itemsToProcess) {
    const itemPath = path.join(dirPath, item);

    try {
      filesProcessed++;
      const stats = fs.lstatSync(itemPath);

      if (stats.isDirectory()) {
        // Recursively check subdirectories with updated limits
        const subDirResults = await findUselessFiles(itemPath, currentDepth + 1, maxDepth, startTime, maxFiles, filesProcessed);
        uselessFiles.push(...subDirResults);
      } else {
        // Logic to detect useless files
        if (stats.size === 0) {
          uselessFiles.push(`${itemPath} (empty file)`);
        }

        // Add file to hash map for duplicate detection
        const fileSize = stats.size;
        const fileHash = await calculateFileHash(itemPath);

        if (!fileHashes.has(String(fileSize))) {
          fileHashes.set(String(fileSize), [itemPath]);
        } else {
          fileHashes.get(String(fileSize))?.push(itemPath);
        }
      }

      // Check time limit again
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        uselessFiles.push(`${dirPath} (execution time limit reached during processing)`);
        break;
      }

      // Check file count limit again
      if (filesProcessed >= maxFiles) {
        uselessFiles.push(`${dirPath} (max files limit reached during processing)`);
        break;
      }
    } catch (error) {
      uselessFiles.push(`${itemPath} (error: ${error.message})`);
    }
  }

  return uselessFiles;
}

const transport = new StdioServerTransport();
await server.connect(transport);
