import { render, screen } from "@testing-library/react";
import {
  ChartContainer,
  ChartLegendContent,
  ChartStyle,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

function Icon() {
  return <svg data-testid="cfg-icon" />;
}

const config: ChartConfig = {
  plates: { label: "Plates", color: "#f00" },
  stories: { label: "Stories", theme: { light: "#0f0", dark: "#00f" } },
  bare: { label: "Bare" },
  iconic: { label: "Iconic", icon: Icon },
};

type AnyProps = Record<string, unknown>;
const Tip = ChartTooltipContent as unknown as (p: AnyProps) => JSX.Element;
const Legend = ChartLegendContent as unknown as (p: AnyProps) => JSX.Element;

function inChart(node: React.ReactNode, cfg: ChartConfig = config) {
  return render(
    <ChartContainer config={cfg} id="t">
      <>{node}</>
    </ChartContainer>,
  );
}

describe("ChartStyle", () => {
  it("emits one variable per coloured series for each theme", () => {
    const { container } = render(<ChartStyle id="c1" config={config} />);
    const css = container.querySelector("style")!.innerHTML;
    expect(css).toContain("[data-chart=c1]");
    expect(css).toContain(".dark [data-chart=c1]");
    expect(css).toContain("--color-plates: #f00;");
    expect(css).toContain("--color-stories: #0f0;");
    expect(css).toContain("--color-stories: #00f;");
    expect(css).not.toContain("--color-bare");
  });

  it("skips a theme entry missing a colour for one theme", () => {
    const { container } = render(
      <ChartStyle id="c2" config={{ x: { theme: { light: "#111" } as never } }} />,
    );
    const css = container.querySelector("style")!.innerHTML;
    expect(css).toContain("--color-x: #111;");
    expect(css.match(/--color-x/g)).toHaveLength(1);
  });

  it("renders nothing for an empty config", () => {
    const { container } = render(<ChartStyle id="c3" config={{}} />);
    expect(container.querySelector("style")).toBeNull();
  });
});

describe("ChartContainer", () => {
  it("uses the given id and generates one otherwise", () => {
    const { container } = inChart(<span />);
    expect(container.querySelector("[data-chart]")).toHaveAttribute("data-chart", "chart-t");
    const { container: c2 } = render(
      <ChartContainer config={{}} className="cc-x">
        <span />
      </ChartContainer>,
    );
    const el = c2.querySelector("[data-chart]")!;
    expect(el.getAttribute("data-chart")).toMatch(/^chart-[^:]+$/);
    expect(el).toHaveClass("cc-x");
  });
});

describe("ChartTooltipContent", () => {
  const payload = [
    { name: "plates", dataKey: "plates", value: 1200, color: "#abc", payload: { fill: "#def" } },
    { name: "stories", dataKey: "stories", value: 3, color: "#123", payload: {} },
  ];

  it("renders nothing when inactive or empty", () => {
    const { container } = inChart(
      <>
        <Tip active={false} payload={payload} />
        <Tip active payload={[]} />
      </>,
    );
    expect(container.querySelector(".min-w-\\[8rem\\]")).toBeNull();
  });

  it("shows label from config, names and formatted values with dot indicator", () => {
    const { container } = inChart(
      <Tip active payload={payload} label="plates" labelClassName="lab-x" className="tip-x" />,
    );
    expect(container.querySelector(".tip-x")).not.toBeNull();
    expect(container.querySelector(".lab-x")).toHaveTextContent("Plates");
    expect(screen.getByText("Stories")).toBeInTheDocument();
    expect(screen.getByText((1200).toLocaleString())).toBeInTheDocument();
    const swatch = container.querySelector(".h-2\\.5.w-2\\.5") as HTMLElement;
    expect(swatch.style.getPropertyValue("--color-bg")).toBe("#def");
  });

  it("uses a raw string label not in config, and color prop over item color", () => {
    const { container } = inChart(
      <Tip active payload={[payload[1]]} label="Mystery" color="#999" />,
    );
    expect(screen.getByText("Mystery")).toBeInTheDocument();
    const swatch = container.querySelector(".h-2\\.5") as HTMLElement;
    expect(swatch.style.getPropertyValue("--color-bg")).toBe("#999");
  });

  it("falls back to item color and hides label when hideLabel", () => {
    const { container } = inChart(<Tip active payload={[payload[1]]} label="plates" hideLabel />);
    expect(screen.queryByText("Plates")).toBeNull();
    const swatch = container.querySelector(".h-2\\.5") as HTMLElement;
    expect(swatch.style.getPropertyValue("--color-bg")).toBe("#123");
  });

  it("nests the label with line and dashed indicators for a single item", () => {
    const { container } = inChart(
      <>
        <Tip active payload={[payload[0]]} indicator="line" />
        <Tip active payload={[payload[0]]} indicator="dashed" />
      </>,
    );
    expect(container.querySelector(".w-1")).not.toBeNull();
    expect(container.querySelector(".border-dashed.my-0\\.5")).not.toBeNull();
    expect(container.querySelectorAll(".items-end").length).toBe(2);
  });

  it("does not nest with multiple items and a dashed indicator", () => {
    const { container } = inChart(<Tip active payload={payload} indicator="dashed" />);
    expect(container.querySelector(".border-dashed")).not.toBeNull();
    expect(container.querySelector(".my-0\\.5")).toBeNull();
  });

  it("hides the indicator and renders a config icon instead when present", () => {
    const { container } = inChart(
      <>
        <Tip active payload={[payload[1]]} hideIndicator />
        <Tip active payload={[{ name: "iconic", dataKey: "iconic", value: 0, payload: {} }]} />
      </>,
    );
    expect(container.querySelector(".h-2\\.5")).toBeNull();
    expect(screen.getByTestId("cfg-icon")).toBeInTheDocument();
    expect(screen.getAllByText("Iconic").length).toBeGreaterThan(0);
  });

  it("applies label and value formatters", () => {
    const labelFormatter = vi.fn((v: unknown) => `L:${String(v)}`);
    const formatter = vi.fn((v: unknown, n: unknown) => (
      <b key="f">{`${String(n)}=${String(v)}`}</b>
    ));
    inChart(
      <Tip
        active
        payload={payload}
        labelFormatter={labelFormatter}
        formatter={formatter}
        labelKey="plates"
      />,
    );
    expect(screen.getByText("L:Plates")).toBeInTheDocument();
    expect(screen.getByText("plates=1200")).toBeInTheDocument();
    expect(formatter).toHaveBeenCalledTimes(2);
  });

  it("renders nothing for label when no config label exists", () => {
    const { container } = inChart(<Tip active payload={[{ value: 5, payload: {} }]} />, {});
    expect(container.querySelector(".font-medium:not(.font-mono)")).toBeNull();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("resolves nameKey and labelKey via item and nested payload", () => {
    inChart(
      <Tip
        active
        payload={[{ dataKey: "v", value: 1, kind: "plates", payload: { cat: "stories" } }]}
        nameKey="kind"
        labelKey="cat"
      />,
    );
    expect(screen.getByText("Plates")).toBeInTheDocument();
    expect(screen.getByText("Stories")).toBeInTheDocument();
  });

  it("skips items with type none", () => {
    inChart(<Tip active payload={[payload[0], { ...payload[1], type: "none" }]} />);
    expect(screen.queryByText("Stories")).toBeNull();
  });

  it("throws outside a container", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => render(<Tip active payload={payload} />)).toThrow(
        "useChart must be used within a <ChartContainer />",
      );
    } finally {
      spy.mockRestore();
    }
  });
});

