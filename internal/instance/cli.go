package instance

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// ParsedCLI holds the result of parsing command-line arguments.
type ParsedCLI struct {
	// Files contains absolute, normalized filesystem paths for documents to open.
	Files []string
	// Help indicates whether the user requested help information (-h, --help).
	Help bool
	// Version indicates whether the user requested version information (-v, --version).
	Version bool
	// Diagnostics contains warnings or error messages encountered during argument processing.
	Diagnostics []string
	// RawArgs preserves the original arguments received.
	RawArgs []string
	// WorkingDir is the effective working directory used for path resolution.
	WorkingDir string
}

// ParseCLI parses command-line arguments and normalizes relative file paths against workingDir.
// If workingDir is empty, the current working directory from os.Getwd() is used.
func ParseCLI(workingDir string, args []string) (*ParsedCLI, error) {
	if workingDir == "" {
		wd, err := os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("resolve current working directory: %w", err)
		}
		workingDir = wd
	}

	cleanWd, err := filepath.Abs(filepath.Clean(workingDir))
	if err != nil {
		cleanWd = filepath.Clean(workingDir)
	}
	workingDir = cleanWd

	result := &ParsedCLI{
		Files:       make([]string, 0, len(args)),
		Diagnostics: make([]string, 0),
		RawArgs:     args,
		WorkingDir:  workingDir,
	}

	for i := 0; i < len(args); i++ {
		arg := args[i]
		if arg == "" {
			continue
		}

		// Handle flags
		if arg == "-h" || arg == "--help" || arg == "-help" {
			result.Help = true
			continue
		}
		if arg == "-v" || arg == "--version" || arg == "-version" {
			result.Version = true
			continue
		}
		if strings.HasPrefix(arg, "-") {
			result.Diagnostics = append(result.Diagnostics, fmt.Sprintf("unrecognized flag: %s", arg))
			continue
		}

		// Positional argument -> file path
		absPath, normErr := NormalizePath(workingDir, arg)
		if normErr != nil {
			result.Diagnostics = append(result.Diagnostics, fmt.Sprintf("failed to normalize path %q: %v", arg, normErr))
			continue
		}
		result.Files = append(result.Files, absPath)
	}

	return result, nil
}

// NormalizePath normalizes a file path relative to a base working directory.
// It resolves relative paths to absolute canonical paths and cleans directory separators.
func NormalizePath(baseDir, rawPath string) (string, error) {
	if rawPath == "" {
		return "", fmt.Errorf("empty path")
	}

	// Handle Windows-style drive letters (e.g. C:\path\to\file.md or C:/path/to/file.md)
	if len(rawPath) >= 3 && isDriveLetter(rawPath[0]) && rawPath[1] == ':' && (rawPath[2] == '\\' || rawPath[2] == '/') {
		return filepath.Clean(rawPath), nil
	}

	var target string
	if filepath.IsAbs(rawPath) {
		target = rawPath
	} else {
		target = filepath.Join(baseDir, rawPath)
	}

	absPath, err := filepath.Abs(filepath.Clean(target))
	if err != nil {
		return filepath.Clean(target), nil
	}
	return absPath, nil
}

func isDriveLetter(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
}
