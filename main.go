package main

import (
	"context"
	"embed"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
	"unicode/utf8"

	"github.com/wailsapp/wails/v3/pkg/application"

	"markdown-viewer/internal/assets"
	"markdown-viewer/internal/dialogs"
	"markdown-viewer/internal/recents"
	"markdown-viewer/internal/settings"
	"markdown-viewer/internal/watcher"
	"markdown-viewer/spike/ipc"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var frontendAssets embed.FS

func init() {
	// Register custom events for frontend bindings
	application.RegisterEvent[string]("time")
	application.RegisterEvent[DocumentData]("document:open")
	application.RegisterEvent[watcher.FileChangeEvent]("file:changed")
	application.RegisterEvent[string]("wails:file-changed")
}

// main function serves as the application's entry point. It initializes the single-instance
// IPC coordinator, forwards arguments if another instance is running, or enters the Wails
// application and desktop window lifecycle if primary.
func main() {
	wd, err := os.Getwd()
	if err != nil {
		wd = "."
	}

	// Initialize the local-only single-instance IPC coordinator
	coord, err := ipc.New(ipc.DefaultOptions())
	if err != nil {
		log.Fatalf("[IPC] Failed to initialize coordinator: %v", err)
	}

	// Determine single-instance role (Primary listener or Secondary client)
	role, err := coord.Start(context.Background())
	if err != nil {
		log.Fatalf("[IPC] Failed to start coordinator: %v", err)
	}

	if role == ipc.RoleSecondary {
		// Another instance is already running. Forward CLI arguments and working directory to the primary instance.
		msg := ipc.Message{
			Args:       os.Args[1:],
			WorkingDir: wd,
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		if sendErr := coord.Send(ctx, msg); sendErr != nil {
			_ = coord.Close()
			log.Fatalf("[IPC/Secondary] Failed to forward arguments to primary instance: %v", sendErr)
		}

		_ = coord.Close()
		log.Printf("[IPC/Secondary] Forwarded %d argument(s) to primary instance and exiting", len(msg.Args))
		os.Exit(0)
	}

	// This process is the Primary instance
	log.Printf("[IPC/Primary] Single-instance coordinator active (socket: %s)", coord.SocketPath())

	// Initialize the scoped local asset resolver
	assetResolver, err := assets.NewScopedResolver("")
	if err != nil {
		log.Fatalf("[Assets] Failed to initialize asset resolver: %v", err)
	}

	// Initialize the spike document service
	docService := NewSpikeDocumentService(assetResolver)

	// Handle initial command-line arguments if provided
	if len(os.Args) > 1 {
		log.Printf("[IPC/Primary] Initial arguments: %v (working dir: %s)", os.Args[1:], wd)
		for _, arg := range os.Args[1:] {
			logReceivedFile("IPC/Primary", arg)
			targetFile := arg
			if !filepath.IsAbs(targetFile) {
				targetFile = filepath.Join(wd, targetFile)
			}
			if doc, loadErr := docService.LoadFile(targetFile); loadErr != nil {
				log.Printf("[DocumentService] Failed to load initial document %s: %v", targetFile, loadErr)
			} else {
				log.Printf("[DocumentService] Initial document loaded: %s (dir: %s, bytes: %d)",
					doc.Filename, doc.Dir, len(doc.Content))
			}
		}
	}

	// Initialize the versioned settings service
	settingsService, err := settings.NewService()
	if err != nil {
		log.Printf("[Settings] Failed to initialize default settings service: %v", err)
	}

	// Initialize the recent files tracking service
	recentsService, err := recents.NewService()
	if err != nil {
		log.Printf("[Recents] Failed to initialize default recents service: %v", err)
	}

	// Initialize the file watcher service for debounced live document updates
	watcherService, err := watcher.NewService()
	if err != nil {
		log.Printf("[Watcher] Failed to initialize file watcher service: %v", err)
	}

	// Create a new Wails application by providing the necessary options.
	app := application.New(application.Options{
		Name:        "markdown-viewer",
		Description: "Markdown Viewer Feasibility Spike",
		Services: []application.Service{
			application.NewService(&GreetService{}),
			application.NewService(docService),
			application.NewService(dialogs.NewService()),
			application.NewService(settingsService),
			application.NewService(recentsService),
			application.NewService(watcherService),
		},
		Assets: application.AssetOptions{
			Handler:    application.AssetFileServerFS(frontendAssets),
			Middleware: assetResolver.Middleware,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Forward watcher events to Wails frontend event bus
	if watcherService != nil {
		watcherService.OnEvent(func(event watcher.FileChangeEvent) {
			log.Printf("[Watcher] File change event: %s (%s)", event.Path, event.Type)
			app.Event.Emit("file:changed", event)
			app.Event.Emit("wails:file-changed", event.Path)
		})
	}

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Markdown Viewer (Spike Baseline)",
		// Window sized to the golden ratio (1000 / 618 ≈ 1.618).
		Width:  1000,
		Height: 618,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(6, 7, 15),
		URL:              "/",
	})

	// Ensure coordinator and watcher are cleaned up on Wails shutdown
	app.OnShutdown(func() {
		log.Println("[IPC/Primary] Application shutting down; releasing resources")
		if watcherService != nil {
			_ = watcherService.Close()
		}
		_ = coord.Close()
	})

	// Graceful termination handling for SIGINT / SIGTERM (e.g. kill $PID)
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigChan
		log.Println("[IPC/Primary] Received termination signal; stopping application")
		if watcherService != nil {
			_ = watcherService.Close()
		}
		_ = coord.Close()
		app.Quit()
	}()

	// Listen for forwarded documents from secondary instances
	go func() {
		for msg := range coord.Messages() {
			log.Printf("[IPC/Primary] Received forwarded message from secondary (working dir: %s, args: %v)", msg.WorkingDir, msg.Args)
			for _, arg := range msg.Args {
				logReceivedFile("IPC/Primary", arg)
				targetFile := arg
				if !filepath.IsAbs(targetFile) {
					targetFile = filepath.Join(msg.WorkingDir, targetFile)
				}
				if doc, loadErr := docService.LoadFile(targetFile); loadErr != nil {
					log.Printf("[DocumentService] Failed to load forwarded document %s: %v", targetFile, loadErr)
				} else {
					log.Printf("[DocumentService] Forwarded document loaded: %s (dir: %s, bytes: %d)",
						doc.Filename, doc.Dir, len(doc.Content))
					app.Event.Emit("document:open", doc)
				}
				app.Event.Emit("file:open", arg)
			}
			// Bring the main window forward and request focus
			if mainWindow != nil {
				if mainWindow.IsMinimised() {
					mainWindow.Restore()
				}
				mainWindow.Show()
				mainWindow.Focus()
			}
		}
	}()

	// Create a goroutine that emits an event containing the current time every second.
	// The frontend can listen to this event and update the UI accordingly.
	go func() {
		for {
			now := time.Now().Format(time.RFC1123)
			app.Event.Emit("time", now)
			time.Sleep(time.Second)
		}
	}()

	// Run the application. This blocks until the application has been exited.
	err = app.Run()
	_ = coord.Close()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}

// logReceivedFile logs the received path, decoded basename, UTF-8 byte sequences, and validity.
func logReceivedFile(source, arg string) {
	filename := filepath.Base(arg)
	byteSeq := fmt.Sprintf("% x", []byte(arg))
	filenameByteSeq := fmt.Sprintf("% x", []byte(filename))
	log.Printf("[%s] File received: %s (filename: %s, utf8 bytes: [%s], filename bytes: [%s], valid utf8: %t)",
		source, arg, filename, byteSeq, filenameByteSeq, utf8.ValidString(arg))
}
