package platform

import (
	"log"
	"path/filepath"
	"unicode/utf8"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// DocumentLoader loads a document given an absolute or relative filepath.
type DocumentLoader interface {
	LoadFile(filePath string) (interface{}, error)
}

// WindowFocuser manages restoring and bringing the window to the front.
type WindowFocuser interface {
	Focus()
	Show() application.Window
	Restore()
	IsMinimised() bool
}

// HandleMacOpenFile handles a path received from macOS Launch Services or Cocoa delegate,
// loads the document, emits events, and requests window focus.
func HandleMacOpenFile(filePath string, app *application.App, loader DocumentLoader, window WindowFocuser) {
	if filePath == "" {
		return
	}

	log.Printf("[LaunchServices/macOS] Received file: %s (valid UTF-8: %t)",
		filePath, utf8.ValidString(filePath))

	if !filepath.IsAbs(filePath) {
		if absPath, err := filepath.Abs(filePath); err == nil {
			filePath = absPath
		}
	}

	if loader != nil {
		doc, err := loader.LoadFile(filePath)
		if err != nil {
			log.Printf("[LaunchServices/macOS] Failed to load file %s: %v", filePath, err)
		} else if doc != nil && app != nil {
			app.Event.Emit("document:open", doc)
		}
	}

	if app != nil {
		app.Event.Emit("file:open", filePath)
	}

	if window != nil {
		if window.IsMinimised() {
			window.Restore()
		}
		window.Show()
		window.Focus()
	}
}

// SetupMacOpenFileHandler hooks into Wails v3 ApplicationOpenedWithFile events
// delivered via Cocoa's application:openFile: / application:openFiles: delegate.
func SetupMacOpenFileHandler(app *application.App, loader DocumentLoader, window WindowFocuser) {
	if app == nil {
		return
	}

	app.Event.OnApplicationEvent(events.Common.ApplicationOpenedWithFile, func(event *application.ApplicationEvent) {
		ctx := event.Context()
		if ctx == nil {
			return
		}
		HandleMacOpenFile(ctx.Filename(), app, loader, window)
	})
}
