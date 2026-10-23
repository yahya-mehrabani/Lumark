package ipc

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
)

// maxPayloadSize defines the maximum permissible size for an IPC message (1 MB).
const maxPayloadSize = 1024 * 1024

// ackByte is the single-byte acknowledgement transmitted by primary upon successful receipt (ASCII ACK).
const ackByte byte = 0x06

// writeMessage encodes and writes a length-prefixed JSON message to the given writer.
func writeMessage(w io.Writer, msg Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message json: %w", err)
	}

	if len(data) > maxPayloadSize {
		return fmt.Errorf("payload size %d exceeds max allowed %d", len(data), maxPayloadSize)
	}

	lenBuf := make([]byte, 4)
	binary.BigEndian.PutUint32(lenBuf, uint32(len(data)))

	if _, err := w.Write(lenBuf); err != nil {
		return fmt.Errorf("write length prefix: %w", err)
	}

	if _, err := w.Write(data); err != nil {
		return fmt.Errorf("write payload: %w", err)
	}

	return nil
}

// readMessage reads a length-prefixed JSON message from the given reader.
func readMessage(r io.Reader) (Message, error) {
	lenBuf := make([]byte, 4)
	if _, err := io.ReadFull(r, lenBuf); err != nil {
		return Message{}, fmt.Errorf("read length prefix: %w", err)
	}

	length := binary.BigEndian.Uint32(lenBuf)
	if length > maxPayloadSize {
		return Message{}, fmt.Errorf("incoming payload length %d exceeds max allowed %d", length, maxPayloadSize)
	}

	data := make([]byte, length)
	if _, err := io.ReadFull(r, data); err != nil {
		return Message{}, fmt.Errorf("read payload data: %w", err)
	}

	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return Message{}, fmt.Errorf("unmarshal payload json: %w", err)
	}

	return msg, nil
}

// sendAck writes the acknowledgement byte to the connection.
func sendAck(w io.Writer) error {
	if _, err := w.Write([]byte{ackByte}); err != nil {
		return fmt.Errorf("write ack byte: %w", err)
	}
	return nil
}

// readAck reads and verifies the acknowledgement byte from the connection.
func readAck(r io.Reader) error {
	buf := make([]byte, 1)
	if _, err := io.ReadFull(r, buf); err != nil {
		return fmt.Errorf("read ack byte: %w", err)
	}

	if buf[0] != ackByte {
		return fmt.Errorf("unexpected ack byte: 0x%02x (expected 0x%02x)", buf[0], ackByte)
	}

	return nil
}
