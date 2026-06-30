import type { Control } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProfileFormValues } from "@/components/profile/profile-form";
import { SkillsInput } from "@/components/profile/skills-input";
import { MentorshipTopicsPicker } from "@/components/profile/mentorship-topics-picker";
import { MENTORSHIP_DURATION_OPTIONS } from "@/lib/mentor-utils";
import {
  EMPTY_CERT,
  EMPTY_EDUCATION,
  EMPTY_PROJECT,
  EMPTY_RESEARCH,
  EMPTY_WORK,
} from "@/lib/mentorship-profile-types";

function SectionHeader({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 pt-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {step}
      </span>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function ListCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {children}
    </div>
  );
}

export function MentorshipFormSections({ control }: { control: Control<ProfileFormValues> }) {
  const work = useFieldArray({ control, name: "workExperiences" });
  const projects = useFieldArray({ control, name: "projects" });
  const education = useFieldArray({ control, name: "education" });
  const papers = useFieldArray({ control, name: "researchPapers" });
  const certs = useFieldArray({ control, name: "certifications" });

  return (
    <div className="space-y-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-primary">Mentorship Profile</h2>
        <p className="text-sm text-muted-foreground">
          Fill these sections so members know your background before booking a session.
        </p>
      </div>

      <div className="rounded-xl border border-primary/25 bg-card p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-foreground">Session duration & fee</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shown on your mentor card when members browse mentorship.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="mentorshipDurationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session duration</FormLabel>
                <Select
                  value={field.value ? String(field.value) : "30"}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MENTORSHIP_DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="mentorshipPriceInr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session fee (₹)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="500"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <p className="text-[11px] text-muted-foreground">Use 0 for a free session.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="rounded-xl border border-primary/25 bg-card p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground">Mentorship topics</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Required — choose what students can find you under (Software, MBA, Career Switch, etc.).
          </p>
        </div>
        <FormField
          control={control}
          name="mentorshipTopics"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MentorshipTopicsPicker value={field.value ?? []} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 1. About */}
      <div className="space-y-3">
        <SectionHeader step={1} title="About (Professional Summary)" hint="A short intro about you and what you mentor on." />
        <FormField
          control={control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="e.g. 10+ years in backend engineering. I help with system design, referrals, and career growth..."
                  className="resize-none min-h-[100px] bg-background"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 2. Experience */}
      <div className="space-y-3">
        <SectionHeader step={2} title="Experience" hint="Companies you have worked at." />
        <div className="space-y-3">
          {work.fields.map((field, index) => (
            <ListCard key={field.id} onRemove={() => work.remove(index)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <FormField control={control} name={`workExperiences.${index}.company`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl><Input placeholder="Google" {...f} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`workExperiences.${index}.role`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl><Input placeholder="Senior Engineer" {...f} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name={`workExperiences.${index}.fromYear`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>From</FormLabel>
                    <FormControl><Input placeholder="2020" {...f} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name={`workExperiences.${index}.toYear`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>To</FormLabel>
                    <FormControl><Input placeholder="Present" {...f} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={control} name={`workExperiences.${index}.description`} render={({ field: f }) => (
                <FormItem>
                  <FormLabel>What you did</FormLabel>
                  <FormControl><Textarea className="resize-none bg-background" rows={2} {...f} /></FormControl>
                </FormItem>
              )} />
            </ListCard>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => work.append({ ...EMPTY_WORK })}>
          <Plus className="h-4 w-4 mr-1" /> Add company
        </Button>
      </div>

      {/* 3. Skills */}
      <div className="space-y-3">
        <SectionHeader step={3} title="Skills" hint="Type to see suggestions — pick or add your own." />
        <FormField
          control={control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SkillsInput
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="System Design, Java, Leadership, Interview Prep"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* 4. Projects */}
      <div className="space-y-3">
        <SectionHeader step={4} title="Projects" hint="Notable projects you led or contributed to." />
        <div className="space-y-3">
          {projects.fields.map((field, index) => (
            <ListCard key={field.id} onRemove={() => projects.remove(index)}>
              <div className="space-y-3 pr-8">
                <FormField control={control} name={`projects.${index}.name`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Project name</FormLabel>
                    <FormControl><Input placeholder="Payment Gateway Revamp" {...f} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`projects.${index}.technologies`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Technologies</FormLabel>
                    <FormControl><Input placeholder="Node.js, Kafka, AWS" {...f} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name={`projects.${index}.description`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea className="resize-none bg-background" rows={2} {...f} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </ListCard>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => projects.append({ ...EMPTY_PROJECT })}>
          <Plus className="h-4 w-4 mr-1" /> Add project
        </Button>
      </div>

      {/* 5. Education */}
      <div className="space-y-3">
        <SectionHeader step={5} title="Education" hint="UG, PG, or PhD with stream and batch year." />
        <div className="space-y-3">
          {education.fields.map((field, index) => (
            <ListCard key={field.id} onRemove={() => education.remove(index)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <FormField control={control} name={`education.${index}.level`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Level</FormLabel>
                    <Select value={f.value} onValueChange={f.onChange}>
                      <FormControl>
                        <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UG">UG (Undergraduate)</SelectItem>
                        <SelectItem value="PG">PG (Postgraduate)</SelectItem>
                        <SelectItem value="PhD">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={control} name={`education.${index}.institution`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <FormControl><Input placeholder="IIT Delhi" {...f} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`education.${index}.stream`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Stream</FormLabel>
                    <FormControl><Input placeholder="Computer Science" {...f} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name={`education.${index}.batchYear`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Batch year</FormLabel>
                    <FormControl><Input type="number" placeholder="2018" {...f} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </ListCard>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => education.append({ ...EMPTY_EDUCATION })}>
          <Plus className="h-4 w-4 mr-1" /> Add education
        </Button>
      </div>

      {/* 6. Research Papers */}
      <div className="space-y-3">
        <SectionHeader step={6} title="Research Papers" hint="Optional — add if you have published work." />
        <div className="space-y-3">
          {papers.fields.map((field, index) => (
            <ListCard key={field.id} onRemove={() => papers.remove(index)}>
              <div className="space-y-3 pr-8">
                <FormField control={control} name={`researchPapers.${index}.title`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Paper title</FormLabel>
                    <FormControl><Input {...f} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField control={control} name={`researchPapers.${index}.publication`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Journal / Conference</FormLabel>
                      <FormControl><Input {...f} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={control} name={`researchPapers.${index}.year`} render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl><Input type="number" {...f} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <FormField control={control} name={`researchPapers.${index}.link`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Link (optional)</FormLabel>
                    <FormControl><Input placeholder="https://..." {...f} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </ListCard>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => papers.append({ ...EMPTY_RESEARCH })}>
          <Plus className="h-4 w-4 mr-1" /> Add research paper
        </Button>
      </div>

      {/* 7. Certifications */}
      <div className="space-y-3">
        <SectionHeader step={7} title="Certifications" hint="Professional certs you hold." />
        <div className="space-y-3">
          {certs.fields.map((field, index) => (
            <ListCard key={field.id} onRemove={() => certs.remove(index)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pr-8">
                <FormField control={control} name={`certifications.${index}.name`} render={({ field: f }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel>Certification</FormLabel>
                    <FormControl><Input placeholder="AWS Solutions Architect" {...f} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={control} name={`certifications.${index}.issuer`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Issuer</FormLabel>
                    <FormControl><Input placeholder="Amazon" {...f} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={control} name={`certifications.${index}.year`} render={({ field: f }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...f} /></FormControl>
                  </FormItem>
                )} />
              </div>
            </ListCard>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => certs.append({ ...EMPTY_CERT })}>
          <Plus className="h-4 w-4 mr-1" /> Add certification
        </Button>
      </div>
    </div>
  );
}
