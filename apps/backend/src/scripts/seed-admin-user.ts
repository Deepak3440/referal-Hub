/**
 * Creates a dummy platform admin for dispute review (/admin/mentorship).
 * Run: pnpm seed:admin
 *
 * Login: admin@referaa.com / Admin@1234
 * Admin flag is stored on the user (isPlatformAdmin) — no ADMIN_USER_IDS in .env needed.
 */
import bcrypt from "bcryptjs";
import { connectDB, disconnectDB, UserModel, getNextSequence } from "@workspace/db";

const ADMIN_EMAIL = "admin@referaa.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME = "Referaa Admin";

async function seed() {
  await connectDB();

  const email = ADMIN_EMAIL.toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const existing = await UserModel.findOne({ email });

  let adminId: number;

  if (existing) {
    adminId = existing.id;
    await UserModel.updateOne(
      { id: adminId },
      {
        fullName: ADMIN_NAME,
        passwordHash,
        emailVerified: true,
        isProfileComplete: true,
        isPlatformAdmin: true,
        memberType: "alumni",
        isWorkingProfessional: true,
        headline: "Platform admin — mentorship dispute review",
        totalPoints: Math.max(existing.totalPoints ?? 0, 500),
      },
    );
    console.log(`Updated existing admin ${email} (user id: ${adminId})`);
  } else {
    adminId = await getNextSequence("user");
    await UserModel.create({
      id: adminId,
      fullName: ADMIN_NAME,
      email,
      passwordHash,
      headline: "Platform admin — mentorship dispute review",
      totalPoints: 500,
      isProfileComplete: true,
      emailVerified: true,
      isPlatformAdmin: true,
      isWorkingProfessional: true,
      memberType: "alumni",
      company: "Referaa",
      currentRole: "Platform Admin",
      skills: ["Admin", "Support"],
      education: [
        {
          level: "UG",
          institution: "Moradabad Institute of Technology",
          batchYear: 2020,
        },
      ],
    });
    console.log(`Created admin ${email} (user id: ${adminId})`);
  }

  console.log("\n--- Admin login (dummy account) ---");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log(`  User ID:  ${adminId}`);
  console.log("\nSign in → open /admin/mentorship (bookmark this URL; not in sidebar).");

  await disconnectDB();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
