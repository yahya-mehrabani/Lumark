package settings

const (
	// CurrentSchemaVersion is the version identifier for settings schema v1.
	CurrentSchemaVersion = 1

	// Theme options (FR-SET-001)
	ThemeSystem = "system"
	ThemeLight  = "light"
	ThemeDark   = "dark"

	// Direction options (FR-SET-001)
	DirectionAuto = "auto"
	DirectionRTL  = "rtl"
	DirectionLTR  = "ltr"

	// Default numeric values
	DefaultZoom      = 1.0
	DefaultMaxRecent = 10
)

// SettingsDTO defines the versioned configuration schema for user preferences.
// In accordance with FR-SET-003 (Data Minimization), it never stores document text,
// credentials, browsing history, or telemetry.
type SettingsDTO struct {
	SchemaVersion       int      `json:"schemaVersion"`
	Theme               string   `json:"theme"`
	DefaultDirection    string   `json:"defaultDirection"`
	DefaultZoom         float64  `json:"defaultZoom"`
	RestoreOpenTabs     bool     `json:"restoreOpenTabs"`
	OpenTabs            []string `json:"openTabs,omitempty"`
	MaxRecentFiles      int      `json:"maxRecentFiles"`
	ShowTableOfContents *bool    `json:"showToc,omitempty"`
	TocPosition         string   `json:"tocPosition,omitempty"`
}

// DefaultSettings returns a fresh SettingsDTO initialized to canonical defaults.
func DefaultSettings() SettingsDTO {
	defaultShowTOC := true
	return SettingsDTO{
		SchemaVersion:       CurrentSchemaVersion,
		Theme:               ThemeSystem,
		DefaultDirection:    DirectionAuto,
		DefaultZoom:         DefaultZoom,
		RestoreOpenTabs:     true,
		OpenTabs:            []string{},
		MaxRecentFiles:      DefaultMaxRecent,
		ShowTableOfContents: &defaultShowTOC,
		TocPosition:         "left",
	}
}

// NormalizeAndValidate ensures all fields adhere to valid enumerated options and safe bounds.
func (s *SettingsDTO) NormalizeAndValidate() {
	if s.SchemaVersion <= 0 {
		s.SchemaVersion = CurrentSchemaVersion
	}

	switch s.TocPosition {
	case "left", "right", "auto":
	default:
		s.TocPosition = "left"
	}

	switch s.Theme {
	case ThemeSystem, ThemeLight, ThemeDark:
	default:
		s.Theme = ThemeSystem
	}

	switch s.DefaultDirection {
	case DirectionAuto, DirectionRTL, DirectionLTR:
	default:
		s.DefaultDirection = DirectionAuto
	}

	// DefaultZoom accepts 0.5 to 2.5 factor, or percentage 50 to 250
	if s.DefaultZoom < 0.5 || s.DefaultZoom > 2.5 {
		if s.DefaultZoom >= 50.0 && s.DefaultZoom <= 250.0 {
			s.DefaultZoom = s.DefaultZoom / 100.0
		} else {
			s.DefaultZoom = DefaultZoom
		}
	}

	if s.MaxRecentFiles <= 0 || s.MaxRecentFiles > 100 {
		s.MaxRecentFiles = DefaultMaxRecent
	}

	if s.OpenTabs == nil {
		s.OpenTabs = []string{}
	}

	if s.ShowTableOfContents == nil {
		t := true
		s.ShowTableOfContents = &t
	}
}
