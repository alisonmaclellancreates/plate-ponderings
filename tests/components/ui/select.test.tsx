import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const methods = ["hasPointerCapture", "releasePointerCapture", "scrollIntoView"] as const;
const saved: Partial<Record<(typeof methods)[number], unknown>> = {};
const had: Partial<Record<(typeof methods)[number], boolean>> = {};

beforeAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  for (const m of methods) {
    had[m] = m in proto;
    saved[m] = proto[m];
    proto[m] = m === "hasPointerCapture" ? () => false : () => {};
  }
});

afterAll(() => {
  const proto = Element.prototype as unknown as Record<string, unknown>;
  for (const m of methods) {
    if (had[m]) proto[m] = saved[m];
    else delete proto[m];
  }
});

function Harness(props: {
  position?: "popper" | "item-aligned";
  onValueChange?: (v: string) => void;
}) {
  const { position, onValueChange } = props;
  return (
    <Select {...(onValueChange ? { onValueChange } : {})}>
      <SelectTrigger className="trig-x" aria-label="Province">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent className="content-x" {...(position ? { position } : {})}>
        <SelectGroup>
          <SelectLabel className="label-x">Canada</SelectLabel>
          <SelectItem value="on" className="item-x">
            Ontario
          </SelectItem>
          <SelectSeparator className="sep-x" />
          <SelectItem value="bc">British Columbia</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("opens in popper mode by default and selects an item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Harness onValueChange={onValueChange} />);
    const trigger = screen.getByRole("combobox", { name: "Province" });
    expect(trigger).toHaveClass("h-9", "trig-x");
    expect(trigger).toHaveTextContent("Pick one");
    await user.click(trigger);
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveClass("content-x", "data-[side=bottom]:translate-y-1");
    expect(screen.getByText("Canada")).toHaveClass("font-semibold", "label-x");
    expect(document.querySelector(".sep-x")).toHaveClass("bg-muted");
    const item = screen.getByRole("option", { name: "Ontario" });
    expect(item).toHaveClass("item-x");
    await user.click(item);
    expect(onValueChange).toHaveBeenCalledWith("on");
    expect(trigger).toHaveTextContent("Ontario");
  });

  it("drops the popper classes in item-aligned mode", async () => {
    const user = userEvent.setup();
    render(<Harness position="item-aligned" />);
    await user.click(screen.getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveClass("content-x");
    expect(listbox).not.toHaveClass("data-[side=bottom]:translate-y-1");
  });

  it("keeps the scroll buttons unmounted while the list fits without scrolling", async () => {
    render(
      <Select defaultOpen>
        <SelectTrigger aria-label="y">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectScrollUpButton className="up-x" />
          <SelectItem value="b">B</SelectItem>
          <SelectScrollDownButton className="down-x" />
        </SelectContent>
      </Select>,
    );
    expect(await screen.findByRole("option", { name: "B" })).toBeInTheDocument();
    expect(document.querySelector(".up-x")).toBeNull();
    expect(document.querySelector(".down-x")).toBeNull();
  });
});
