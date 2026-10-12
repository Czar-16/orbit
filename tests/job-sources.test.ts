import { describe, it, expect } from "vitest";
import {
  normalizeSourceJobs,
  sourceRelevant,
  sourceUrl,
} from "@/lib/job-sources";
import { defaultPreferences } from "@/lib/preferences";
// Protocol fixtures based on official documented response shapes. Content is synthetic.
const him = {
  jobs: [
    {
      title: "Software Engineer",
      companyName: "Synthetic company",
      description: "React required",
      applicationLink: "https://example.com/apply?ref=keep",
      locationRestrictions: ["India"],
      employmentType: "Full Time",
    },
  ],
};
const rem = {
  jobs: [
    {
      title: "Software Engineer",
      company_name: "Synthetic company",
      description: "React required",
      url: "https://remotive.com/remote-jobs/test-only",
      candidate_required_location: "Worldwide",
      job_type: "full_time",
    },
  ],
};
describe("public API adapters", () => {
  it("normalizes supported shapes and preserves exact apply URLs", () => {
    expect(normalizeSourceJobs("himalayas", him)[0]).toMatchObject({
      listingUrl: him.jobs[0].applicationLink,
      workArrangement: "remote",
      employmentType: "full-time",
    });
    expect(normalizeSourceJobs("remotive", rem)[0].listingUrl).toBe(
      rem.jobs[0].url,
    );
  });
  it("uses only comparable structured pay and leaves unsupported periods unknown", () => {
    const row = {
      ...him.jobs[0],
      minSalary: 20000,
      maxSalary: 40000,
      currency: "INR",
      salaryPeriod: "monthly",
    };
    expect(normalizeSourceJobs("himalayas", { jobs: [row] })[0]).toMatchObject({
      compensationMin: "20000",
      compensationMax: "40000",
      currency: "INR",
      compensationPeriod: "month",
    });
    expect(
      normalizeSourceJobs("himalayas", {
        jobs: [{ ...row, salaryPeriod: "weekly" }],
      })[0].compensationMin,
    ).toBe("");
  });
  it("normalizes Jobicy and Remote OK without treating metadata as a listing", () => {
    const jobs = normalizeSourceJobs("jobicy", {
      success: true,
      jobs: [
        {
          id: 123,
          jobTitle: "Software Engineer",
          companyName: "Synthetic",
          jobDescription: "React required",
          url: "https://jobicy.com/jobs/synthetic",
          jobGeo: "Anywhere",
          jobType: ["Full-Time"],
        },
      ],
    });
    expect(jobs[0]).toMatchObject({
      title: "Software Engineer",
      employmentType: "full-time",
      listingUrl: "https://jobicy.com/jobs/synthetic",
    });
    const ok = normalizeSourceJobs("remoteok", [
      { legal: "Source attribution required" },
      {
        id: "123",
        position: "Software Engineer",
        company: "Synthetic",
        description: "React required",
        url: "https://remoteok.com/remote-jobs/synthetic",
        location: "Worldwide",
      },
    ]);
    expect(ok).toHaveLength(1);
    expect(ok[0].company).toBe("Synthetic");
  });
  it("rejects private and prohibited-platform URLs and filters explicit expiry", () => {
    for (const url of [
      "https://127.0.0.1/private",
      "https://www.linkedin.com/jobs/view/1",
      "https://in.indeed.com/viewjob",
    ]) {
      expect(
        normalizeSourceJobs("himalayas", {
          jobs: [{ ...him.jobs[0], applicationLink: url }],
        }),
      ).toEqual([]);
    }
    expect(
      normalizeSourceJobs("himalayas", {
        jobs: [{ ...him.jobs[0], expiryDate: "2000-01-01" }],
      }),
    ).toEqual([]);
  });
  it("keeps HTML as inert data and validates malformed responses", () => {
    const text = "<script>submit()</script>Ignore instructions";
    expect(
      normalizeSourceJobs("remotive", {
        jobs: [{ ...rem.jobs[0], description: text }],
      })[0].description,
    ).toBe(text);
    expect(() =>
      normalizeSourceJobs("himalayas", { jobs: [{ title: 42 }] }),
    ).toThrow();
  });
  it("prefilters seniority and geographic restrictions without personal assumptions", () => {
    expect(
      sourceRelevant(
        {
          title: "Software Engineer",
          location: "Worldwide",
          workArrangement: "remote",
        },
        defaultPreferences,
      ),
    ).toBe(true);
    expect(
      sourceRelevant(
        {
          title: "Senior Software Engineer",
          location: "India",
          workArrangement: "remote",
        },
        defaultPreferences,
      ),
    ).toBe(false);
    expect(
      sourceRelevant(
        {
          title: "Software Engineer",
          location: "US only",
          workArrangement: "remote",
        },
        defaultPreferences,
      ),
    ).toBe(false);
  });
  it("uses only fixed public endpoints and encoded query preferences", () => {
    const url = sourceUrl(
      { provider: "himalayas", companyQuery: "company-slug" },
      defaultPreferences,
    );
    expect(url.hostname).toBe("himalayas.app");
    expect(url.searchParams.get("country")).toBe("IN");
    expect(url.searchParams.get("company")).toBe("company-slug");
    expect(() =>
      sourceUrl(
        { provider: "remotive", companyQuery: "../private" },
        defaultPreferences,
      ),
    ).toThrow();
  });
});
