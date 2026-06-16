/**
 * Seeds two demo users with 200 points each for end-to-end referral testing.
 * Run: pnpm seed:demo
 */
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB, UserModel, getNextSequence } from "@workspace/db";

const DEMO_USERS = [
  {
    fullName: "Demo Poster",
    email: "poster@demo.com",
    password: "demo1234",
    headline: "I post jobs and give referrals",
  },
  {
    fullName: "Demo Seeker",
    email: "seeker@demo.com",
    password: "demo1234",
    headline: "I browse jobs and request referrals",
  },
] as const;

const INITIAL_POINTS = Number(process.env.INITIAL_USER_POINTS ?? 200);

async function seed() {
  await connectDB();

  for (const demo of DEMO_USERS) {
    const email = demo.email.toLowerCase();
    const existing = await UserModel.findOne({ email });

    if (existing) {
      if (existing.totalPoints < INITIAL_POINTS) {
        await UserModel.updateOne({ id: existing.id }, { $set: { totalPoints: INITIAL_POINTS } });
        console.log(`Updated points for ${email} → ${INITIAL_POINTS} pts`);
      } else {
        console.log(`Skipped ${email} (already exists, ${existing.totalPoints} pts)`);
      }
      continue;
    }

    const passwordHash = await bcrypt.hash(demo.password, 10);
    const id = await getNextSequence("user");

    await UserModel.create({
      id,
      fullName: demo.fullName,
      email,
      passwordHash,
      headline: demo.headline,
      totalPoints: INITIAL_POINTS,
      isProfileComplete: true,
      isWorkingProfessional: true,
      memberType: demo.email === "poster@demo.com" ? "alumni" : "student",
      isConsultant: demo.email === "poster@demo.com",
      company: demo.email === "poster@demo.com" ? "Demo Corp" : null,
      currentRole: demo.email === "poster@demo.com" ? "Engineering Manager" : null,
      experienceYears: demo.email === "poster@demo.com" ? 8 : null,
      skills: ["Referrals", "Mentorship"],
    });

    console.log(`Created ${email} / ${demo.password} with ${INITIAL_POINTS} pts`);
  }

  console.log("\nDemo accounts ready:");
  console.log("  Poster: poster@demo.com / demo1234");
  console.log("  Seeker: seeker@demo.com / demo1234");

  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
