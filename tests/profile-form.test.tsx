import React from "react";
import { vi, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "@/components/profile-form";
import { profileDefaults } from "@/lib/profile-input";
import { emptyProfile } from "@/lib/profile-schema";
const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/app/profile/actions", () => ({ saveProfileAction: mocks.save }));
it("requires confirmation and preserves edits when save fails", async () => {
  const user = userEvent.setup();
  mocks.save.mockResolvedValue({
    ok: false,
    message: "Database unavailable. Try again.",
  });
  render(
    <ProfileForm
      defaults={profileDefaults()}
      facts={emptyProfile()}
      resumes={[]}
    />,
  );
  await user.type(
    screen.getByLabelText("Name", { exact: false }),
    "Test input",
  );
  await user.click(
    screen.getByRole("button", { name: "Save verified profile" }),
  );
  expect(
    await screen.findByText(
      "Confirm that these facts are accurate before saving.",
    ),
  ).toBeInTheDocument();
  expect(mocks.save).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox"));
  await user.click(
    screen.getByRole("button", { name: "Save verified profile" }),
  );
  await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Database unavailable",
  );
  expect(screen.getByLabelText("Name", { exact: false })).toHaveValue(
    "Test input",
  );
  expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
});
