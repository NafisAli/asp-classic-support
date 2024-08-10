import { TextDocument, Uri, workspace } from "vscode";
import * as pathns from "path";
import * as fs from "fs";
import { output } from "./extension";

export class IncludeFile {
	constructor(path: string) {
		let path2 = path;
		if (!pathns.isAbsolute(path2))
			path2 = pathns.join(workspace.workspaceFolders[0].uri.fsPath, path2);

		this.Uri = Uri.file(path2);

		try {
			if (fs.existsSync(path2) && fs.statSync(path2).isFile())
				this.Content = fs.readFileSync(path2).toString();
		} catch (error) {
			output.appendLine(`Error: ${error}`);
		}
	}

	Content = "";

	Uri: Uri;
}

export const includes = new Map<string, IncludeFile>();

/** Matches `<!-- #include file="myfile.asp" --> */
export const includePattern = /<!--\s*#include\s*file="(.*?)"\s*-->/gi;
export const virtualInclude = /<!--\s*#include\s*virtual="(.*?)"\s*-->/gi;

/** Gets any included files in the given document. */
export function getImportedFiles(doc: TextDocument): [string, IncludeFile][] {
	const localIncludes = [];
	const processedMatches = Array<string>();

	let match: RegExpExecArray;

	// Loop through each included file
	while ((match = includePattern.exec(doc.getText())) !== null) {
		if (processedMatches.indexOf(match[1].toLowerCase())) {
			// Directory for the current doc
			const currentDirectory = pathns.dirname(doc.fileName);

			const path = pathns.resolve(currentDirectory, match[1]);

			if (checkFileExistence(path)) {
				localIncludes.push([
					`Import Statement ${match[1]}`,
					new IncludeFile(path),
				]);
			}

			processedMatches.push(match[1].toLowerCase());
		}
	}

	// Loop through each virtual included file
	while ((match = virtualInclude.exec(doc.getText())) !== null) {
		if (processedMatches.indexOf(match[1].toLowerCase())) {
			// Virtual file include path with added leading path separator if not present
			const virtualIncludePath = match[1].startsWith(pathns.sep)
				? match[1]
				: `${pathns.sep}${match[1]}`;
			// Virtual file full directory
			const docDirectory = pathns.dirname(doc.uri.path);
			// Split directory into levels
			const directoryLevels = docDirectory.split(pathns.sep);

			// Iterate through directory levels until top level reached
			while (directoryLevels.length > 1) {
				// Construct file path on current level
				const path = pathns.normalize(
					`${directoryLevels.join(pathns.sep)}${virtualIncludePath}`
				);

				// Check if file exists. If exists, add to `localIncludes` and break out of iteration
				if (checkFileExistence(path)) {
					localIncludes.push([
						`Import Statement ${virtualIncludePath}`,
						new IncludeFile(path),
					]);

					break;
				}

				directoryLevels.pop();
			}

			// Log error if top level reached and file was not found
			if (directoryLevels.length <= 1)
				output.appendLine(
					`Warning: Unable to resolve virtual file '${virtualIncludePath}'`
				);

			processedMatches.push(virtualIncludePath.toLowerCase());
		}
	}

	return localIncludes;
}

function checkFileExistence(path: string): boolean {
	try {
		if (fs.existsSync(path) && fs.statSync(path)?.isFile()) return true;
		if (fs.existsSync(`${path}.vbs`) && fs.statSync(`${path}.vbs`)?.isFile())
			return true;
	} catch (error) {
		output.appendLine(`Error: ${error}`);
	}

	return false;
}
