APP_NAME ?= Lumark
BIN_DIR ?= bin
OUTPUT_DIR ?= $(BIN_DIR)
DMG_PATH ?= $(OUTPUT_DIR)/$(APP_NAME).dmg

.PHONY: all app dmg check clean

all: dmg

check:
	./create-dmg.sh --check

app:
	task -t ../../build/darwin/Taskfile.yml package

dmg:
	./create-dmg.sh "$(BIN_DIR)" "$(APP_NAME)" "$(OUTPUT_DIR)"

clean:
	rm -f "$(DMG_PATH)"
