import test from "node:test";
import assert from "node:assert/strict";
import {
  attachmentFrames,
  attachmentTextBrief,
  attachmentUserNote,
  parseChatAttachments,
} from "../lib/live/chat-attachments";

test("parses a jpeg attachment and ignores junk", () => {
  const jpeg =
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUTExMWFhUVFxcYFxcXFxgXFxcXFxgXFxcXFxgYHSggGBolGxYXITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYBAwQHAv/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAXAQEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8A2gAAD/2Q==";
  const files = parseChatAttachments([
    { name: "ejemplo.jpg", mime: "image/jpeg", data: jpeg },
    { name: "virus.exe", mime: "application/octet-stream", data: "AAA=" },
  ]);
  assert.equal(files.length, 1);
  assert.equal(files[0].kind, "image");
  assert.equal(attachmentFrames(files).length, 1);
});

test("parses text examples into the brief", () => {
  const data = Buffer.from("color: #1a1714", "utf8").toString("base64");
  const files = parseChatAttachments([
    { name: "tokens.md", mime: "text/markdown", data },
  ]);
  assert.equal(files[0].kind, "text");
  assert.match(attachmentTextBrief(files), /#1a1714/);
  assert.match(attachmentUserNote("mira", files), /tokens\.md/);
});
