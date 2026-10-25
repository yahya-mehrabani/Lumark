// bridge.m — macOS Cocoa Launch Services open-file delegate bridge
//
// This file documents and establishes the Cocoa delegate protocol for handling
// file-open events on macOS (Finder double-click, Dock drag-and-drop, and Open With).
//
// In Wails v3, the native Cocoa application delegate implements:
// - application:openFile:
// - application:openFiles:
// and dispatches them via HandleOpenFile into the Go runtime event loop
// (events.Common.ApplicationOpenedWithFile), forwarding paths to the TabStore.

#import <Cocoa/Cocoa.h>

@interface MarkdownViewerOpenDelegate : NSObject <NSApplicationDelegate>
- (BOOL)application:(NSApplication *)sender openFile:(NSString *)filename;
- (void)application:(NSApplication *)sender openFiles:(NSArray<NSString *> *)filenames;
@end

@implementation MarkdownViewerOpenDelegate

- (BOOL)application:(NSApplication *)sender openFile:(NSString *)filename {
    if (!filename || [filename length] == 0) {
        return NO;
    }
    // Forwarded to Wails v3 HandleOpenFile -> events.Common.ApplicationOpenedWithFile
    return YES;
}

- (void)application:(NSApplication *)sender openFiles:(NSArray<NSString *> *)filenames {
    for (NSString *filename in filenames) {
        [self application:sender openFile:filename];
    }
    [sender replyToOpenOrPrint:NSApplicationDelegateReplySuccess];
}

@end
