import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  maps: { isLoaded: false, loadError: null as Error | null },
}));
vi.mock("@/hooks/useGoogleMapsScript", () => ({ useGoogleMapsScript: () => mocks.maps }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: () => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [
      { id: "coffee", name: "Coffee shop", address: "Coffee shop address" },
    ], error: null }) }) }) }),
  },
}));

function Field() {
  const [value, setValue] = useState("");
  return <LocationAutocomplete value={value} onChange={setValue} />;
}

beforeEach(() => {
  mocks.maps.isLoaded = false;
  mocks.maps.loadError = null;
  mocks.invoke.mockResolvedValue({ data: { apiKey: "PLACEHOLDER" }, error: null });
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("Event location entry", () => {
  it("accepts other places while the key request is pending", () => {
    mocks.invoke.mockReturnValue(new Promise(() => {}));
    render(<Field />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Community library" } });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByRole("textbox")).toHaveValue("Community library");
  });

  it("accepts other places while Google suggestions are loading", async () => {
    mocks.invoke.mockResolvedValue({ data: { apiKey: "test-key" }, error: null });
    render(<Field />);
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "City park" } });
    expect(screen.getByRole("textbox")).toHaveValue("City park");
  });

  it("retains manual entry and saved choices after Google fails", async () => {
    mocks.maps.loadError = new Error("Unavailable");
    render(<Field />);
    await screen.findByRole("combobox", { name: "Saved location" });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Recreation center" } });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(screen.getByRole("textbox")).toHaveValue("Recreation center");
  });

  it("switches from the coffee shop to a custom place", async () => {
    render(<Field />);
    const select = await screen.findByRole("combobox", { name: "Saved location" });
    fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: /Coffee shop/ }));
    expect(screen.getByRole("textbox")).toHaveValue("Coffee shop address");
    fireEvent.pointerDown(select, { button: 0, ctrlKey: false, pointerType: "mouse" });
    fireEvent.click(await screen.findByRole("option", { name: "Other place" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Community library" } });
    expect(screen.getByRole("textbox")).toHaveValue("Community library");
  });
});