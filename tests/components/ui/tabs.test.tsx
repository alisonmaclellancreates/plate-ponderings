import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("Tabs", () => {
  it("swaps panels when another tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList className="list-x">
          <TabsTrigger value="a" className="trig-x">Stories</TabsTrigger>
          <TabsTrigger value="b">Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="a" className="content-x">Story panel</TabsContent>
        <TabsContent value="b">Summary panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toHaveClass("list-x");
    expect(screen.getByRole("tab", { name: "Stories" })).toHaveClass("trig-x");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Story panel");
    expect(screen.getByRole("tabpanel")).toHaveClass("content-x");
    await user.click(screen.getByRole("tab", { name: "Summary" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Summary panel");
  });
});
