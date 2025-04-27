# files-cleanup

## Overview

`files-cleanup` is a Model Context Protocol (MCP) server tool designed to identify potentially useless files and duplicate files within a specified directory. It recursively scans the directory up to a defined depth, checking for empty files and files with identical content (based on MD5 hash).

This tool can be valuable for decluttering your file system and recovering disk space.

## Features

- **Finds empty files:** Identifies files with zero size.
- **Detects duplicate files:** Uses MD5 hashing to find files with the same content.
- **Configurable search depth:** Allows you to limit the recursion level to avoid scanning too many directories.
- **Configurable file limit:** Sets a maximum number of files to process to prevent excessive execution time.
- **Handles errors gracefully:** Reports issues like inaccessible directories or read errors.
- **Provides clear output:** Lists the potentially useless files and duplicate groups with their paths.
- **Respects common exclusion patterns:** Skips `node_modules` and `.git` directories by default.
- **Limits processing per directory:** Processes a maximum of 100 items per directory to improve responsiveness in very large directories.
- **Time and file count limits:** Stops scanning when a maximum execution time or file count is reached.

## Usage

This MCP server exposes a single tool: `find-useless-files`. To use it, you need an MCP client that can connect to this server via the standard input/output (stdio) transport.

The `find-useless-files` tool accepts the following parameters:

```json
{
  "directory": "string", // Required: The directory to search
  "maxDepth": "number", // Optional: Maximum directory depth to search (default: 5, max: 10)
  "maxFiles": "number" // Optional: Maximum number of files to process (default: 1000)
}
```

The tool returns a result with a `content` array containing text blocks. This output will list:

- The number of potentially useless files found.
- A list of the potentially useless files with reasons (e.g., "(empty file)").
- The number of duplicate files found.
- A list of duplicate files, indicating the original file for each duplicate (e.g., "path/to/duplicate.txt (duplicate of path/to/original.txt)").
- Error messages if any issues occurred during the scan.

## Getting Started

1.  **Save the code:** Save the provided code as a `.mjs` file (e.g., `files-cleanup-server.mjs`).
2.  **Install dependencies:** Make sure you have the necessary packages installed:

    ```bash
    npm install @modelcontextprotocol/sdk zod
    ```

3.  **Run the server:** Execute the server script using Node.js:

    ```bash
    node files-cleanup-server.mjs
    ```

    The server will start and listen for MCP client connections on its standard input and output streams.

4.  **Connect with an MCP client:** Use an MCP client to send a request to the `find-useless-files` tool, providing the `directory` parameter and optionally `maxDepth` and `maxFiles`.

## Example Interaction (Conceptual)

Assuming you have an MCP client, you might send a request like this (the exact format depends on your client):

```json
{
  "tool": "find-useless-files",
  "arguments": {
    "directory": "/path/to/your/directory",
    "maxDepth": 3
  }
}
```

The server would then process the request and return a response similar to this:

```json
{
  "content": [
    { "type": "text", "text": "Found 2 potentially useless files/directories in: /path/to/your/directory" },
    { "type": "text", "text": "/path/to/your/directory/empty_file.txt (empty file)" },
    { "type": "text", "text": "/path/to/your/directory/another_empty_dir (empty directory)" },
    { "type": "text", "text": "Found 1 duplicate files in: /path/to/your/directory" },
    { "type": "text", "text": "/path/to/your/directory/copy_of_important.txt (duplicate of /path/to/your/directory/important.txt)" }
  ]
}
```

## Important Considerations

- **"Uselessness" Definition:** Currently, the tool only considers empty files and empty directories as "useless." You might want to extend the logic in the `findUselessFiles` function to identify other types of potentially unwanted files based on your specific needs (e.g., temporary files, log files, etc.).
- **File Deletion:** This tool **only identifies** potentially useless and duplicate files. **It does not delete any files.** You will need to manually review the reported files and decide which ones to remove. **Be cautious when deleting files.**
- **Performance:** Scanning large directories with a high `maxDepth` and `maxFiles` can take a significant amount of time. Adjust these parameters based on the size of the directory you are scanning.
- **Error Handling:** While the tool includes basic error handling, you might want to add more robust error reporting and logging for production use.
- **Duplicate Detection and Large Files:** The current duplicate detection reads the entire content of each file to calculate the MD5 hash. This can be memory-intensive for very large files. For improved efficiency with large files, consider using streaming hash calculation and potentially comparing file sizes first.

## Potential Enhancements

- **More sophisticated "useless" file detection:** Implement checks for common temporary file extensions (e.g., `.tmp`, `.log`), backup files, or files based on modification dates.
- **Options to ignore specific files or patterns:** Allow users to provide a list of file names or patterns to exclude from the scan.
- **Interactive mode (with a client):** Develop an MCP client that allows users to browse the found files and selectively delete them (with a confirmation step!).
- **Progress reporting:** Provide feedback to the client about the progress of the scan, especially for long-running operations.
- **Configuration file:** Allow users to configure default values for `maxDepth`, `maxFiles`, and other options through a configuration file.

```

```