describe("ChartLegendContent", () => {
  const payload = [
    { value: "plates", dataKey: "plates", color: "#f00" },
    { value: "iconic", dataKey: "iconic", color: "#0f0" },
    { value: "gone", dataKey: "plates", type: "none" },
  ];

  it("renders nothing for empty payload", () => {
    const { container } = inChart(<Legend payload={[]} />);
    expect(container.querySelector(".pt-3")).toBeNull();
  });

  it("renders labels, icons and swatches aligned bottom by default", () => {
    const { container } = inChart(<Legend payload={payload} className="lg-x" />);
    const root = container.querySelector(".lg-x")!;
    expect(root).toHaveClass("pt-3");
    expect(screen.getByText("Plates")).toBeInTheDocument();
    expect(screen.getByTestId("cfg-icon")).toBeInTheDocument();
    expect((root.querySelector(".h-2") as HTMLElement).style.backgroundColor).not.toBe("");
    expect(root.children.length).toBe(2);
  });

  it("aligns top, hides icons and uses nameKey", () => {
    const { container } = inChart(
      <Legend
        payload={[{ value: "a", dataKey: "x", color: "#0f0", kind: "iconic" }]}
        verticalAlign="top"
        hideIcon
        nameKey="kind"
      />,
    );
    expect(container.querySelector(".pb-3")).not.toBeNull();
    expect(screen.queryByTestId("cfg-icon")).toBeNull();
    expect(screen.getByText("Iconic")).toBeInTheDocument();
  });

  it("falls back to the value key when no dataKey", () => {
    inChart(<Legend payload={[{ value: "z", color: "#000" }]} />, { value: { label: "Val" } });
    expect(screen.getByText("Val")).toBeInTheDocument();
  });
});
