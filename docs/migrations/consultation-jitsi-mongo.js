/**
 * MongoDB migration: 100ms → Jitsi Meet consultation fields
 *
 * Run from repo root (with MONGODB_URI set):
 *   node docs/migrations/consultation-jitsi-mongo.js
 *
 * This project uses MongoDB (not SQL). Equivalent SQL for reference:
 *
 *   ALTER TABLE consultations
 *     DROP COLUMN IF EXISTS hms_room_id,
 *     DROP COLUMN IF EXISTS hms_session_id,
 *     DROP COLUMN IF EXISTS hms_template_id,
 *     DROP COLUMN IF EXISTS hms_recording_id,
 *     DROP COLUMN IF EXISTS hms_room_url,
 *     DROP COLUMN IF EXISTS host_token,
 *     DROP COLUMN IF EXISTS participant_token;
 *
 *   ALTER TABLE consultations
 *     ADD COLUMN IF NOT EXISTS room_name VARCHAR(255),
 *     ADD COLUMN IF NOT EXISTS meeting_link TEXT,
 *     ADD COLUMN IF NOT EXISTS started_at DATETIME NULL,
 *     ADD COLUMN IF NOT EXISTS ended_at DATETIME NULL,
 *     ADD COLUMN IF NOT EXISTS session_status ENUM(
 *       'scheduled','started','completed','cancelled','expired'
 *     ) DEFAULT 'scheduled';
 */

import mongoose from "mongoose";

const JITSI_DOMAIN = process.env.JITSI_DOMAIN?.trim() || "meet.jit.si";

function jitsiRoomName(consultationId) {
  return `referaa-session-${consultationId}`;
}

function jitsiMeetingLink(consultationId) {
  return `https://${JITSI_DOMAIN}/${jitsiRoomName(consultationId)}`;
}

function mapSessionStatus(doc) {
  if (doc.sessionStatus) return doc.sessionStatus;
  if (doc.status === "cancelled") return "cancelled";
  if (doc.status === "completed") return "completed";
  if (doc.status === "started") return "started";
  return "scheduled";
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Set MONGODB_URI before running this migration.");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const col = mongoose.connection.collection("consultations");

  const cursor = col.find({});
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) break;

    const roomName = doc.roomName || doc.roomId || jitsiRoomName(doc.id);
    const meetingLink =
      doc.meetingLink
      || doc.hms_room_url
      || jitsiMeetingLink(doc.id);

    const $unset = {};
    for (const field of [
      "hms_room_id",
      "hms_session_id",
      "hms_template_id",
      "hms_recording_id",
      "hms_room_url",
      "host_token",
      "participant_token",
    ]) {
      if (field in doc) $unset[field] = "";
    }

    const $set = {
      videoProvider: "jitsi",
      roomName,
      roomId: roomName,
      meetingLink,
      sessionStatus: mapSessionStatus(doc),
    };

    if (!doc.actualStartAt && doc.started_at) {
      $set.actualStartAt = doc.started_at;
    }
    if (!doc.actualEndAt && doc.ended_at) {
      $set.actualEndAt = doc.ended_at;
    }

    await col.updateOne(
      { _id: doc._id },
      {
        $set,
        ...($unset && Object.keys($unset).length ? { $unset } : {}),
      },
    );
    updated += 1;
  }

  console.log(`Migrated ${updated} consultation document(s) to Jitsi fields.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
