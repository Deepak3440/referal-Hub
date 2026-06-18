import { PublicPageLayout } from "@/components/layout/public-site-layout";
import { BRAND } from "@/lib/brand";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const updated = "June 19, 2026";

  return (
    <PublicPageLayout
      title="Terms & Conditions"
      subtitle={`Please read these terms carefully before using ${BRAND.name}.`}
    >
      <div className="space-y-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs text-muted-foreground">Last updated: {updated}</p>

        <Section title="1. Agreement">
          <p>
            By creating an account or using {BRAND.name}, you agree to these Terms &amp; Conditions.
            If you do not agree, please do not use the platform.
          </p>
        </Section>

        <Section title="2. What Referaa provides">
          <p>
            {BRAND.name} connects students and alumni for job referrals, company-wide referral
            requests, mentorship sessions, and community features. We facilitate introductions — we
            do not guarantee interviews, offers, or hiring outcomes.
          </p>
        </Section>

        <Section title="3. Eligibility & accounts">
          <p>
            You must provide accurate information when registering. You are responsible for keeping
            your login credentials secure and for activity under your account. You may register as a
            student or alumni member according to the options presented at signup.
          </p>
        </Section>

        <Section title="4. Referrals & mentorship">
          <ul className="list-disc space-y-2 pl-5">
            <li>Referral requests are subject to acceptance by alumni or referrers.</li>
            <li>Reward points, where applicable, follow the rules shown in the product at the time of use.</li>
            <li>Mentorship sessions are arranged between members; scheduling and meeting links are your responsibility to attend on time.</li>
            <li>Do not misrepresent your experience, intent, or affiliation with any company.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Harass, spam, or abuse other members</li>
            <li>Post false, misleading, or illegal content</li>
            <li>Attempt to scrape, disrupt, or reverse-engineer the service</li>
            <li>Use the platform for unauthorized commercial solicitation</li>
          </ul>
        </Section>

        <Section title="6. Content & intellectual property">
          <p>
            You retain ownership of content you submit. You grant {BRAND.name} a limited license to
            display that content on the platform. The {BRAND.name} name, logo, and product design
            remain our property.
          </p>
        </Section>

        <Section title="7. Disclaimer">
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for decisions made by referrers, mentors, or employers, or for any indirect
            damages arising from use of the platform, to the fullest extent permitted by law.
          </p>
        </Section>

        <Section title="8. Account suspension">
          <p>
            We may suspend or remove accounts that violate these terms or that pose risk to the
            community, with or without prior notice where appropriate.
          </p>
        </Section>

        <Section title="9. Changes">
          <p>
            We may update these terms from time to time. Continued use of {BRAND.name} after changes
            are posted constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            Questions about these terms? Visit our{" "}
            <a href="/contact" className="font-medium text-primary hover:underline">
              Contact us
            </a>{" "}
            page or email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-primary hover:underline">
              {BRAND.supportEmail}
            </a>
            .
          </p>
        </Section>
      </div>
    </PublicPageLayout>
  );
}
