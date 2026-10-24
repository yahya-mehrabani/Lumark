package instance

import (
	"bytes"
	"strings"
	"testing"
)

func TestProtocol_Roundtrip(t *testing.T) {
	tests := []struct {
		name string
		msg  Message
	}{
		{
			name: "StandardPaths",
			msg: Message{
				Args:       []string{"doc1.md", "notes/doc2.md"},
				WorkingDir: "/home/user/project",
			},
		},
		{
			name: "UnicodeAndSpaces",
			msg: Message{
				Args: []string{
					"Folder With Spaces/File 1.markdown",
					"документы/план.md",
					"ノート/設計.md",
					"مستندات/ملاحظة.md",
				},
				WorkingDir: "/home/пользователь/проекты",
				Extra: map[string]string{
					"origin": "cli",
					"user":   "тест",
				},
			},
		},
		{
			name: "EmptyArgs",
			msg: Message{
				Args:       []string{},
				WorkingDir: "/tmp",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var buf bytes.Buffer
			if err := writeMessage(&buf, tt.msg); err != nil {
				t.Fatalf("writeMessage failed: %v", err)
			}

			received, err := readMessage(&buf)
			if err != nil {
				t.Fatalf("readMessage failed: %v", err)
			}

			if len(received.Args) != len(tt.msg.Args) {
				t.Fatalf("args length mismatch: got %d, want %d", len(received.Args), len(tt.msg.Args))
			}
			for i := range tt.msg.Args {
				if received.Args[i] != tt.msg.Args[i] {
					t.Errorf("arg[%d] mismatch: got %q, want %q", i, received.Args[i], tt.msg.Args[i])
				}
			}
			if received.WorkingDir != tt.msg.WorkingDir {
				t.Errorf("working dir mismatch: got %q, want %q", received.WorkingDir, tt.msg.WorkingDir)
			}
			for k, v := range tt.msg.Extra {
				if received.Extra[k] != v {
					t.Errorf("extra[%q] mismatch: got %q, want %q", k, received.Extra[k], v)
				}
			}
		})
	}
}

func TestProtocol_OversizedPayload(t *testing.T) {
	var buf bytes.Buffer
	hugeString := strings.Repeat("A", maxPayloadSize+100)
	msg := Message{
		Args:       []string{hugeString},
		WorkingDir: "/tmp",
	}

	err := writeMessage(&buf, msg)
	if err == nil {
		t.Fatal("expected error for oversized payload, got nil")
	}
}

func TestProtocol_TruncatedData(t *testing.T) {
	t.Run("TruncatedLengthPrefix", func(t *testing.T) {
		shortBuf := bytes.NewReader([]byte{0x00, 0x01})
		_, err := readMessage(shortBuf)
		if err == nil {
			t.Fatal("expected error reading truncated length prefix, got nil")
		}
	})

	t.Run("TruncatedPayloadData", func(t *testing.T) {
		// Length prefix says 100 bytes, but only 10 bytes provided
		var buf bytes.Buffer
		buf.Write([]byte{0x00, 0x00, 0x00, 0x64}) // 100 bytes
		buf.Write(bytes.Repeat([]byte{'a'}, 10))
		_, err := readMessage(&buf)
		if err == nil {
			t.Fatal("expected error reading truncated payload, got nil")
		}
	})

	t.Run("MalformedJSON", func(t *testing.T) {
		var buf bytes.Buffer
		malformed := []byte("{invalid-json-payload")
		buf.Write([]byte{0x00, 0x00, 0x00, byte(len(malformed))})
		buf.Write(malformed)
		_, err := readMessage(&buf)
		if err == nil {
			t.Fatal("expected error unmarshaling malformed json, got nil")
		}
	})
}

func TestProtocol_AckByte(t *testing.T) {
	var buf bytes.Buffer
	if err := sendAck(&buf); err != nil {
		t.Fatalf("sendAck failed: %v", err)
	}

	if err := readAck(&buf); err != nil {
		t.Fatalf("readAck failed: %v", err)
	}

	// Unexpected ACK byte
	invalidBuf := bytes.NewReader([]byte{0xFF})
	if err := readAck(invalidBuf); err == nil {
		t.Fatal("expected error for invalid ack byte, got nil")
	}

	// Empty buffer (EOF)
	emptyBuf := bytes.NewReader([]byte{})
	if err := readAck(emptyBuf); err == nil {
		t.Fatal("expected error for empty ack buffer, got nil")
	}
}
