import { TextDocument, Uri, workspace } from "vscode";
import * as pathns from "path";
import * as fs from "fs";

export class IncludeFile {
	constructor(path: string) {
		let path2 = path;
		if (!pathns.isAbsolute(path2))
			path2 = pathns.join(workspace.workspaceFolders[0].uri.fsPath, path2);

		this.Uri = Uri.file(path2);

		if (fs.existsSync(path2) && fs.statSync(path2).isFile())
			this.Content = fs.readFileSync(path2).toString();
	}

	Content = "";

	Uri: Uri;
}

export const includes = new Map<string, IncludeFile>();

/** Matches `<!-- #include file="myfile.asp" --> , `<!-- #include virtual="virtual-folder/myfile.asp" -->`*/
export const includePattern =
	/<!--(\s+)?#include(\s+)?(?<type>virtual|file)(\s+)?=(\s+)?\"(?<filename>.*?)\"(\s+)?-->/gis;
// export const virtualInclude = /<!--\s*#include\s*virtual="(.*?)"\s*-->/ig

/** Gets any included files in the given document. */
export function getImportedFiles(doc: TextDocument): [string, IncludeFile][] {
	const localIncludes = [];
	const processedMatches = Array<string>();

	let match: RegExpExecArray;

	// Loop through each included file
	while ((match = includePattern.exec(doc.getText())) !== null) {
		if (processedMatches.indexOf(match.groups?.filename.toLowerCase())) {
			// Directory for the current doc
			const currentDirectory = pathns.dirname(doc.fileName);

			// Handle include types
			if (match.groups?.type === "file") {
				// Handle `file` include type. Relative to current doc

				const filePath = pathns.resolve(
					currentDirectory,
					match.groups?.filename
				);

				if (checkFileExistence(filePath)) {
					localIncludes.push([
						`Import Statement ${match.groups?.filename}`,
						new IncludeFile(filePath),
					]);
				}
			} else {
				// Handle `virtual` include type. Determine absolute path by scanning through directory levels

				const virtualIncludePath = match.groups?.filename.startsWith(pathns.sep)
					? match.groups?.filename
					: `${pathns.sep}${match.groups?.filename}`;
				const directory = pathns.dirname(doc.uri.path);
				const directoryLevels = directory.split(pathns.sep);

				// Iterate through directory levels until top level is reached
				while (directoryLevels.length > 1) {
					// Construct path from current level
					const virtualPath = pathns.normalize(
						`${directoryLevels.join(pathns.sep)}${virtualIncludePath}`
					);

					// Check for file existence. If found add to `localIncludes` and break out of process
					if (checkFileExistence(virtualPath)) {
						localIncludes.push([
							`Import Statement ${virtualIncludePath}`,
							new IncludeFile(virtualPath),
						]);

						break;
					}

					// Remove the depest level then continue next iteration
					directoryLevels.pop();
				}
			}

			processedMatches.push(match.groups?.filename.toLowerCase());
		}
	}

	return localIncludes;
}

// Checks is include file exists
function checkFileExistence(path: string): boolean {
	if (fs.existsSync(path) && fs.statSync(path)?.isFile()) return true;
	if (fs.existsSync(`${path}.vbs`) && fs.statSync(`${path}.vbs`)?.isFile())
		return true;

	return false;
}
