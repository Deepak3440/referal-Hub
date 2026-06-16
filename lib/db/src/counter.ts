import mongoose, { Schema, type Model } from "mongoose";

interface CounterDoc {
  name: string;
  seq: number;
}

const counterSchema = new Schema<CounterDoc>({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, required: true, default: 0 },
});

const Counter: Model<CounterDoc> =
  mongoose.models.Counter ?? mongoose.model<CounterDoc>("Counter", counterSchema);

export async function getNextSequence(name: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return counter!.seq;
}
