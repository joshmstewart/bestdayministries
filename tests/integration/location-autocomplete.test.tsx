import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [
      { id: "coffee", name: "Coffee shop", address: "Coffee shop address" },
    ], error: null }) }) }) }),
  },
}));

function Field() {
  const [value, setValue] = useState("");
  return <LocationAutocomplete value={value} onChange={setValue} />;
}

beforeEach(() => {
  mocks.invoke.mockReset();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const box = () => screen.getByRole("textbox");

describe("Event location entry", () => {
  it("keeps typed text while suggestions are pending", () => {
    mocks.invoke.mockReturnValue(new Promise(() => {}));
    render(<Field />);
    fireEvent.change(box(), { target: { value: "Community library" } });
    fireEvent.blur(box());
    expect(box()).toHaveValue("Community library");
    expect(box()).not.toBeDisabled();
  });

  it("keeps typed text and stays editable when suggestions fail", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { message: "denied", context: { status: 403 } } });
    render(<Field />);
    fireEvent.change(box(), { target: { value: "Denver Public Library" } });
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalled());
    fireEvent.change(box(), { target: { value: "Denver Public Library annex" } });
    expect(box()).toHaveValue("Denver Public Library annex");
    expect(box()).not.toBeDisabled();
  });

  it("fills the full address when a suggestion is picked", async () => {
    mocks.invoke.mockImplementation(async (_n: string, { body }: any) =>
      body.action === "autocomplete"
        ? { data: { suggestions: [{ placeId: "p1", text: "Longmont Library, Longmont, CO", main: "Longmont Library", secondary: "Longmont, CO" }] }, error: null }
        : { data: { value: "Longmont Library, 355 Emery St, Longmont, CO 80501" }, error: null });
    render(<Field />);
    fireEvent.change(box(), { target: { value: "Longmont lib" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: /Longmont Library/ }));
    await waitFor(() => expect(box()).toHaveValue("Longmont Library, 355 Emery St, Longmont, CO 80501"));
  });

  it("switches from the coffee shop to a custom place", async () => {
    mocks.invoke.mockReturnValue(new Promise(() => {}));
    render(<Field />);
    const select = await screen.findByRole("combobox", { name: "Saved location" });
    fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: /Coffee shop/ }));
    expect(box()).toHaveValue("Coffee shop address");
    fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Other place" }));
    expect(box()).toHaveValue("");
    fireEvent.change(box(), { target: { value: "Community library" } });
    expect(box()).toHaveValue("Community library");
  });
});
