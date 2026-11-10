; NSIS Modern User Interface
; Installer script for Markdown Viewer (Windows x64)
; Satisfies PRD Section 11.2, FR-OPEN-003, and ADR-0001

Unicode true

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

; Product Definitions
!define PRODUCT_NAME "Lumark"
!define PRODUCT_VERSION "0.1.0"
!define PRODUCT_PUBLISHER "Lumark Team"
!define PRODUCT_WEB_SITE "https://github.com/personal/lumark"
!define PRODUCT_EXE "Lumark.exe"
!define PROGID "Lumark.Document"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

Name "${PRODUCT_NAME} ${PRODUCT_VERSION}"
OutFile "..\..\bin\Lumark-installer.exe"
InstallDir "$LOCALAPPDATA\Programs\Lumark"
InstallDirRegKey HKCU "Software\${PRODUCT_NAME}" "InstallDir"
RequestExecutionLevel user

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "..\..\build\windows\icon.ico"
!define MUI_UNICON "..\..\build\windows\icon.ico"

; Version Information & Application Metadata (PRD Section 11.1, 11.2)
VIProductVersion "${PRODUCT_VERSION}.0"
VIFileVersion    "${PRODUCT_VERSION}.0"

VIAddVersionKey "CompanyName"     "${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Installer"
VIAddVersionKey "ProductVersion"  "${PRODUCT_VERSION}"
VIAddVersionKey "FileVersion"     "${PRODUCT_VERSION}"
VIAddVersionKey "LegalCopyright"  "© 2026, ${PRODUCT_PUBLISHER}"
VIAddVersionKey "ProductName"     "${PRODUCT_NAME}"
VIAddVersionKey "Comments"        "Fast, secure, local-first Markdown document viewer"

; Enable HiDPI support
ManifestDPIAware true

; Branding text
BrandingText "${PRODUCT_NAME} v${PRODUCT_VERSION}"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; WebView2 Runtime Prerequisite Verification (PRD Section 11.2, US-029.3)
Function CheckWebView2
    SetRegView 64
    ; Check HKLM WOW6432Node for Microsoft Edge WebView2 Evergreen Runtime
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
    ${If} $0 != ""
        Return
    ${EndIf}

    ; Check HKLM WOW6432Node for alternative WebView2 Runtime GUID
    ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${If} $0 != ""
        Return
    ${EndIf}

    ; Check HKCU for per-user WebView2 Runtime installation
    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-6E4F-4275-A2A8-CD2D769E2C34}" "pv"
    ${If} $0 != ""
        Return
    ${EndIf}

    ReadRegStr $0 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    ${If} $0 != ""
        Return
    ${EndIf}

    ; WebView2 runtime was not detected; prompt user with approved installation flow
    IfSilent silentExit promptUser
    silentExit:
        DetailPrint "Warning: Microsoft Edge WebView2 Runtime is required but not detected."
        Return
    promptUser:
        MessageBox MB_YESNO|MB_ICONEXCLAMATION \
            "Lumark requires the Microsoft Edge WebView2 Runtime to display documents.$\r$\n$\r$\nWebView2 Runtime was not detected on this system.$\r$\n$\r$\nWould you like to open the official Microsoft WebView2 download page now?" \
            IDYES openBrowser IDNO continueInstall
    openBrowser:
        ExecShell "open" "https://go.microsoft.com/fwlink/p/?LinkId=2124703"
    continueInstall:
FunctionEnd

Function .onInit
    Call CheckWebView2
FunctionEnd

Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    SetOverwrite ifnewer

    ; Place main executable
    File "/oname=${PRODUCT_EXE}" "..\..\bin\Lumark.exe"

    ; Create Start Menu and Desktop shortcuts
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"
    CreateShortcut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    CreateShortcut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_EXE}"

    ; Register Product-Owned ProgID
    ; HKCU\Software\Classes\Lumark.Document
    WriteRegStr HKCU "Software\Classes\${PROGID}" "" "Markdown Document"
    WriteRegStr HKCU "Software\Classes\${PROGID}" "FriendlyTypeName" "Markdown Document"
    WriteRegStr HKCU "Software\Classes\${PROGID}" "CurVer" "${PROGID}"
    WriteRegStr HKCU "Software\Classes\${PROGID}\DefaultIcon" "" "$INSTDIR\${PRODUCT_EXE},0"
    WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open" "FriendlyAppName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "Software\Classes\${PROGID}\shell\open\command" "" '"$INSTDIR\${PRODUCT_EXE}" "%1"'

    ; Register as Open With handler under OpenWithProgids for supported Markdown extensions
    ; NOTE: PRD Section 11.2 strictly prohibits overriding user default choices.
    ; Registering under OpenWithProgids presents Lumark in Windows "Open with"
    ; and "Choose another app" menus while respecting user default choice.
    WriteRegNone HKCU "Software\Classes\.md\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.markdown\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.mdown\OpenWithProgids" "${PROGID}"
    WriteRegNone HKCU "Software\Classes\.mkd\OpenWithProgids" "${PROGID}"

    ; Register in Windows OpenWithList and Applications key for discovery
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}" "FriendlyAppName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\SupportedTypes" ".md" ""
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\SupportedTypes" ".markdown" ""
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\SupportedTypes" ".mdown" ""
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\SupportedTypes" ".mkd" ""
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\shell\open" "FriendlyAppName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_EXE}\shell\open\command" "" '"$INSTDIR\${PRODUCT_EXE}" "%1"'

    ; Register application capabilities for Windows Default Programs registration
    ; (PRD Section 11.2 & FR-OPEN-003 - Enables app in "Default Apps" settings while preserving user default preferences)
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities" "ApplicationName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities" "ApplicationDescription" "Fast, secure, local-first Markdown document viewer"
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".md" "${PROGID}"
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".markdown" "${PROGID}"
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mdown" "${PROGID}"
    WriteRegStr HKCU "Software\${PRODUCT_NAME}\Capabilities\FileAssociations" ".mkd" "${PROGID}"
    WriteRegStr HKCU "Software\RegisteredApplications" "${PRODUCT_NAME}" "Software\${PRODUCT_NAME}\Capabilities"

    ; Notify Windows Shell of file association changes
    System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

    ; Write Uninstallation Keys
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${PRODUCT_NAME}"
    WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\uninstall.exe"'
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${PRODUCT_EXE}"
    WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKCU "${UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
    ; Remove shortcuts
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"

    ; Remove installed files
    Delete "$INSTDIR\${PRODUCT_EXE}"
    Delete "$INSTDIR\uninstall.exe"
    RMDir "$INSTDIR"

    ; Clean up product-owned registry associations
    ; Remove ProgID
    DeleteRegKey HKCU "Software\Classes\${PROGID}"

    ; Remove OpenWithProgids entries without touching user preferences or unrelated handlers
    DeleteRegValue HKCU "Software\Classes\.md\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.markdown\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.mdown\OpenWithProgids" "${PROGID}"
    DeleteRegValue HKCU "Software\Classes\.mkd\OpenWithProgids" "${PROGID}"

    ; Remove application open-with registration
    DeleteRegKey HKCU "Software\Classes\Applications\${PRODUCT_EXE}"

    ; Remove Windows Default Programs registration
    DeleteRegValue HKCU "Software\RegisteredApplications" "${PRODUCT_NAME}"

    ; Remove product capabilities and installation keys
    DeleteRegKey HKCU "Software\${PRODUCT_NAME}"

    ; Remove uninstallation entry
    DeleteRegKey HKCU "${UNINST_KEY}"

    ; Notify Windows Shell of file association changes
    System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
SectionEnd
