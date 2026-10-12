import { z } from "zod";
export const categories = [
  "skills",
  "role",
  "experience",
  "education",
  "location",
  "employment",
  "compensation",
] as const;
export type Category = (typeof categories)[number];
const list = z.array(z.string().trim().min(1).max(100)).max(30);
export const preferenceSchema = z
  .object({
    weights: z
      .object({
        skills: z.number().int().min(0).max(100),
        role: z.number().int().min(0).max(100),
        experience: z.number().int().min(0).max(100),
        education: z.number().int().min(0).max(100),
        location: z.number().int().min(0).max(100),
        employment: z.number().int().min(0).max(100),
        compensation: z.number().int().min(0).max(100),
      })
      .strict()
      .refine(
        (v) => Object.values(v).reduce((a, b) => a + b, 0) === 100,
        "Weights must total 100.",
      ),
    roles: list,
    locations: list,
    arrangements: z.array(z.enum(["remote", "hybrid", "on-site"])).max(3),
    employmentTypes: z
      .array(
        z.enum([
          "full-time",
          "part-time",
          "contract",
          "internship",
          "temporary",
        ]),
      )
      .max(5),
    paidOnly: z.boolean(),
    minimumPay: z.number().nonnegative().max(1e10).nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    period: z.enum(["hour", "month", "year"]),
    dailyLimit: z.number().int().min(1).max(100),
  })
  .strict();
export type Preferences = z.infer<typeof preferenceSchema>;
export const defaultPreferences: Preferences = {
  weights: {
    skills: 30,
    role: 20,
    experience: 15,
    education: 10,
    location: 10,
    employment: 10,
    compensation: 5,
  },
  roles: [
    "Software Engineer",
    "SDE",
    "Frontend",
    "Backend",
    "Full-Stack",
    "Full Stack",
    "Developer",
  ],
  locations: ["Bengaluru", "Bangalore", "Gurugram", "Gurgaon"],
  arrangements: ["remote", "hybrid", "on-site"],
  employmentTypes: ["full-time", "internship"],
  paidOnly: true,
  minimumPay: null,
  currency: "INR",
  period: "month",
  dailyLimit: 20,
};
